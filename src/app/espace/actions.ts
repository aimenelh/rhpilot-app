"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { storeAbsenceJustification } from "@/lib/absence-justification-storage";
import { absenceRequestEmail } from "@/lib/employee-space/emails";
import { activateEmployeeAccount, findInvitationByToken, findPendingInvitationsForEmail, invitationProblem } from "@/lib/employee-space/invitations";
import { ESPACE_ACCOUNT_COOKIE, NEW_ORGANIZATION_COOKIE, employeeSessionOrError, getEmployeeAccountsForUser } from "@/lib/employee-space/session";
import { EMPLOYEE_REQUEST_TYPES, REQUESTS_CLOSED_MESSAGES, canEmployeeCancelAbsence, formatDateRange, isEmployeeRequestType, requestsClosedReason } from "@/lib/employee-space/labels";

export type EspaceActionState = { error?: string; success?: string } | undefined;

function rememberAccount(accountId: string) {
  cookies().set(ESPACE_ACCOUNT_COOKIE, accountId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

async function auditEmployee(organizationId: string, userId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action, entityType, entityId, metadata: metadata as object } });
}

/** Active l'espace depuis le lien d'invitation. */
export async function acceptEmployeeInvitation(token: string): Promise<EspaceActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connectez-vous d'abord." };
  const invitation = await findInvitationByToken(token);
  const problem = invitationProblem(invitation, user.email);
  if (problem || !invitation) return { error: "Cette invitation n'est plus valable. Demandez-en une nouvelle à votre employeur." };
  const activated = await activateEmployeeAccount(invitation.accountId, user.id, user.email);
  if (!activated) return { error: "Cette invitation n'est plus valable. Demandez-en une nouvelle à votre employeur." };
  await auditEmployee(invitation.organizationId, user.id, "employee_space.activated", "Employee", invitation.employeeId, { accountId: invitation.accountId, via: "link" });
  rememberAccount(invitation.accountId);
  redirect("/espace?bienvenue=1");
}

/** Repli : active une invitation adressée à l'e-mail vérifié du compte connecté. */
export async function acceptPendingInvitation(accountId: string): Promise<EspaceActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connectez-vous d'abord." };
  const pending = await findPendingInvitationsForEmail(user.email);
  const invitation = pending.find((candidate) => candidate.accountId === accountId);
  if (!invitation) return { error: "Cette invitation n'est plus valable." };
  const activated = await activateEmployeeAccount(invitation.accountId, user.id, user.email);
  if (!activated) return { error: "Cette invitation n'est plus valable." };
  await auditEmployee(invitation.organizationId, user.id, "employee_space.activated", "Employee", invitation.employeeId, { accountId: invitation.accountId, via: "email" });
  rememberAccount(invitation.accountId);
  redirect("/espace?bienvenue=1");
}

/** Passe d'un espace à l'autre (salarié de plusieurs entreprises clientes). */
export async function switchEmployeeAccount(accountId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/espace/connexion");
  const accounts = await getEmployeeAccountsForUser(user.id);
  if (accounts.some((account) => account.accountId === accountId)) rememberAccount(accountId);
  redirect("/espace");
}

const MAX_REQUEST_DAYS = 366;

/** Demande de congé ou déclaration d'arrêt depuis l'espace salarié. */
export async function requestAbsence(_state: EspaceActionState, formData: FormData): Promise<EspaceActionState> {
  const session = await employeeSessionOrError();
  if ("error" in session) return session;
  const { account, user } = session;
  const closed = requestsClosedReason(account);
  if (closed) return { error: REQUESTS_CLOSED_MESSAGES[closed] };

  const type = String(formData.get("type") ?? "");
  if (!isEmployeeRequestType(type)) return { error: "Choisissez le type d'absence." };
  const definition = EMPLOYEE_REQUEST_TYPES.find((entry) => entry.value === type)!;
  const startDate = parseIsoDateOnly(String(formData.get("startDate") ?? ""));
  const endDate = parseIsoDateOnly(String(formData.get("endDate") ?? "")) ?? startDate;
  if (!startDate || !endDate) return { error: "Indiquez les dates." };
  if (endDate < startDate) return { error: "La date de fin doit suivre la date de début." };
  if ((endDate.getTime() - startDate.getTime()) / 86_400_000 > MAX_REQUEST_DAYS) return { error: "Une demande ne peut pas dépasser un an." };
  if (startDate < account.hireDate) return { error: "La demande commence avant votre date d'entrée." };
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (definition.justification === "required" && !hasFile) return { error: "Joignez l'avis d'arrêt de travail (photo ou PDF)." };

  let stored: ReturnType<typeof storeAbsenceJustification> | null = null;
  if (hasFile) {
    try {
      stored = storeAbsenceJustification(Buffer.from(await (file as File).arrayBuffer()), (file as File).type);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Le justificatif n'a pas pu être lu." };
    }
  }

  const overlap = await prisma.absence.findFirst({
    where: { organizationId: account.organizationId, employeeId: account.employeeId, status: { not: "REJECTED" }, startDate: { lte: endDate }, endDate: { gte: startDate } },
    select: { id: true },
  });
  if (overlap) return { error: "Une absence est déjà enregistrée sur tout ou partie de ces dates." };

  const absenceId = randomUUID();
  const status = stored ? "TO_REVIEW_JUSTIFICATION" : "TO_VALIDATE";
  await prisma.$transaction(async (tx) => {
    await tx.absence.create({
      data: {
        id: absenceId,
        organizationId: account.organizationId,
        employeeId: account.employeeId,
        type,
        startDate,
        endDate,
        status,
        justificationRequired: Boolean(stored),
        payrollImpactStatus: "PENDING",
        notes: [`Demande faite par le salarié depuis son espace.`, notes].filter(Boolean).join("\n"),
      },
    });
    if (stored && file instanceof File) {
      await tx.absenceJustification.create({
        data: { id: randomUUID(), absenceId, status: "RECEIVED", storageKey: stored.storageKey, fileName: file.name.slice(0, 255) || "justificatif", mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, uploadedByUserId: user.id },
      });
    }
    await tx.auditLog.create({ data: { id: randomUUID(), organizationId: account.organizationId, actorUserId: user.id, action: "absence.requested_by_employee", entityType: "Absence", entityId: absenceId, metadata: { employeeId: account.employeeId, type, withJustification: Boolean(stored) } } });
  });

  // Les administrateurs sont prévenus ; un échec d'envoi ne bloque pas la demande.
  const admins = await prisma.membership.findMany({ where: { organizationId: account.organizationId, deletedAt: null, accessRole: { in: ["OWNER", "ADMIN"] }, notificationFrequency: { not: "OFF" }, user: { deletedAt: null } }, select: { user: { select: { email: true } } } });
  const message = absenceRequestEmail({ employeeName: `${account.firstName} ${account.lastName}`.trim(), typeLabel: definition.label, dates: formatDateRange(startDate, endDate), url: `${getAppUrl()}/dashboard/absences`, withJustification: Boolean(stored) });
  await Promise.all(admins.map((admin) => sendEmail({ to: admin.user.email, subject: message.subject, html: message.html }).catch(() => undefined)));

  revalidatePath("/espace/absences");
  revalidatePath("/dashboard/absences");
  return { success: type === "SICK_LEAVE" ? "Arrêt déclaré. Votre employeur a reçu votre avis d'arrêt." : "Demande envoyée. Vous verrez ici la réponse de votre employeur." };
}

