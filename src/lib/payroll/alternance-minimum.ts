import type { ContractType } from "@prisma/client";

export type ApprenticeshipMinimumInput = {
  age: number;
  contractYear: 1 | 2 | 3;
  smicMonthlyCents: number;
  collectiveMinimumCents?: number | null;
};

export type ProfessionalisationMinimumInput = {
  age: number;
  hasBaccalaureateOrHigher: boolean;
  smicMonthlyCents: number;
  collectiveMinimumCents?: number | null;
};

export type AlternanceMinimumResult = {
  status: "APPLICABLE" | "UNRESOLVED";
  code?: string;
  monthlyMinimumCents?: number;
  percentageOfSmic?: number;
  source: "APPRENTISSAGE_LEGAL" | "PROFESSIONNALISATION_LEGAL";
  explanation: string;
};

const APPRENTICESHIP_RATES: Record<1 | 2 | 3, Record<"UNDER_18" | "18_20" | "21_25" | "26_PLUS", number>> = {
  1: { UNDER_18: 0.27, "18_20": 0.43, "21_25": 0.53, "26_PLUS": 1 },
  2: { UNDER_18: 0.39, "18_20": 0.51, "21_25": 0.61, "26_PLUS": 1 },
  3: { UNDER_18: 0.55, "18_20": 0.67, "21_25": 0.78, "26_PLUS": 1 },
};

function apprenticeshipAgeBand(age: number): keyof (typeof APPRENTICESHIP_RATES)[1] | null {
  if (age < 18) return "UNDER_18";
  if (age <= 20) return "18_20";
  if (age <= 25) return "21_25";
  if (age >= 26) return "26_PLUS";
  return null;
}

function validMonthlyAmount(value: number | null | undefined): value is number {
  return value == null || (Number.isFinite(value) && value >= 0);
}

export function resolveApprenticeshipMinimum(input: ApprenticeshipMinimumInput): AlternanceMinimumResult {
  if (!Number.isInteger(input.age) || input.age < 15 || input.age > 100) {
    return { status: "UNRESOLVED", code: "INVALID_AGE", source: "APPRENTISSAGE_LEGAL", explanation: "L'âge de l'apprenti est nécessaire pour déterminer le minimum légal." };
  }
  if (!Number.isFinite(input.smicMonthlyCents) || input.smicMonthlyCents <= 0) {
    return { status: "UNRESOLVED", code: "INVALID_SMIC", source: "APPRENTISSAGE_LEGAL", explanation: "Le montant du SMIC mensuel validé est nécessaire pour déterminer le minimum légal." };
  }
  if (!validMonthlyAmount(input.collectiveMinimumCents)) {
    return { status: "UNRESOLVED", code: "INVALID_COLLECTIVE_MINIMUM", source: "APPRENTISSAGE_LEGAL", explanation: "Le minimum conventionnel fourni est invalide." };
  }
  if (![1, 2, 3].includes(input.contractYear)) {
    return { status: "UNRESOLVED", code: "INVALID_CONTRACT_YEAR", source: "APPRENTISSAGE_LEGAL", explanation: "L'année d'exécution du contrat d'apprentissage doit être comprise entre 1 et 3 pour cette grille." };
  }
  const band = apprenticeshipAgeBand(input.age);
  if (!band) return { status: "UNRESOLVED", code: "INVALID_AGE_BAND", source: "APPRENTISSAGE_LEGAL", explanation: "La tranche d'âge de l'apprenti n'a pas pu être déterminée." };
  const percentage = APPRENTICESHIP_RATES[input.contractYear][band];
  const legalMinimum = Math.round(input.smicMonthlyCents * percentage);
  const minimum = input.collectiveMinimumCents != null ? Math.max(legalMinimum, input.collectiveMinimumCents) : legalMinimum;
  return {
    status: "APPLICABLE",
    monthlyMinimumCents: minimum,
    percentageOfSmic: percentage,
    source: "APPRENTISSAGE_LEGAL",
    explanation: input.collectiveMinimumCents != null && input.collectiveMinimumCents > legalMinimum
      ? "Le minimum conventionnel plus favorable s'applique à l'apprenti."
      : "Le minimum légal d'apprentissage s'applique.",
  };
}

export function resolveProfessionalisationMinimum(input: ProfessionalisationMinimumInput): AlternanceMinimumResult {
  if (!Number.isInteger(input.age) || input.age < 16 || input.age > 100) {
    return { status: "UNRESOLVED", code: "INVALID_AGE", source: "PROFESSIONNALISATION_LEGAL", explanation: "L'âge du salarié est nécessaire pour déterminer le minimum légal." };
  }
  if (!Number.isFinite(input.smicMonthlyCents) || input.smicMonthlyCents <= 0) {
    return { status: "UNRESOLVED", code: "INVALID_SMIC", source: "PROFESSIONNALISATION_LEGAL", explanation: "Le montant du SMIC mensuel validé est nécessaire pour déterminer le minimum légal." };
  }
  if (!validMonthlyAmount(input.collectiveMinimumCents)) {
    return { status: "UNRESOLVED", code: "INVALID_COLLECTIVE_MINIMUM", source: "PROFESSIONNALISATION_LEGAL", explanation: "Le minimum conventionnel fourni est invalide." };
  }
  let percentage: number;
  if (input.age < 21) percentage = input.hasBaccalaureateOrHigher ? 0.65 : 0.55;
  else if (input.age <= 25) percentage = input.hasBaccalaureateOrHigher ? 0.8 : 0.7;
  else {
    const branchMinimum = input.collectiveMinimumCents ?? 0;
    const legalMinimum = Math.max(input.smicMonthlyCents, Math.round(branchMinimum * 0.85));
    return { status: "APPLICABLE", monthlyMinimumCents: legalMinimum, percentageOfSmic: 1, source: "PROFESSIONNALISATION_LEGAL", explanation: branchMinimum > 0 ? "Pour un salarié de 26 ans ou plus, le minimum est le plus favorable entre le SMIC et 85 % du minimum conventionnel de branche." : "Pour un salarié de 26 ans ou plus, le minimum est le SMIC en l'absence de minimum conventionnel exploitable." };
  }
  const legalMinimum = Math.round(input.smicMonthlyCents * percentage);
  const minimum = input.collectiveMinimumCents != null ? Math.max(legalMinimum, input.collectiveMinimumCents) : legalMinimum;
  return { status: "APPLICABLE", monthlyMinimumCents: minimum, percentageOfSmic: percentage, source: "PROFESSIONNALISATION_LEGAL", explanation: input.collectiveMinimumCents != null && input.collectiveMinimumCents > legalMinimum ? "Le minimum conventionnel plus favorable s'applique." : "Le minimum légal de professionnalisation s'applique." };
}

export function isAlternanceContract(contractType: ContractType): boolean {
  return contractType === "APPRENTISSAGE" || contractType === "PROFESSIONNALISATION";
}
