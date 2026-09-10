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

export function calculateEmployeeWithholdingTax(netBeforeTax: number, profile: WithholdingTaxProfile, employeeId: string): number {
  assertWithholdingTaxProfile(profile, employeeId);
  if (!Number.isFinite(netBeforeTax) || netBeforeTax < 0) {
    throw new Error(`Le net avant prélèvement est invalide pour le salarié ${employeeId}.`);
  }
  return Math.round((netBeforeTax * profile.rate + Number.EPSILON) * 100) / 100;
}
