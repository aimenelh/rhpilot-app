export type CollectiveMinimumSalaryParameters = {
  ruleType: "MINIMUM_GROSS_MONTHLY";
  classificationCode: string;
  monthlyMinimumCents: number;
  professionalCategory?: string;
  contractTypes?: string[];
  sourceReference?: string;
};

export type CollectiveMinimumSalaryResult =
  | {
      status: "APPLICABLE";
      classificationCode: string;
      monthlyMinimumCents: number;
      differenceCents: number;
      compliant: boolean;
    }
  | {
      status: "UNRESOLVED";
      code:
        | "INVALID_PARAMETERS"
        | "CLASSIFICATION_MISMATCH"
        | "CONTRACT_NOT_ELIGIBLE"
        | "NO_COLLECTIVE_AGREEMENT"
        | "NO_VALIDATED_VERSION"
        | "NO_VALIDATED_RULE";
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCollectiveMinimumSalaryParameters(
  parameters: unknown,
): CollectiveMinimumSalaryParameters | null {
  if (!isRecord(parameters)) return null;
  if (parameters.ruleType !== "MINIMUM_GROSS_MONTHLY") return null;

  const classificationCode =
    typeof parameters.classificationCode === "string"
      ? parameters.classificationCode.trim()
      : "";
  const monthlyMinimumCents =
    typeof parameters.monthlyMinimumCents === "number"
      ? parameters.monthlyMinimumCents
      : null;
  const professionalCategory =
    typeof parameters.professionalCategory === "string"
      ? parameters.professionalCategory.trim()
      : undefined;
  const contractTypes = Array.isArray(parameters.contractTypes)
    ? parameters.contractTypes.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : undefined;
  const sourceReference =
    typeof parameters.sourceReference === "string"
      ? parameters.sourceReference.trim()
      : undefined;

  if (!classificationCode || monthlyMinimumCents === null) return null;
  if (!Number.isInteger(monthlyMinimumCents) || monthlyMinimumCents <= 0) return null;
  if (contractTypes !== undefined && contractTypes.length === 0) return null;

  return {
    ruleType: "MINIMUM_GROSS_MONTHLY",
    classificationCode,
    monthlyMinimumCents,
    ...(professionalCategory ? { professionalCategory } : {}),
    ...(contractTypes ? { contractTypes } : {}),
    ...(sourceReference ? { sourceReference } : {}),
  };
}

export function evaluateCollectiveMinimumSalary(input: {
  monthlyGrossCents: number;
  classificationCode: string | null;
  professionalCategory?: string | null;
  contractType?: string | null;
  parameters: unknown;
}): CollectiveMinimumSalaryResult {
  const parameters = parseCollectiveMinimumSalaryParameters(input.parameters);
  if (!parameters) {
    return {
      status: "UNRESOLVED",
      code: "INVALID_PARAMETERS",
      message: "Les paramètres du minimum conventionnel sont invalides.",
    };
  }

  if (!input.classificationCode || input.classificationCode !== parameters.classificationCode) {
    return {
      status: "UNRESOLVED",
      code: "CLASSIFICATION_MISMATCH",
      message: `La règle conventionnelle vise la classification ${parameters.classificationCode}, mais aucune correspondance exacte n'a été fournie.`,
    };
  }

  if (parameters.professionalCategory && input.professionalCategory !== parameters.professionalCategory) {
    return {
      status: "UNRESOLVED",
      code: "CLASSIFICATION_MISMATCH",
      message: "La catégorie professionnelle ne correspond pas à la règle conventionnelle.",
    };
  }

  if (
    parameters.contractTypes &&
    (!input.contractType || !parameters.contractTypes.includes(input.contractType))
  ) {
    return {
      status: "UNRESOLVED",
      code: "CONTRACT_NOT_ELIGIBLE",
      message: "Le type de contrat du salarié n'est pas couvert par cette règle conventionnelle.",
    };
  }

  if (!Number.isInteger(input.monthlyGrossCents) || input.monthlyGrossCents < 0) {
    return {
      status: "UNRESOLVED",
      code: "INVALID_PARAMETERS",
      message: "Le salaire brut mensuel fourni est invalide.",
    };
  }

  const differenceCents = input.monthlyGrossCents - parameters.monthlyMinimumCents;
  return {
    status: "APPLICABLE",
    classificationCode: parameters.classificationCode,
    monthlyMinimumCents: parameters.monthlyMinimumCents,
    differenceCents,
    compliant: differenceCents >= 0,
  };
}
