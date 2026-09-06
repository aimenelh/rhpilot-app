export type PayrollVariableGrossEffect = "ADD_TO_GROSS" | "SUBTRACT_FROM_GROSS" | "EXCLUDE_FROM_GROSS";

export type PayrollVariableTreatmentRule = {
  code: string;
  ruleVersionId: string;
  grossEffect: PayrollVariableGrossEffect;
  supportedUnits: Array<"EUR">;
};

export type PayrollVariableTreatmentResult = {
  code: string;
  ruleVersionId: string;
  grossDelta: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Détermine l'impact d'une variable sur le brut uniquement à partir
 * d'une règle explicitement versionnée.
 *
 * Aucune variable n'est interprétée par son libellé ou son code seul.
 * Les conversions heures/jours/pourcentage restent volontairement
 * indisponibles tant qu'une base de calcul versionnée ne les définit pas.
 */
export function resolvePayrollVariableTreatment(input: {
  code: string;
  amount: number;
  unit: string;
  rule: PayrollVariableTreatmentRule;
}): PayrollVariableTreatmentResult {
  if (!input.code.trim()) {
    throw new Error("Le code de variable est obligatoire.");
  }

  if (!Number.isFinite(input.amount)) {
    throw new Error(`La valeur de la variable ${input.code} est invalide.`);
  }

  if (!input.rule.ruleVersionId.trim()) {
    throw new Error(`La variable ${input.code} ne possède pas de version de règle.`);
  }

  if (input.rule.code !== input.code) {
    throw new Error(`La règle fournie ne correspond pas à la variable ${input.code}.`);
  }

  if (!input.rule.supportedUnits.includes(input.unit as "EUR")) {
    throw new Error(`L'unité ${input.unit} n'est pas prise en charge par la règle ${input.code}.`);
  }

  const grossDelta =
    input.rule.grossEffect === "ADD_TO_GROSS"
      ? input.amount
      : input.rule.grossEffect === "SUBTRACT_FROM_GROSS"
        ? -input.amount
        : 0;

  return {
    code: input.code,
    ruleVersionId: input.rule.ruleVersionId,
    grossDelta: roundMoney(grossDelta),
  };
}

export function composeGrossAmount(input: {
  baseSalaryAmount: number;
  variableTreatments: PayrollVariableTreatmentResult[];
}): number {
  if (!Number.isFinite(input.baseSalaryAmount) || input.baseSalaryAmount < 0) {
    throw new Error("Le salaire de base doit être un montant positif ou nul.");
  }

  const gross = input.variableTreatments.reduce(
    (total, treatment) => total + treatment.grossDelta,
    input.baseSalaryAmount,
  );

  if (gross < 0) {
    throw new Error("Le brut résultant ne peut pas être négatif.");
  }

  return roundMoney(gross);
}
