"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { employeeInvitationEmail } from "@/lib/employee-space/emails";
import { INVITE_VALID_DAYS, newInviteToken, normalizeEmail } from "@/lib/employee-space/tokens";
import { publishVaultDocument } from "@/lib/employee-space/vault";
import { notifyEmployeeOfDocuments } from "@/lib/employee-space/notify";
import { loadExitContext } from "@/lib/employee-space/exit-context";
import { buildFinalSettlementItems, renderFinalSettlementPdf, renderWorkCertificatePdf } from "@/lib/employee-space/exit-documents";
import { DOCUMENT_KIND_LABELS, isVaultDocumentKind, safeFileName, type VaultDocumentKind } from "@/lib/employee-space/labels";
import { isNoticeMethod, noticeMethodLabel } from "@/lib/employee-space/notice-rules";
import { parseIsoDateOnly } from "@/lib/dateOnly";

export type EmployeeSpaceActionState = { error?: string; success?: string; manualUrl?: string } | undefined;

// Même plafond que les autres dépôts (limite des actions serveur dans next.config).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function adminContext() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Session expirée, veuillez recharger la page.");
  if (!isOrganizationAdmin(membership)) throw new Error("Seuls les administrateurs gèrent l'espace salarié.");
  return { organizationId: membership.organizationId, organizationName: membership.organization.name, userId: user.id };
}

async function findEmployee(organizationId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: { id: employeeId, organizationId },
    select: { id: true, firstName: true, lastName: true, deletedAt: true, isDemoData: true },
  });
}

function refresh(employeeId: string) {
  revalidatePath(`/dashboard/employees/${employeeId}`);
  revalidatePath("/dashboard/payroll", "layout");
}

async function audit(organizationId: string, userId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action, entityType: "Employee", entityId, metadata: metadata as object } });
}

const failure = (error: unknown): EmployeeSpaceActionState => ({ error: error instanceof Error ? error.message : "L'opération a échoué." });

/** Adresse personnelle et choix du bulletin papier, depuis la fiche salarié. */
export async function saveEmployeeSpaceSettings(employeeId: string, _state: EmployeeSpaceActionState, formData: FormData): Promise<EmployeeSpaceActionState> {
  try {
    const { organizationId, userId } = await adminContext();
    const employee = await findEmployee(organizationId, employeeId);
    if (!employee || employee.deletedAt) return { error: "Salarié introuvable." };
    const rawEmail = String(formData.get("personalEmail") ?? "").trim();
    const personalEmail = rawEmail ? normalizeEmail(rawEmail) : null;
    if (rawEmail && !personalEmail) return { error: "Adresse e-mail invalide." };
    const paper = formData.get("paperPayslip") === "on";
    // Valeur affichée au chargement du formulaire : on ne touche au choix du
    // papier que si l'administrateur l'a réellement modifié (formulaire périmé).
    const shownPaper = formData.get("paperPayslipShown") === "1";

    const current = await prisma.$queryRaw<Array<{ paperPayslipSince: Date | null; paperPayslipSource: string | null }>>`SELECT "paperPayslipSince", "paperPayslipSource" FROM "employees" WHERE "id" = ${employee.id}`;
    const wasPaper = Boolean(current[0]?.paperPayslipSince);
    const wantsChange = paper !== shownPaper && paper !== wasPaper;
    if (wantsChange && !paper && current[0]?.paperPayslipSource === "EMPLOYEE") {
      return { error: "Le salarié a lui-même refusé le bulletin électronique : lui seul peut revenir à l'électronique, depuis son espace." };
    }
    if (wantsChange && paper) {
      await prisma.$executeRaw`UPDATE "employees" SET "personalEmail" = ${personalEmail}, "paperPayslipSince" = ${new Date()}, "paperPayslipSource" = 'EMPLOYER' WHERE "id" = ${employee.id} AND "organizationId" = ${organizationId}`;
    } else if (wantsChange && !paper) {
      await prisma.$executeRaw`UPDATE "employees" SET "personalEmail" = ${personalEmail}, "paperPayslipSince" = NULL, "paperPayslipSource" = NULL WHERE "id" = ${employee.id} AND "organizationId" = ${organizationId}`;
    } else {
      await prisma.$executeRaw`UPDATE "employees" SET "personalEmail" = ${personalEmail} WHERE "id" = ${employee.id} AND "organizationId" = ${organizationId}`;
    }
    await audit(organizationId, userId, "employee_space.settings.updated", employee.id, { personalEmail: Boolean(personalEmail), paperPayslip: wantsChange ? paper : wasPaper, paperChanged: wantsChange });
    refresh(employee.id);
    return { success: "Enregistré." };
  } catch (error) {
    return failure(error);
  }
}

