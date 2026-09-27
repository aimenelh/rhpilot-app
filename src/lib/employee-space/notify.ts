import { prisma } from "@/lib/prisma";
import { sendEmail, sendEmailBatch } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { documentAvailableEmail } from "./emails";
import { logVaultEvent } from "./vault";

export type NotifyResult = "NOTIFIED" | "NO_ACCOUNT" | "FAILED";

export type DocumentNotice = { documentId: string; label: string; corrected: boolean };

type Recipient = { employeeId: string; email: string; firstName: string };

/** Salariés dont l'espace est activé, par identifiant, avec l'adresse de connexion (celle qu'ils tiennent à jour). */
export async function activeRecipients(organizationId: string, employeeIds: readonly string[]): Promise<Map<string, Recipient>> {
  if (employeeIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Recipient[]>`
    SELECT a."employeeId", u."email", e."firstName" FROM "employee_accounts" a
    JOIN "employees" e ON e."id" = a."employeeId"
    JOIN "users" u ON u."id" = a."userId"
    WHERE a."organizationId" = ${organizationId} AND a."employeeId" = ANY(${[...employeeIds]}::text[])
      AND a."activatedAt" IS NOT NULL AND a."revokedAt" IS NULL AND u."deletedAt" IS NULL
  `;
  return new Map(rows.map((row) => [row.employeeId, row]));
}

function message(recipient: Recipient, organizationName: string, documents: readonly DocumentNotice[]) {
  const single = documents.length === 1 ? documents[0] : null;
  return documentAvailableEmail({
    firstName: recipient.firstName,
    organizationName,
    documentLabel: single ? single.label : `${documents.length} nouveaux documents`,
    corrected: single ? single.corrected : false,
    spaceUrl: `${getAppUrl()}/espace`,
  });
}

async function record(organizationId: string, employeeId: string, to: string, documents: readonly DocumentNotice[], result: { ok: true } | { ok: false; error: string }, actorUserId: string | null) {
  for (const document of documents) {
    await logVaultEvent(prisma, {
      organizationId,
      documentId: document.documentId,
      employeeId,
      action: result.ok ? "NOTIFIED" : "NOTIFICATION_FAILED",
      actorKind: "SYSTEM",
      actorUserId,
      metadata: result.ok ? { to } : { to, error: result.error.slice(0, 300) },
    }).catch(() => undefined);
  }
}

/**
 * Prévient le salarié qu'un ou plusieurs documents l'attendent, sans pièce
 * jointe. Sans espace activé, rien n'est envoyé : les documents l'attendront.
 */
export async function notifyEmployeeOfDocuments(input: {
  organizationId: string;
  organizationName: string;
  employeeId: string;
  documents: readonly DocumentNotice[];
  actorUserId: string | null;
}): Promise<NotifyResult> {
  if (input.documents.length === 0) return "NO_ACCOUNT";
  const recipient = (await activeRecipients(input.organizationId, [input.employeeId])).get(input.employeeId);
  if (!recipient) return "NO_ACCOUNT";
  const email = message(recipient, input.organizationName, input.documents);
  const result = await sendEmail({ to: recipient.email, subject: email.subject, html: email.html });
  await record(input.organizationId, input.employeeId, recipient.email, input.documents, result, input.actorUserId);
  return result.ok ? "NOTIFIED" : "FAILED";
}

/** Même chose pour toute une paie, en un envoi groupé. */
export async function notifyEmployeesInBatch(input: {
  organizationId: string;
  organizationName: string;
  notices: ReadonlyMap<string, readonly DocumentNotice[]>;
  actorUserId: string | null;
}): Promise<Map<string, NotifyResult>> {
  const outcome = new Map<string, NotifyResult>();
  const recipients = await activeRecipients(input.organizationId, [...input.notices.keys()]);
  const queue: Array<{ recipient: Recipient; documents: readonly DocumentNotice[] }> = [];
  for (const [employeeId, documents] of input.notices) {
    const recipient = recipients.get(employeeId);
    if (!recipient || documents.length === 0) { outcome.set(employeeId, "NO_ACCOUNT"); continue; }
    queue.push({ recipient, documents });
  }
  const results = await sendEmailBatch(queue.map(({ recipient, documents }) => ({ to: recipient.email, ...message(recipient, input.organizationName, documents) })));
  for (const [index, { recipient, documents }] of queue.entries()) {
    const result = results[index] ?? { ok: false as const, error: "Envoi non effectué." };
    await record(input.organizationId, recipient.employeeId, recipient.email, documents, result, input.actorUserId);
    outcome.set(recipient.employeeId, result.ok ? "NOTIFIED" : "FAILED");
  }
  return outcome;
}
