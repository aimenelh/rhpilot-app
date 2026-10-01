import type { WithholdingTaxProfile } from "./withholding-tax-profile";

export type DsnPasRateType = "01" | "13" | "23" | "33";

export type DsnPasData = {
  rateType: DsnPasRateType;
  ratePercent: number;
  rateIdentifier: string | null;
  amountSubjectToPas: number;
  withholdingAmount: number;
  nonTaxableApprenticeIncome?: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertDgfipRateIdentifier(value: string | null): string {
  const normalized = value?.trim() ?? "";
  if (!/^(?:-1|0|[1-9][0-9]{0,17})$/.test(normalized)) {
    throw new Error(
      "DSN bloquée : l'identifiant du taux PAS transmis par la DGFiP est obligatoire et doit être un identifiant numérique valide.",
    );
  }
  return normalized;
}

/**
 * Résout le type de taux NEODeS P26V01 à partir d'une provenance déjà connue.
 * RH Pilot ne fabrique jamais un taux : le taux lui-même reste issu du CRM DGFiP
 * ou d'un barème non personnalisé préalablement déterminé.
 */
export function resolveDsnPasRateType(
  profile: WithholdingTaxProfile,
  payrollDepartment: string,
): { rateType: DsnPasRateType; rateIdentifier: string | null } {
  if (profile.source === "DGFIP") {
    return {
      rateType: "01",
      rateIdentifier: assertDgfipRateIdentifier(profile.sourceReference),
    };
  }

  if (profile.source !== "NON_PERSONNALISE") {
    throw new Error(`DSN bloquée : provenance du taux PAS non prise en charge (${profile.source}).`);
  }

  const department = payrollDepartment.trim().toUpperCase();
  if (!department) {
    throw new Error("DSN bloquée : le département de l'établissement est nécessaire pour qualifier le barème PAS.");
  }

  if (["971", "972", "974"].includes(department)) {
    return { rateType: "23", rateIdentifier: null };
  }
  if (["973", "976"].includes(department)) {
    return { rateType: "33", rateIdentifier: null };
  }
  return { rateType: "13", rateIdentifier: null };
}

/**
 * Construit les données PAS du bloc Versement individu S21.G00.50.
 * L'assiette effectivement calculée est distincte de la RNF : exonération
 * annuelle des apprentis, abattement CDD court, IJSS subrogées (CT P26 .50.013).
 * L'abattement CDD court ne doit jamais être déclaré en .50.012, réservé aux
 * assistants maternels/familiaux.
 */
export function buildDsnPasData(input: {
  profile: WithholdingTaxProfile;
  payrollDepartment: string;
  netTaxableAmount: number;
  withholdingAmount: number;
  amountSubjectToPas?: number;
  nonTaxableApprenticeIncome?: number;
}): DsnPasData {
  if (!Number.isFinite(input.netTaxableAmount) || input.netTaxableAmount < 0) {
    throw new Error("DSN bloquée : la rémunération nette fiscale est absente ou invalide.");
  }
  if (!Number.isFinite(input.withholdingAmount) || input.withholdingAmount < 0) {
    throw new Error("DSN bloquée : le montant de prélèvement à la source est absent ou invalide.");
  }
  if (!Number.isFinite(input.profile.rate) || input.profile.rate < 0 || input.profile.rate > 1) {
    throw new Error("DSN bloquée : le taux de prélèvement à la source est invalide.");
  }

  const { rateType, rateIdentifier } = resolveDsnPasRateType(
    input.profile,
    input.payrollDepartment,
  );
  const declaredBase = input.amountSubjectToPas ?? input.netTaxableAmount;
  if (!Number.isFinite(declaredBase) || declaredBase < 0) throw new Error("DSN bloquée : l'assiette PAS verrouillée est invalide.");
  const exempt = input.nonTaxableApprenticeIncome;
  if (exempt !== undefined && (!Number.isFinite(exempt) || exempt < 0 || exempt > input.netTaxableAmount + 0.01)) throw new Error("DSN bloquée : la part non imposable de l'apprenti est invalide.");
  const amountSubjectToPas = roundMoney(declaredBase);
  const withholdingAmount = roundMoney(input.withholdingAmount);
  const expected = roundMoney(amountSubjectToPas * input.profile.rate);

  if (Math.abs(expected - withholdingAmount) > 0.01) {
    throw new Error(
      `DSN bloquée : le PAS enregistré (${withholdingAmount.toFixed(2)} €) ne correspond pas à l'assiette et au taux applicables (${expected.toFixed(2)} €).`,
    );
  }

  return {
    rateType,
    ratePercent: Math.round((input.profile.rate * 100 + Number.EPSILON) * 100) / 100,
    rateIdentifier,
    amountSubjectToPas,
    withholdingAmount,
    ...(exempt === undefined ? {} : { nonTaxableApprenticeIncome: roundMoney(exempt) }),
  };
}

export function assertPasDsnScopeSupported(input: {
  source: string;
  contractType: string;
  hireDate: Date;
  contractEndDate: Date | null;
  hasSubrogatedDailyAllowances?: boolean;
}): void {
  if (
    input.source === "NON_PERSONNALISE" &&
    input.contractType === "CDD" &&
    input.contractEndDate instanceof Date
  ) {
    const durationMs = input.contractEndDate.getTime() - input.hireDate.getTime();
    const sixtyTwoDaysMs = 62 * 24 * 60 * 60 * 1000;
    if (durationMs >= 0 && durationMs <= sixtyTwoDaysMs) {
      throw new Error(
        "DSN bloquée : le PAS d'un CDD court sans taux personnalisé nécessite le traitement spécifique de l'abattement d'assiette, non encore modélisé.",
      );
    }
  }
}
