/**
 * Lectures côté RH : état de l'espace de chaque salarié et suivi des documents.
 * Tolère l'absence des tables tant que la migration n'est pas passée.
 */
import { prisma } from "@/lib/prisma";
import { DOCUMENT_KIND_LABELS, isVaultDocumentKind } from "./labels";

export type AccountStatus = "NONE" | "INVITED" | "EXPIRED" | "ACTIVE" | "REVOKED";

export type SpaceStatus = {
  employeeId: string;
  status: AccountStatus;
  email: string | null;
  invitedAt: Date | null;
  activatedAt: Date | null;
  personalEmail: string | null;
  paperSince: Date | null;
  paperSource: "EMPLOYEE" | "EMPLOYER" | null;
  noticeAt: string | null;
  noticeMethod: string | null;
  /** A déjà un bulletin publié dans son espace (l'information préalable ne porte que sur la première émission). */
  hasElectronicPayslip: boolean;
};

export async function loadSpaceStatuses(organizationId: string, employeeIds: readonly string[]): Promise<Map<string, SpaceStatus>> {
  if (employeeIds.length === 0) return new Map();
  try {
    const rows = await prisma.$queryRaw<Array<{
      employeeId: string; personalEmail: string | null; paperPayslipSince: Date | null; paperPayslipSource: "EMPLOYEE" | "EMPLOYER" | null;
      email: string | null; invitedAt: Date | null; inviteExpiresAt: Date | null; activatedAt: Date | null; revokedAt: Date | null;
      noticeAt: string | null; noticeMethod: string | null; hasElectronicPayslip: boolean;
    }>>`
      SELECT e."id" AS "employeeId", e."personalEmail", e."paperPayslipSince", e."paperPayslipSource",
             a."email", a."invitedAt", a."inviteExpiresAt", a."activatedAt", a."revokedAt",
             to_char(e."electronicPayslipNoticeAt", 'YYYY-MM-DD') AS "noticeAt", e."electronicPayslipNoticeMethod" AS "noticeMethod",
             EXISTS (SELECT 1 FROM "employee_documents" d WHERE d."organizationId" = e."organizationId" AND d."employeeId" = e."id" AND d."kind" = 'PAYSLIP') AS "hasElectronicPayslip"
      FROM "employees" e
      LEFT JOIN "employee_accounts" a ON a."employeeId" = e."id" AND a."organizationId" = e."organizationId"
      WHERE e."organizationId" = ${organizationId} AND e."id" = ANY(${[...employeeIds]}::text[])
    `;
    const now = new Date();
    return new Map(rows.map((row) => {
      const status: AccountStatus = !row.email ? "NONE"
        : row.revokedAt ? "REVOKED"
        : row.activatedAt ? "ACTIVE"
        : row.inviteExpiresAt && row.inviteExpiresAt > now ? "INVITED" : "EXPIRED";
      return [row.employeeId, {
        employeeId: row.employeeId, status, email: row.email, invitedAt: row.invitedAt, activatedAt: row.activatedAt,
        personalEmail: row.personalEmail, paperSince: row.paperPayslipSince, paperSource: row.paperPayslipSource,
        noticeAt: row.noticeAt, noticeMethod: row.noticeMethod, hasElectronicPayslip: row.hasElectronicPayslip === true,
      }];
    }));
  } catch {
    return new Map();
  }
}

export type AdminDocument = {
  id: string;
  employeeId: string;
  kind: string;
  kindLabel: string;
  title: string;
  publishedAt: Date;
  replaced: boolean;
  employeeOpenedAt: Date | null;
  notified: "NOTIFIED" | "FAILED" | null;
};

export async function loadAdminDocuments(organizationId: string, employeeIds: readonly string[], options: { kinds?: readonly string[] } = {}): Promise<AdminDocument[]> {
  if (employeeIds.length === 0) return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; employeeId: string; kind: string; title: string; publishedAt: Date; replacedAt: Date | null; openedAt: Date | null; notifiedAt: Date | null; failedAt: Date | null }>>`
      SELECT d."id", d."employeeId", d."kind", d."title", d."publishedAt", d."replacedAt",
             (SELECT MAX(ev."createdAt") FROM "employee_document_events" ev WHERE ev."documentId" = d."id" AND ev."action" = 'DOWNLOADED' AND ev."actorKind" = 'EMPLOYEE') AS "openedAt",
             (SELECT MAX(ev."createdAt") FROM "employee_document_events" ev WHERE ev."documentId" = d."id" AND ev."action" = 'NOTIFIED') AS "notifiedAt",
             (SELECT MAX(ev."createdAt") FROM "employee_document_events" ev WHERE ev."documentId" = d."id" AND ev."action" = 'NOTIFICATION_FAILED') AS "failedAt"
      FROM "employee_documents" d
      WHERE d."organizationId" = ${organizationId} AND d."employeeId" = ANY(${[...employeeIds]}::text[])
      ORDER BY d."publishedAt" DESC
      LIMIT 500
    `;
    return rows
      .filter((row) => !options.kinds || options.kinds.includes(row.kind))
      .map((row) => ({
        id: row.id,
        employeeId: row.employeeId,
        kind: row.kind,
        kindLabel: isVaultDocumentKind(row.kind) ? DOCUMENT_KIND_LABELS[row.kind] : row.kind,
        title: row.title,
        publishedAt: row.publishedAt,
        replaced: row.replacedAt !== null,
        employeeOpenedAt: row.openedAt,
        notified: row.notifiedAt && (!row.failedAt || row.notifiedAt > row.failedAt) ? "NOTIFIED" : row.failedAt ? "FAILED" : null,
      }));
  } catch {
    return [];
  }
}
