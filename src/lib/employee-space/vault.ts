/**
 * Coffre des documents salariés.
 *
 * Un document publié n'est jamais modifié ni supprimé. Une correction publie
 * un nouveau document et marque l'ancien comme remplacé ; chaque étape
 * (publication, notification, téléchargement, remplacement) laisse une ligne
 * dans un journal qui n'accepte que des ajouts.
 *
 * Les PDF sont stockés comme les bulletins (charge base64 versionnée avec son
 * empreinte SHA-256) : le jour où un stockage objet arrive, seul ce module et
 * payslip-storage changent.
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readPayslipDocument, storePayslipDocument } from "@/lib/payroll/payslip-storage";
import { EXIT_DOCUMENT_KINDS, type VaultDocumentKind } from "./labels";

type Db = PrismaClient | Prisma.TransactionClient;

export type VaultEventAction = "PUBLISHED" | "NOTIFIED" | "NOTIFICATION_FAILED" | "DOWNLOADED" | "REPLACED";
export type VaultActorKind = "EMPLOYER" | "EMPLOYEE" | "SYSTEM";

export type VaultDocumentRow = {
  id: string;
  organizationId: string;
  employeeId: string;
  kind: VaultDocumentKind;
  title: string;
  periodYear: number | null;
  periodMonth: number | null;
  sizeBytes: number;
  fileName: string;
  publishedAt: Date;
  replacedAt: Date | null;
};

export async function logVaultEvent(db: Db, event: {
  organizationId: string;
  documentId: string;
  employeeId: string;
  action: VaultEventAction;
  actorKind: VaultActorKind;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const metadata = event.metadata ? JSON.stringify(event.metadata) : null;
  await db.$executeRaw`
    INSERT INTO "employee_document_events" ("id", "organizationId", "documentId", "employeeId", "action", "actorKind", "actorUserId", "metadata")
    VALUES (${randomUUID()}, ${event.organizationId}, ${event.documentId}, ${event.employeeId}, ${event.action}, ${event.actorKind}, ${event.actorUserId ?? null}, ${metadata}::jsonb)
  `;
}

export type PublishOutcome = { documentId: string; status: "PUBLISHED" | "REPLACED" | "UNCHANGED"; replacedDocumentId?: string };

/**
 * Publie un PDF dans l'espace du salarié. Un bulletin remplace le bulletin en
 * vigueur du même mois, un document de sortie remplace le précédent du même
 * type ; un document identique (même empreinte) n'est pas republié.
 */
