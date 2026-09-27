/**
 * Session de l'espace salarié.
 *
 * Un compte salarié relie un utilisateur (identité Clerk) à une fiche salarié.
 * Ce n'est pas un Membership : il ne donne aucun accès au tableau de bord RH.
 * L'accès reste ouvert après la fin du contrat, après la résiliation de
 * l'abonnement de l'employeur et même si son organisation est supprimée :
 * l'ancien salarié retrouve ses bulletins et ses documents de sortie (C. trav.
 * art. D3243-8). Seul un retrait explicite par l'employeur le ferme.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const ESPACE_ACCOUNT_COOKIE = "rhpilot_espace";
/** Posé quand un salarié choisit de créer son propre espace RH : le tableau de bord ne le renvoie plus vers /espace. */
export const NEW_ORGANIZATION_COOKIE = "rhpilot_nouvelle_organisation";

export type EmployeeAccount = {
  accountId: string;
  organizationId: string;
  organizationName: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string | null;
  hireDate: Date;
  contractEndDate: Date | null;
  paperPayslipSince: Date | null;
  paperPayslipSource: "EMPLOYEE" | "EMPLOYER" | null;
  email: string;
  activatedAt: Date;
  /** Fiche archivée par l'employeur : l'espace reste consultable, sans nouvelle demande. */
  employeeArchivedAt: Date | null;
};

export const getEmployeeAccountsForUser = cache(async function getEmployeeAccountsForUser(userId: string): Promise<EmployeeAccount[]> {
  return prisma.$queryRaw<EmployeeAccount[]>`
    SELECT a."id" AS "accountId", a."organizationId", o."name" AS "organizationName", a."employeeId",
           e."firstName", e."lastName", e."position", e."hireDate", e."contractEndDate",
           e."paperPayslipSince", e."paperPayslipSource", u."email" AS "email", a."activatedAt", e."deletedAt" AS "employeeArchivedAt"
    FROM "employee_accounts" a
    JOIN "organizations" o ON o."id" = a."organizationId"
    JOIN "employees" e ON e."id" = a."employeeId" AND e."organizationId" = a."organizationId"
    JOIN "users" u ON u."id" = a."userId"
    WHERE a."userId" = ${userId} AND a."activatedAt" IS NOT NULL AND a."revokedAt" IS NULL
    ORDER BY a."activatedAt" DESC
  `;
});

/** L'utilisateur connecté a-t-il un espace salarié actif ? (redirection depuis le tableau de bord) */
export async function hasEmployeeSpace(userId: string): Promise<boolean> {
  try {
    return (await getEmployeeAccountsForUser(userId)).length > 0;
  } catch {
    // Table absente tant que la migration n'est pas passée : pas d'espace salarié.
    return false;
  }
}

export type EmployeeSession = {
  user: { id: string; email: string };
  account: EmployeeAccount;
  accounts: EmployeeAccount[];
};

export type EmployeeSessionState =
  | { state: "signed-out" }
  | { state: "initializing" }
  | { state: "no-space"; email: string }
  | ({ state: "ready" } & EmployeeSession);

export const getEmployeeSessionState = cache(async function getEmployeeSessionState(): Promise<EmployeeSessionState> {
  const { userId } = auth();
  if (!userId) return { state: "signed-out" };
  const user = await getCurrentUser();
  if (!user || user.deletedAt) return { state: "initializing" };
  const accounts = await getEmployeeAccountsForUser(user.id);
  if (accounts.length === 0) return { state: "no-space", email: user.email };
  const chosen = cookies().get(ESPACE_ACCOUNT_COOKIE)?.value;
  const account = accounts.find((candidate) => candidate.accountId === chosen) ?? accounts[0];
  return { state: "ready", user: { id: user.id, email: user.email }, account, accounts };
});

/** Pour les pages et actions de l'espace : la session, ou un renvoi vers la connexion. */
export async function requireEmployeeSession(): Promise<EmployeeSession> {
  const session = await getEmployeeSessionState();
  if (session.state !== "ready") redirect("/espace/connexion");
  return session;
}

/** Pour les actions serveur : jamais de redirection, une erreur lisible. */
export async function employeeSessionOrError(): Promise<EmployeeSession | { error: string }> {
  const session = await getEmployeeSessionState();
  if (session.state !== "ready") return { error: "Votre session a expiré : reconnectez-vous." };
  return session;
}
