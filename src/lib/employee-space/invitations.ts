import { prisma } from "@/lib/prisma";
import { hashInviteToken, isPlausibleInviteToken } from "./tokens";

export type PendingInvitation = {
  accountId: string;
  organizationId: string;
  organizationName: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  inviteExpiresAt: Date | null;
  activatedAt: Date | null;
  revokedAt: Date | null;
  userId: string | null;
  employeeArchivedAt: Date | null;
};

const SELECT_INVITATION = `
  SELECT a."id" AS "accountId", a."organizationId", o."name" AS "organizationName", a."employeeId",
         e."firstName", e."lastName", a."email", a."inviteExpiresAt", a."activatedAt", a."revokedAt", a."userId", e."deletedAt" AS "employeeArchivedAt"
  FROM "employee_accounts" a
  JOIN "organizations" o ON o."id" = a."organizationId"
  JOIN "employees" e ON e."id" = a."employeeId"
`;

export async function findInvitationByToken(token: string): Promise<PendingInvitation | null> {
  if (!isPlausibleInviteToken(token)) return null;
  const rows = await prisma.$queryRawUnsafe<PendingInvitation[]>(`${SELECT_INVITATION} WHERE a."inviteTokenHash" = $1 LIMIT 1`, hashInviteToken(token));
  return rows[0] ?? null;
}

/** Invitations en attente adressées à cette adresse (repli si le lien s'est perdu pendant l'inscription). */
export async function findPendingInvitationsForEmail(email: string): Promise<PendingInvitation[]> {
  return prisma.$queryRawUnsafe<PendingInvitation[]>(
    `${SELECT_INVITATION} WHERE lower(a."email") = lower($1) AND a."activatedAt" IS NULL AND a."revokedAt" IS NULL AND a."inviteExpiresAt" > NOW() AND o."deletedAt" IS NULL AND e."deletedAt" IS NULL ORDER BY a."invitedAt" DESC`,
    email,
  );
}

export type InvitationProblem = "not-found" | "revoked" | "expired" | "used" | "wrong-email";

export function invitationProblem(invitation: PendingInvitation | null, userEmail: string | null, now = new Date()): InvitationProblem | null {
  if (!invitation) return "not-found";
  if (invitation.revokedAt || (invitation.employeeArchivedAt && !invitation.activatedAt)) return "revoked";
  if (invitation.activatedAt) return "used";
  if (!invitation.inviteExpiresAt || invitation.inviteExpiresAt < now) return "expired";
  if (userEmail !== null && invitation.email.toLowerCase() !== userEmail.toLowerCase()) return "wrong-email";
  return null;
}

/**
 * Rattache le compte au salarié. La condition sur l'état courant évite qu'une
 * invitation serve deux fois, même en cas de double clic.
 */
export async function activateEmployeeAccount(accountId: string, userId: string, userEmail: string): Promise<boolean> {
  const now = new Date();
  const updated = await prisma.$executeRaw`
    UPDATE "employee_accounts"
    SET "userId" = ${userId}, "activatedAt" = ${now}, "inviteTokenHash" = NULL, "updatedAt" = ${now}
    WHERE "id" = ${accountId} AND "activatedAt" IS NULL AND "revokedAt" IS NULL
      AND "inviteExpiresAt" > ${now} AND lower("email") = lower(${userEmail})
  `;
  return updated === 1;
}
