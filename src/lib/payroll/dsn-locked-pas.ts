import { buildDsnPasData, type DsnPasData } from "./pas-dsn";
import type { WithholdingTaxProfile } from "./withholding-tax-profile";

/** Aucun recalcul fiscal : reprend exclusivement le résultat du bulletin verrouillé. */
export function dsnPasFromLockedBulletin(input: {
  withholding: unknown;
  profile: WithholdingTaxProfile;
  payrollDepartment: string;
  contractType: string;
  netTaxableAmount: number;
  withholdingAmount: number;
}): { fiscalNet: number; pas: DsnPasData } {
  if (!input.withholding || typeof input.withholding !== "object" || Array.isArray(input.withholding)) {
    throw new Error("DSN bloquée : le résultat PAS du bulletin verrouillé manque. Recalculez la période avant validation.");
  }
  const record = input.withholding as Record<string, unknown>;
  const numeric = (key: string): number => {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`DSN bloquée : ${key} du PAS verrouillé est absent ou invalide.`);
    return value;
  };
  const base = numeric("base");
  const rate = numeric("rate");
  const amount = numeric("amount");
  if (Math.abs(rate - input.profile.rate) > 0.0000001 || Math.abs(amount - input.withholdingAmount) > 0.005) {
    throw new Error("DSN bloquée : les montants ou le taux PAS du bulletin et de la paie verrouillée divergent.");
  }
  const hasFiscalData = record.fiscalNetBeforeExemption !== undefined;
  if (!hasFiscalData && input.contractType === "APPRENTISSAGE") throw new Error("DSN bloquée : la rémunération fiscale avant exonération annuelle de l'apprenti manque dans ce bulletin historique.");
  const fiscalNet = hasFiscalData ? numeric("fiscalNetBeforeExemption") : input.netTaxableAmount;
  const nonTaxable = hasFiscalData ? numeric("nonTaxableApprenticeIncome") : undefined;
  if (nonTaxable && input.contractType !== "APPRENTISSAGE") throw new Error("DSN bloquée : une exonération d'apprenti figure sur un autre type de contrat.");
  if (hasFiscalData) {
    const ijss = numeric("taxableSubrogatedIjss");
    const allowance = numeric("shortContractAllowance");
    const expectedBase = Math.round(Math.max(0, fiscalNet - (nonTaxable ?? 0) + ijss - allowance) * 100) / 100;
    if (Math.abs(base - expectedBase) > 0.005) throw new Error("DSN bloquée : la décomposition fiscale du bulletin ne correspond pas à son assiette PAS.");
  } else if (Math.abs(base - input.netTaxableAmount) > 0.005) {
    throw new Error("DSN bloquée : l'assiette fiscale différente du net imposable n'est pas détaillée dans ce bulletin historique.");
  }
  const pas = buildDsnPasData({ profile: input.profile, payrollDepartment: input.payrollDepartment, netTaxableAmount: fiscalNet, amountSubjectToPas: base, withholdingAmount: amount, ...(input.contractType === "APPRENTISSAGE" ? { nonTaxableApprenticeIncome: nonTaxable } : {}) });
  return { fiscalNet, pas };
}
