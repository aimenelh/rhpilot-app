import { prisma } from "@/lib/prisma";
import { readPayslipDocument } from "@/lib/payroll/payslip-storage";
import { archivePartLabel, buildZip, planArchiveParts } from "./archive";
import { listVaultDocuments, logVaultEvent, requestFingerprint, type VaultActorKind } from "./vault";

/** Parties de l'archive d'un salarié (pour afficher les liens de téléchargement). */
export async function employeeArchiveParts(organizationId: string, employeeId: string) {
  const documents = await listVaultDocuments(organizationId, employeeId, { includeReplaced: true });
  return planArchiveParts(documents).map((part) => ({ index: part.index, label: archivePartLabel(part), count: part.ids.length }));
}

/** Construit une partie de l'archive ZIP et journalise le téléchargement de chaque document. */
export async function employeeArchiveResponse(input: {
  organizationId: string;
  employeeId: string;
  employeeName: string;
  part: number;
  actorKind: VaultActorKind;
  actorUserId: string;
  request: Request;
}): Promise<Response> {
  const documents = await listVaultDocuments(input.organizationId, input.employeeId, { includeReplaced: true });
  const parts = planArchiveParts(documents);
  const target = parts[input.part - 1];
  if (!target) return new Response("Aucun document à télécharger", { status: 404 });

  const rows = await prisma.$queryRaw<Array<{ id: string; storageKey: string }>>`
    SELECT "id", "storageKey" FROM "employee_documents"
    WHERE "organizationId" = ${input.organizationId} AND "employeeId" = ${input.employeeId} AND "id" = ANY(${target.ids}::text[])`;
  const keyById = new Map(rows.map((row) => [row.id, row.storageKey]));
  let zip: Buffer;
  try {
    zip = buildZip(documents.filter((document) => keyById.has(document.id)).map((document) => ({ document, pdf: readPayslipDocument(keyById.get(document.id)!) })));
  } catch {
    return new Response("Un document est illisible : prévenez l'employeur.", { status: 500 });
  }

  const fingerprint = requestFingerprint(input.request);
  for (const id of target.ids) {
    await logVaultEvent(prisma, { organizationId: input.organizationId, documentId: id, employeeId: input.employeeId, action: "DOWNLOADED", actorKind: input.actorKind, actorUserId: input.actorUserId, metadata: { ...fingerprint, archive: true, part: target.index } }).catch(() => undefined);
  }

  const slug = input.employeeName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "salarie";
  const fileName = `documents-${slug}-${archivePartLabel(target).replace(/\s+/g, "-")}.zip`;
  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(zip.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
