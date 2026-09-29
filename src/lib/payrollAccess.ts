import { cache } from "react";
import { getCurrentMemberships } from "@/lib/auth";

/**
 * Accès au module Paie, en accès anticipé.
 *
 * Tant que la paie n'est pas ouverte à tous, seules les organisations listées
 * dans PAYROLL_PREVIEW_ORGANIZATIONS (identifiants ou SIRET, séparés par des
 * virgules) y ont accès, et seulement leurs propriétaires et administrateurs.
 * PAYROLL_ENABLED_FOR_ALL=true ouvre la paie à toutes les organisations.
 *
 * Toute page, action ou route de paie passe par getPayrollMembership() : un
 * simple membre, ou une organisation hors liste, n'obtient jamais de données de paie.
 */

type OrganizationRef = { id: string; siret?: string | null };
type MembershipLike = { accessRole: string; organizationId: string; organization: OrganizationRef };

function allowList(): string[] {
  return (process.env.PAYROLL_PREVIEW_ORGANIZATIONS ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\s/g, ""))
    .filter(Boolean);
}

export function isPayrollEnabledFor(organization: OrganizationRef): boolean {
  if (process.env.PAYROLL_ENABLED_FOR_ALL === "true") return true;
  const list = allowList();
  const siret = organization.siret?.replace(/\s/g, "");
  return list.includes(organization.id) || Boolean(siret && list.includes(siret));
}

export function canUsePayroll(membership: MembershipLike | null | undefined): boolean {
  if (!membership) return false;
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") return false;
  return isPayrollEnabledFor(membership.organization);
}

/** L'appartenance courante si elle peut utiliser la paie, sinon null. */
export const getPayrollMembership = cache(async function getPayrollMembership() {
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0] ?? null;
  return canUsePayroll(membership) ? membership : null;
});

/** Même forme que getCurrentMemberships, limitée à une appartenance autorisée pour la paie. */
export async function getPayrollMemberships() {
  const { user, memberships } = await getCurrentMemberships();
  const membership = memberships[0] ?? null;
  return { user, memberships: canUsePayroll(membership) && membership ? [membership] : [] };
}
