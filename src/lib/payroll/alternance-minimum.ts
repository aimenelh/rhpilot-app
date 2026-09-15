import type { ContractType } from "@prisma/client";

export type ApprenticeshipMinimumInput = {
  age: number;
  contractYear: 1 | 2 | 3 | 4;
  smicMonthlyCents: number;
  /** Salaire minimum conventionnel correspondant à l'emploi occupé. */
  collectiveMinimumCents?: number | null;
  /**
   * Un apprentissage avant 16 ans est possible dans des situations encadrées.
   * RH Pilot exige donc une confirmation explicite au lieu de l'inférer.
   */
  under16EligibilityConfirmed?: boolean;
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

type ApprenticeshipYear = 1 | 2 | 3 | 4;
type ApprenticeshipAgeBand = "UNDER_18" | "18_20" | "21_25" | "26_PLUS";

// Grille 2026 : Service-Public / notice officielle du contrat d'apprentissage.
// La 4e année reprend les pourcentages de la 3e année lorsqu'elle est autorisée.
const APPRENTICESHIP_RATES: Record<ApprenticeshipYear, Record<ApprenticeshipAgeBand, number>> = {
  1: { UNDER_18: 0.27, "18_20": 0.43, "21_25": 0.53, "26_PLUS": 1 },
  2: { UNDER_18: 0.39, "18_20": 0.51, "21_25": 0.61, "26_PLUS": 1 },
  3: { UNDER_18: 0.55, "18_20": 0.67, "21_25": 0.78, "26_PLUS": 1 },
  4: { UNDER_18: 0.55, "18_20": 0.67, "21_25": 0.78, "26_PLUS": 1 },
};

function apprenticeshipAgeBand(age: number): ApprenticeshipAgeBand | null {
  if (age < 18) return "UNDER_18";
  if (age <= 20) return "18_20";
  if (age <= 25) return "21_25";
  if (age >= 26) return "26_PLUS";
  return null;
}

function validMonthlyAmount(value: number | null | undefined): value is number | null | undefined {
  return value == null || (Number.isFinite(value) && value >= 0);
}

export function resolveApprenticeshipMinimum(input: ApprenticeshipMinimumInput): AlternanceMinimumResult {
  if (!Number.isInteger(input.age) || input.age < 15 || input.age > 100) {
    return { status: "UNRESOLVED", code: "INVALID_AGE", source: "APPRENTISSAGE_LEGAL", explanation: "L'âge de l'apprenti est nécessaire pour déterminer le minimum légal." };
  }
  if (input.age < 16 && input.under16EligibilityConfirmed !== true) {
    return { status: "UNRESOLVED", code: "UNDER_16_ELIGIBILITY_REQUIRED", source: "APPRENTISSAGE_LEGAL", explanation: "Un apprentissage avant 16 ans nécessite une condition d'éligibilité spécifique. RH Pilot exige sa confirmation explicite avant de calculer la rémunération minimale." };
  }
  if (!Number.isFinite(input.smicMonthlyCents) || input.smicMonthlyCents <= 0) {
    return { status: "UNRESOLVED", code: "INVALID_SMIC", source: "APPRENTISSAGE_LEGAL", explanation: "Le montant du SMIC mensuel validé est nécessaire pour déterminer le minimum légal." };
  }
  if (!validMonthlyAmount(input.collectiveMinimumCents)) {
    return { status: "UNRESOLVED", code: "INVALID_COLLECTIVE_MINIMUM", source: "APPRENTISSAGE_LEGAL", explanation: "Le minimum conventionnel fourni est invalide." };
  }
  if (![1, 2, 3, 4].includes(input.contractYear)) {
    return { status: "UNRESOLVED", code: "INVALID_CONTRACT_YEAR", source: "APPRENTISSAGE_LEGAL", explanation: "L'année d'exécution du contrat d'apprentissage doit être comprise entre 1 et 4 pour la grille prise en charge." };
  }

  const band = apprenticeshipAgeBand(input.age);
  if (!band) return { status: "UNRESOLVED", code: "INVALID_AGE_BAND", source: "APPRENTISSAGE_LEGAL", explanation: "La tranche d'âge de l'apprenti n'a pas pu être déterminée." };

  const percentage = APPRENTICESHIP_RATES[input.contractYear][band];
  const smicBasedMinimum = Math.round(input.smicMonthlyCents * percentage);

  // À 21-25 ans la grille compare le même pourcentage du SMIC au même
  // pourcentage du salaire minimum conventionnel correspondant à l'emploi.
  // À partir de 26 ans on compare 100 % du SMIC et 100 % du minimum
  // conventionnel. En dessous de 21 ans la grille légale est fondée sur le SMIC ;
  // une disposition conventionnelle plus favorable doit être portée par une
  // règle alternance dédiée et non déduite silencieusement ici.
  let minimum = smicBasedMinimum;
  if (input.collectiveMinimumCents != null && band === "21_25") {
    minimum = Math.max(smicBasedMinimum, Math.round(input.collectiveMinimumCents * percentage));
  } else if (input.collectiveMinimumCents != null && band === "26_PLUS") {
    minimum = Math.max(smicBasedMinimum, input.collectiveMinimumCents);
  }

  return {
    status: "APPLICABLE",
    monthlyMinimumCents: minimum,
    percentageOfSmic: percentage,
    source: "APPRENTISSAGE_LEGAL",
    explanation:
      minimum > smicBasedMinimum
        ? "Le minimum conventionnel correspondant à l'emploi, comparé selon la grille d'apprentissage, est plus favorable."
        : "Le minimum légal d'apprentissage fondé sur le SMIC s'applique.",
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
    return {
      status: "APPLICABLE",
      monthlyMinimumCents: legalMinimum,
      percentageOfSmic: 1,
      source: "PROFESSIONNALISATION_LEGAL",
      explanation: branchMinimum > 0
        ? "Pour un salarié de 26 ans ou plus, le minimum est le plus favorable entre le SMIC et 85 % du minimum conventionnel de branche."
        : "Pour un salarié de 26 ans ou plus, le minimum est le SMIC en l'absence de minimum conventionnel exploitable.",
    };
  }

  const legalMinimum = Math.round(input.smicMonthlyCents * percentage);
  // Pour les moins de 26 ans, une rémunération conventionnelle supérieure doit
  // provenir d'une règle conventionnelle dédiée. Le minimum mensuel générique
  // de classification n'est pas appliqué automatiquement car il peut viser un
  // salarié de droit commun et non un contrat de professionnalisation.
  return {
    status: "APPLICABLE",
    monthlyMinimumCents: legalMinimum,
    percentageOfSmic: percentage,
    source: "PROFESSIONNALISATION_LEGAL",
    explanation: "Le minimum légal de professionnalisation fondé sur l'âge et le niveau de qualification s'applique ; toute règle conventionnelle plus favorable doit être résolue séparément.",
  };
}

export function isAlternanceContract(contractType: ContractType): boolean {
  return contractType === "APPRENTISSAGE" || contractType === "PROFESSIONNALISATION";
}
