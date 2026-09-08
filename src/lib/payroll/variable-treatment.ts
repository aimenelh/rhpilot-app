import { getPayrollElementDefinition, type PayrollElementKind } from "./payroll-element-catalog";

export type PayrollVariableGrossEffect = "ADD_TO_GROSS" | "SUBTRACT_FROM_GROSS" | "EXCLUDE_FROM_GROSS";

export type PayrollVariableTreatmentRule = {
  code: string;
  ruleVersionId: string;
  grossEffect: PayrollVariableGrossEffect;
  supportedUnits: Array<"EUR">;
  kind?: PayrollElementKind;
};

export type PayrollVariableTreatmentResult = {
  code: string;
  ruleVersionId: string;
  grossDelta: number;
  kind: PayrollElementKind;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Détermine l'impact d'une variable sur le brut uniquement à partir
 * d'une règle explicitement versionnée.
 *
 * Le catalogue métier distingue désormais les éléments de brut, retenues,
 * remboursements et éléments non monétaires. Tant que le ledger final de
 * bulletin n'existe pas, seuls les éléments réellement applicables au brut
 * peuvent traverser cette fonction ; les autres doivent être bloqués au lieu
 * d'être implicitement transformés en salaire.
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

  if (input.amount < 0) {
    throw new Error(`La valeur de la variable ${input.code} ne peut pas être négative.`);
  }

  if (!input.rule.ruleVersionId.trim()) {
    throw new Error(`La variable ${input.code} ne possède pas de version de règle.`);
  }

  if (input.rule.code !== input.code) {
    throw new Error(`La règle fournie ne correspond pas à la variable ${input.code}.`);
  }

  const definition = getPayrollElementDefinition(input.code);
  const kind = input.rule.kind ?? definition?.allowedKinds[0] ?? "ADD_TO_GROSS";

  if (definition && !definition.allowedKinds.includes(kind)) {
    throw new Error(`Le type de traitement ${kind} n'est pas autorisé pour l'élément ${input.code}.`);
  }

  if (kind !== "ADD_TO_GROSS" && kind !== "DEDUCT_FROM_GROSS") {
    throw new Error(`L'élément ${input.code} (${kind}) ne peut pas encore être intégré au brut : son traitement de bulletin doit être modélisé séparément.`);
  }

  if (!input.rule.supportedUnits.includes(input.unit as "EUR")) {
    throw new Error(`L'unité ${input.unit} n'est pas prise en charge par la règle ${input.code}.`);
  }

  const grossDelta =
    kind === "ADD_TO_GROSS"
      ? input.amount
      : input.rule.grossEffect === "SUBTRACT_FROM_GROSS"
        ? -input.amount
        : input.rule.grossEffect === "ADD_TO_GROSS"
          ? input.amount
          : 0;

  return {
    code: input.code,
    ruleVersionId: input.rule.ruleVersionId,
    grossDelta: roundMoney(grossDelta),
    kind,
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