/** Annule une demande encore en attente. */
export async function cancelAbsenceRequest(absenceId: string): Promise<EspaceActionState> {
  const session = await employeeSessionOrError();
  if ("error" in session) return session;
  const { account, user } = session;
  if (account.organizationClosedAt) return { error: REQUESTS_CLOSED_MESSAGES["employer-closed"] };
  const absence = await prisma.absence.findFirst({ where: { id: absenceId, organizationId: account.organizationId, employeeId: account.employeeId }, select: { id: true, status: true, payrollImpactStatus: true, type: true } });
  if (!absence) return { error: "Demande introuvable." };
  const requestedByEmployee = await prisma.auditLog.findFirst({ where: { organizationId: account.organizationId, action: "absence.requested_by_employee", entityType: "Absence", entityId: absence.id, actorUserId: user.id, metadata: { path: ["employeeId"], equals: account.employeeId } }, select: { id: true } });
  if (!requestedByEmployee) return { error: "Cette absence a été saisie par votre employeur : contactez-le pour la modifier." };
  if (!canEmployeeCancelAbsence(absence)) return { error: "Cette absence a déjà été traitée : contactez votre employeur pour la modifier." };
  await prisma.$transaction(async (tx) => {
    await tx.absence.delete({ where: { id: absence.id } });
    await tx.auditLog.create({ data: { id: randomUUID(), organizationId: account.organizationId, actorUserId: user.id, action: "absence.cancelled_by_employee", entityType: "Absence", entityId: absence.id, metadata: { employeeId: account.employeeId, type: absence.type } } });
  });
  revalidatePath("/espace/absences");
  revalidatePath("/dashboard/absences");
  return { success: "Demande annulée." };
}

/** Refus du bulletin électronique (C. trav. art. L3243-2), ou retour à l'électronique. */
export async function setPaperPayslipPreference(paper: boolean): Promise<EspaceActionState> {
  const session = await employeeSessionOrError();
  if ("error" in session) return session;
  const { account, user } = session;
  if (account.organizationClosedAt) return { error: REQUESTS_CLOSED_MESSAGES["employer-closed"] };
  if (paper) {
    await prisma.$executeRaw`UPDATE "employees" SET "paperPayslipSince" = ${new Date()}, "paperPayslipSource" = 'EMPLOYEE' WHERE "id" = ${account.employeeId} AND "organizationId" = ${account.organizationId} AND "paperPayslipSince" IS NULL`;
  } else {
    await prisma.$executeRaw`UPDATE "employees" SET "paperPayslipSince" = NULL, "paperPayslipSource" = NULL WHERE "id" = ${account.employeeId} AND "organizationId" = ${account.organizationId}`;
  }
  await auditEmployee(account.organizationId, user.id, paper ? "employee_space.paper_payslip.requested" : "employee_space.paper_payslip.withdrawn", "Employee", account.employeeId, { by: "EMPLOYEE" });
  revalidatePath("/espace", "layout");
  revalidatePath(`/dashboard/employees/${account.employeeId}`);
  return { success: paper ? "C'est noté : vos prochains bulletins vous seront remis sur papier." : "C'est noté : vos prochains bulletins arriveront dans votre espace." };
}

/**
 * Un salarié qui dirige aussi sa propre entreprise : le tableau de bord le
 * renverrait vers son espace salarié ; ce passage l'emmène à la création d'un
 * espace RH (le temps de la créer).
 */
export async function startOwnOrganization(): Promise<void> {
  cookies().set(NEW_ORGANIZATION_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  redirect("/dashboard");
}
