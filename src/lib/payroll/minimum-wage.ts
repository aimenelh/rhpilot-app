export interface SmicRuleParameters {
  territory: "METROPOLE_ET_OUTRE_MER_HORS_MAYOTTE" | "MAYOTTE";
  hourlyGrossCents: number;
  monthlyGrossCentsAt35Hours: number;
  monthlyHoursAt35Hours: number;
}

export interface SmicMinimumResult {
  hourlyGrossCents: number;
  monthlyGrossCentsAt35Hours: number;
  monthlyHoursAt35Hours: number;
  ruleCode: string;
  ruleVersionId: string;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} doit être un entier strictement positif.`);
  }
}

export function resolveSmicMinimum(input: {
  ruleCode: string;
  ruleVersionId: string;
  parameters: unknown;
}): SmicMinimumResult {
  if (!input.ruleCode.trim() || !input.ruleVersionId.trim()) {
    throw new Error("Le code et l'identifiant de version de la règle SMIC sont obligatoires.");
  }

  if (!input.parameters || typeof input.parameters !== "object") {
    throw new Error("Les paramètres de la règle SMIC sont invalides.");
  }

  const parameters = input.parameters as Partial<SmicRuleParameters>;

  if (
    parameters.territory !== "METROPOLE_ET_OUTRE_MER_HORS_MAYOTTE" &&
    parameters.territory !== "MAYOTTE"
  ) {
    throw new Error("Le territoire de la règle SMIC est invalide.");
  }

  assertPositiveInteger(parameters.hourlyGrossCents ?? 0, "Le SMIC horaire");
  assertPositiveInteger(
    parameters.monthlyGrossCentsAt35Hours ?? 0,
    "Le SMIC mensuel");
  if (
    typeof parameters.monthlyHoursAt35Hours !== "number" ||
    !Number.isFinite(parameters.monthlyHoursAt35Hours) ||
    parameters.monthlyHoursAt35Hours <= 0
  ) {
    throw new Error("La durée mensuelle de référence du SMIC est invalide.");
  }

  return {
    hourlyGrossCents: parameters.hourlyGrossCents!,
    monthlyGrossCentsAt35Hours: parameters.monthlyGrossCentsAt35Hours!,
    monthlyHoursAt35Hours: parameters.monthlyHoursAt35Hours,
    ruleCode: input.ruleCode,
    ruleVersionId: input.ruleVersionId,
  };
}