/** Envoie (ou renvoie) l'invitation à l'espace salarié sur l'adresse personnelle. */
export async function inviteToEmployeeSpace(employeeId: string): Promise<EmployeeSpaceActionState> {
  try {
    const { organizationId, organizationName, userId } = await adminContext();
    const employee = await findEmployee(organizationId, employeeId);
    if (!employee || employee.deletedAt) return { error: "Salarié introuvable." };
    if (employee.isDemoData) return { error: "Un salarié de démonstration ne peut pas être invité." };
    const rows = await prisma.$queryRaw<Array<{ personalEmail: string | null }>>`SELECT "personalEmail" FROM "employees" WHERE "id" = ${employee.id}`;
    const email = normalizeEmail(rows[0]?.personalEmail ?? "");
    if (!email) return { error: "Renseignez d'abord l'adresse e-mail personnelle du salarié." };

    const existing = await prisma.$queryRaw<Array<{ id: string; activatedAt: Date | null; revokedAt: Date | null; email: string }>>`
      SELECT "id", "activatedAt", "revokedAt", "email" FROM "employee_accounts" WHERE "organizationId" = ${organizationId} AND "employeeId" = ${employee.id}`;
    const account = existing[0];
    if (account?.activatedAt && !account.revokedAt) return { error: "L'espace de ce salarié est déjà activé." };

    const { token, hash } = newInviteToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_VALID_DAYS * 86_400_000);
    if (account) {
      await prisma.$executeRaw`
        UPDATE "employee_accounts" SET "email" = ${email}, "inviteTokenHash" = ${hash}, "inviteExpiresAt" = ${expiresAt}, "invitedAt" = ${now},
          "invitedByUserId" = ${userId}, "userId" = NULL, "activatedAt" = NULL, "revokedAt" = NULL, "updatedAt" = ${now}
        WHERE "id" = ${account.id}`;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "employee_accounts" ("id", "organizationId", "employeeId", "email", "inviteTokenHash", "inviteExpiresAt", "invitedAt", "invitedByUserId", "updatedAt")
        VALUES (${randomUUID()}, ${organizationId}, ${employee.id}, ${email}, ${hash}, ${expiresAt}, ${now}, ${userId}, ${now})`;
    }

    const joinUrl = `${getAppUrl()}/espace/rejoindre/${token}`;
    const message = employeeInvitationEmail({ firstName: employee.firstName, organizationName, joinUrl, validDays: INVITE_VALID_DAYS });
    const sent = await sendEmail({ to: email, subject: message.subject, html: message.html });
    await audit(organizationId, userId, "employee_space.invited", employee.id, { email, emailSent: sent.ok, reinvite: Boolean(account) });
    refresh(employee.id);
    if (!sent.ok) return { error: `Invitation créée, mais l'e-mail n'est pas parti (${sent.error}). Transmettez ce lien au salarié :`, manualUrl: joinUrl };
    return { success: `Invitation envoyée à ${email}.` };
  } catch (error) {
    return failure(error);
  }
}

/** Ferme l'accès à l'espace salarié. Les documents restent conservés. */
export async function revokeEmployeeSpace(employeeId: string): Promise<EmployeeSpaceActionState> {
  try {
    const { organizationId, userId } = await adminContext();
    const employee = await findEmployee(organizationId, employeeId);
    if (!employee) return { error: "Salarié introuvable." };
    const count = await prisma.$executeRaw`
      UPDATE "employee_accounts" SET "revokedAt" = ${new Date()}, "inviteTokenHash" = NULL, "updatedAt" = ${new Date()}
      WHERE "organizationId" = ${organizationId} AND "employeeId" = ${employee.id} AND "revokedAt" IS NULL`;
    if (count === 0) return { error: "Aucun accès à retirer." };
    await audit(organizationId, userId, "employee_space.revoked", employee.id, {});
    refresh(employee.id);
    return { success: "Accès retiré. Les documents restent conservés." };
  } catch (error) {
    return failure(error);
  }
}

const UPLOAD_KINDS: readonly VaultDocumentKind[] = ["FRANCE_TRAVAIL", "WORK_CERTIFICATE", "FINAL_SETTLEMENT", "OTHER"];

/** Dépose un PDF dans l'espace du salarié (attestation France Travail, document signé…). */
export async function uploadEmployeeDocument(_state: EmployeeSpaceActionState, formData: FormData): Promise<EmployeeSpaceActionState> {
  try {
    const { organizationId, organizationName, userId } = await adminContext();
    const employeeId = String(formData.get("employeeId") ?? "");
    const kind = String(formData.get("kind") ?? "");
    const file = formData.get("file");
    const employee = await findEmployee(organizationId, employeeId);
    if (!employee) return { error: "Salarié introuvable." };
    if (employee.isDemoData) return { error: "Pas de documents pour un salarié de démonstration." };
    if (!isVaultDocumentKind(kind) || !UPLOAD_KINDS.includes(kind)) return { error: "Type de document invalide." };
    if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier PDF." };
    if (file.size > MAX_UPLOAD_BYTES) return { error: "Le fichier dépasse 4 Mo." };
    const pdf = Buffer.from(await file.arrayBuffer());
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return { error: "Le fichier doit être un PDF." };
    const customTitle = String(formData.get("title") ?? "").trim().slice(0, 120);
    if (kind === "OTHER" && !customTitle) return { error: "Donnez un titre au document." };
    const title = customTitle || DOCUMENT_KIND_LABELS[kind];

    const outcome = await prisma.$transaction((tx) => publishVaultDocument(tx, {
      organizationId, employeeId: employee.id, kind, title, fileName: safeFileName(file.name || title), pdf, actorUserId: userId, actorKind: "EMPLOYER",
    }));
    if (outcome.status === "UNCHANGED") return { success: "Ce document est déjà dans l'espace du salarié." };
    const notified = await notifyEmployeeOfDocuments({ organizationId, organizationName, employeeId: employee.id, documents: [{ documentId: outcome.documentId, label: title, corrected: outcome.status === "REPLACED" }], actorUserId: userId });
    await audit(organizationId, userId, "employee_space.document.uploaded", employee.id, { kind, documentId: outcome.documentId, status: outcome.status, notified });
    refresh(employee.id);
    return { success: notified === "NOTIFIED" ? "Document publié, le salarié est prévenu par e-mail." : notified === "FAILED" ? "Document publié, mais l'e-mail de notification n'est pas parti." : "Document publié. Le salarié le verra dès l'activation de son espace." };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Produit et publie le certificat de travail ou le reçu pour solde de tout
 * compte à partir de la fiche et du bulletin de sortie clôturé.
 */
export async function generateExitDocument(employeeId: string, kind: "WORK_CERTIFICATE" | "FINAL_SETTLEMENT", _state: EmployeeSpaceActionState, formData: FormData): Promise<EmployeeSpaceActionState> {
  try {
    if (kind !== "WORK_CERTIFICATE" && kind !== "FINAL_SETTLEMENT") return { error: "Type de document invalide." };
    const { organizationId, organizationName, userId } = await adminContext();
    const employee = await findEmployee(organizationId, employeeId);
    if (!employee) return { error: "Salarié introuvable." };
    if (employee.isDemoData) return { error: "Pas de documents pour un salarié de démonstration." };
    const context = await loadExitContext(organizationId, employee.id);
    if ("error" in context) return { error: context.error };
    const issuedAt = new Date().toISOString().slice(0, 10);

    let pdf: Buffer;
    if (kind === "WORK_CERTIFICATE") {
      pdf = await renderWorkCertificatePdf({ employer: context.employer, employee: context.employee, issuedAt, healthCoverage: formData.get("healthCoverage") === "on" });
    } else {
      if (!context.finalBulletin || !context.finalPeriod) return { error: "Le reçu pour solde de tout compte se prépare une fois la paie du mois de sortie validée et clôturée." };
      const settlement = buildFinalSettlementItems(context.finalBulletin);
      pdf = await renderFinalSettlementPdf({ employer: context.employer, employee: context.employee, issuedAt, ...settlement, paymentDate: context.finalPeriod.paymentDate ? context.finalPeriod.paymentDate.toISOString().slice(0, 10) : null });
    }
    const title = DOCUMENT_KIND_LABELS[kind];
    const fileName = safeFileName(`${kind === "WORK_CERTIFICATE" ? "certificat-de-travail" : "solde-de-tout-compte"}-${context.employee.lastName}`);
    const outcome = await prisma.$transaction((tx) => publishVaultDocument(tx, { organizationId, employeeId: employee.id, kind, title, fileName, pdf, actorUserId: userId, actorKind: "EMPLOYER" }));
    if (outcome.status === "UNCHANGED") return { success: "Document déjà à jour dans l'espace du salarié." };
    const notified = await notifyEmployeeOfDocuments({ organizationId, organizationName, employeeId: employee.id, documents: [{ documentId: outcome.documentId, label: title, corrected: outcome.status === "REPLACED" }], actorUserId: userId });
    await audit(organizationId, userId, "employee_space.document.generated", employee.id, { kind, documentId: outcome.documentId, status: outcome.status, notified });
    refresh(employee.id);
    return { success: `${title} ${outcome.status === "REPLACED" ? "mis à jour" : "publié"} dans l'espace du salarié${notified === "NOTIFIED" ? ", qui est prévenu par e-mail" : ""}.` };
  } catch (error) {
    return failure(error);
  }
}