export async function publishVaultDocument(db: Db, input: {
  organizationId: string;
  employeeId: string;
  kind: VaultDocumentKind;
  title: string;
  fileName: string;
  pdf: Buffer;
  periodYear?: number | null;
  periodMonth?: number | null;
  sourcePayslipId?: string | null;
  actorUserId: string | null;
  actorKind: VaultActorKind;
}): Promise<PublishOutcome> {
  if (input.kind === "PAYSLIP" && (!input.periodYear || !input.periodMonth)) throw new Error("Un bulletin doit porter son mois.");
  const stored = storePayslipDocument(input.pdf);

  const replaceable = input.kind === "PAYSLIP" || EXIT_DOCUMENT_KINDS.includes(input.kind);
  const current = replaceable
    ? input.kind === "PAYSLIP"
      ? await db.$queryRaw<Array<{ id: string; sha256: string }>>`
          SELECT "id", "sha256" FROM "employee_documents"
          WHERE "organizationId" = ${input.organizationId} AND "employeeId" = ${input.employeeId} AND "kind" = 'PAYSLIP'
            AND "periodYear" = ${input.periodYear} AND "periodMonth" = ${input.periodMonth} AND "replacedAt" IS NULL
          FOR UPDATE`
      : await db.$queryRaw<Array<{ id: string; sha256: string }>>`
          SELECT "id", "sha256" FROM "employee_documents"
          WHERE "organizationId" = ${input.organizationId} AND "employeeId" = ${input.employeeId} AND "kind" = ${input.kind} AND "replacedAt" IS NULL
          ORDER BY "publishedAt" DESC
          FOR UPDATE`
    : [];

  if (current[0]?.sha256 === stored.sha256) return { documentId: current[0].id, status: "UNCHANGED" };

  const documentId = randomUUID();
  const now = new Date();
  // L'ancien document est marqué remplacé avant l'insertion : l'index unique
  // « un bulletin en vigueur par mois » ne tolère pas deux lignes actives.
  for (const previous of current) {
    await db.$executeRaw`UPDATE "employee_documents" SET "replacedAt" = ${now}, "replacedByDocumentId" = ${documentId} WHERE "id" = ${previous.id}`;
  }
  await db.$executeRaw`
    INSERT INTO "employee_documents" ("id", "organizationId", "employeeId", "kind", "title", "periodYear", "periodMonth", "sourcePayslipId", "storageKey", "sha256", "sizeBytes", "fileName", "publishedAt", "publishedByUserId")
    VALUES (${documentId}, ${input.organizationId}, ${input.employeeId}, ${input.kind}, ${input.title.slice(0, 200)}, ${input.periodYear ?? null}, ${input.periodMonth ?? null}, ${input.sourcePayslipId ?? null}, ${stored.storageKey}, ${stored.sha256}, ${stored.sizeBytes}, ${input.fileName.slice(0, 120)}, ${now}, ${input.actorUserId})
  `;
  await logVaultEvent(db, { organizationId: input.organizationId, documentId, employeeId: input.employeeId, action: "PUBLISHED", actorKind: input.actorKind, actorUserId: input.actorUserId, metadata: { sha256: stored.sha256, sizeBytes: stored.sizeBytes, replaces: current.map((row) => row.id) } });
  for (const previous of current) {
    await logVaultEvent(db, { organizationId: input.organizationId, documentId: previous.id, employeeId: input.employeeId, action: "REPLACED", actorKind: input.actorKind, actorUserId: input.actorUserId, metadata: { replacedBy: documentId } });
  }
  return current.length > 0 ? { documentId, status: "REPLACED", replacedDocumentId: current[0].id } : { documentId, status: "PUBLISHED" };
}

export async function listVaultDocuments(organizationId: string, employeeId: string, options: { includeReplaced?: boolean } = {}): Promise<VaultDocumentRow[]> {
  const rows = await prisma.$queryRaw<VaultDocumentRow[]>`
    SELECT "id", "organizationId", "employeeId", "kind", "title", "periodYear", "periodMonth", "sizeBytes", "fileName", "publishedAt", "replacedAt"
    FROM "employee_documents"
    WHERE "organizationId" = ${organizationId} AND "employeeId" = ${employeeId}
    ORDER BY COALESCE("periodYear", 0) DESC, COALESCE("periodMonth", 0) DESC, "publishedAt" DESC
  `;
  return options.includeReplaced ? rows : rows.filter((row) => row.replacedAt === null);
}

/** Dernier téléchargement par le salarié, par document. */
export async function lastEmployeeDownloads(organizationId: string, employeeId: string): Promise<Map<string, Date>> {
  const rows = await prisma.$queryRaw<Array<{ documentId: string; at: Date }>>`
    SELECT "documentId", MAX("createdAt") AS "at" FROM "employee_document_events"
    WHERE "organizationId" = ${organizationId} AND "employeeId" = ${employeeId} AND "action" = 'DOWNLOADED' AND "actorKind" = 'EMPLOYEE'
    GROUP BY "documentId"
  `;
  return new Map(rows.map((row) => [row.documentId, row.at]));
}

export async function readVaultDocument(organizationId: string, documentId: string): Promise<(VaultDocumentRow & { pdf: Buffer }) | null> {
  const rows = await prisma.$queryRaw<Array<VaultDocumentRow & { storageKey: string }>>`
    SELECT "id", "organizationId", "employeeId", "kind", "title", "periodYear", "periodMonth", "sizeBytes", "fileName", "publishedAt", "replacedAt", "storageKey"
    FROM "employee_documents" WHERE "id" = ${documentId} AND "organizationId" = ${organizationId}
  `;
  const row = rows[0];
  if (!row) return null;
  const { storageKey, ...document } = row;
  return { ...document, pdf: readPayslipDocument(storageKey) };
}

/** Informations de requête gardées comme preuve d'un téléchargement. */
export function requestFingerprint(request: Request): Record<string, string> {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "";
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 200);
  return { ...(ip ? { ip } : {}), ...(userAgent ? { userAgent } : {}) };
}
