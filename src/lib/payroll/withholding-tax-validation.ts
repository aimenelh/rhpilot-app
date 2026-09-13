import type { WithholdingTaxProfile } from "./withholding-tax-profile";

export function assertWithholdingTaxProfile(profile: WithholdingTaxProfile | null, employeeId: string): WithholdingTaxProfile {
  if (!profile) {
    throw new Error(`Aucun taux de prélèvement à la source valide n'est enregistré pour le salarié ${employeeId}.`);
  }

  if (!Number.isFinite(profile.rate) || profile.rate < 0 || profile.rate > 1) {
    throw new Error(`Le taux de prélèvement à la source enregistré pour le salarié ${employeeId} est invalide.`);
  }

  return profile;
}

/**
 * Calcule le PAS à partir du net imposable, qui constitue l'assiette fiscale,
 * et non du net avant impôt. Le taux est celui du profil DGFiP applicable à
 * la date de la période de paie.
 */
export function calculateEmployeeWithholdingTax(netTaxable: number, profile: WithholdingTaxProfile, employeeId: string): number {
  assertWithholdingTaxProfile(profile, employeeId);
  if (!Number.isFinite(netTaxable) || netTaxable < 0) {
    throw new Error(`Le net imposable est invalide pour le salarié ${employeeId}.`);
  }
  return Math.round((netTaxable * profile.rate + Number.EPSILON) * 100) / 100;
}