/** Enregistre la remise de la note d'information sur le bulletin électronique (C. trav. art. D3243-7). */
export async function recordElectronicNotice(employeeId: string, _state: EmployeeSpaceActionState, formData: FormData): Promise<EmployeeSpaceActionState> {
  try {
    const { organizationId, userId } = await adminContext();
    const employee = await findEmployee(organizationId, employeeId);
    if (!employee || employee.deletedAt) return { error: "Salarié introuvable." };
    const rawDate = String(formData.get("noticeAt") ?? "");
    const noticeAt = parseIsoDateOnly(rawDate);
    const method = formData.get("noticeMethod");
    if (!noticeAt) return { error: "Indiquez la date de remise." };
    if (rawDate > new Date().toISOString().slice(0, 10)) return { error: "La date de remise ne peut pas être dans le futur." };
    if (noticeAt.getUTCFullYear() < 2017) return { error: "Date de remise invraisemblable." };
    if (!isNoticeMethod(method)) return { error: "Choisissez le mode de remise." };
    await prisma.$executeRaw`UPDATE "employees" SET "electronicPayslipNoticeAt" = ${noticeAt}::date, "electronicPayslipNoticeMethod" = ${method} WHERE "id" = ${employee.id} AND "organizationId" = ${organizationId}`;
    await audit(organizationId, userId, "employee_space.electronic_notice.recorded", employee.id, { noticeAt: rawDate, method });
    refresh(employee.id);
    return { success: `Remise enregistrée : ${noticeMethodLabel(method).toLowerCase()}, le ${noticeAt.toLocaleDateString("fr-FR", { timeZone: "UTC" })}.` };
  } catch (error) {
    return failure(error);
  }
}
