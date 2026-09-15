import { getPayrollElementDefinition, type PayrollElementKind } from "./payroll-element-catalog";

export type PayrollVariableGrossEffect = "ADD_TO_GROSS" | "SUBTRACT_FROM_GROSS" | "EXCLUDE_FROM_GROSS";
export type PayrollVariableNetEffect = "NONE" | "ADD_TO_NET" | "SUBTRACT_FROM_NET";

export type PayrollVariableTreatmentRule = {
  code: string;
  ruleVersionId: string;
  grossEffect: PayrollVariableGrossEffect;
  /**
   * Effet de trésorerie appliqué après le calcul social et avant le PAS.
   * Il permet de distinguer un remboursement, une retenue sur net ou la
   * restitution en net d'un avantage en nature déjà intégré au brut.
   */
  netEffect?: PayrollVariableNetEffect;
  supportedUnits: readonly Array<"EUR">;
  kind?: PayrollElementKind;
};

export type PayrollVariableTreatmentResult = {
  code: string;
  ruleVersionId: string;
  grossDelta: number;
  netAdjustment: number;
  kind: PayrollElementKind;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function inferKind(
  grossEffect: PayrollVariableGrossEffect,
  netEffect: PayrollVariableNetEffect,
  allowedKinds: readonly PayrollElementKind[] | undefined,
): PayrollElementKind {
  const preferred: PayrollElementKind =
    grossEffect === "ADD_TO_GROSS"
      ? netEffect === "SUBTRACT_FROM_NET"
        ? "NON_CASH"
        : "ADD_TO_GROSS"
      : grossEffect === "SUBTRACT_FROM_GROSS"
        ? "DEDUCT_FROM_GROSS"
        : netEffect === "ADD_TO_NET"
          ? "REIMBURSEMENT"
          : netEffect === "SUBTRACT_FROM_NET"
            ? "DEDUCT_FROM_NET"
            : "INFORMATIONAL";

  if (!allowedKinds || allowedKinds.includes(preferred)) return preferred;
  throw new Error(`Les effets ${grossEffect}/${netEffect} ne sont pas compatibles avec la nature de l'élément de paie.`);
}

function assertTreatmentCombination(input: {
  code: string;
  kind: PayrollElementKind;
  grossEffect: PayrollVariableGrossEffect;
  netEffect: PayrollVariableNetEffect;
}): void {
  const { code, kind, grossEffect, netEffect } = input;

  if (kind === "ADD_TO_GROSS" && (grossEffect !== "ADD_TO_GROSS" || netEffect !== "NONE")) {
    throw new Error(`Le traitement ${code} de type ADD_TO_GROSS possède des effets incohérents.`);
  }
  if (kind === "DEDUCT_FROM_GROSS" && (grossEffect !== "SUBTRACT_FROM_GROSS" || netEffect !== "NONE")) {
    throw new Error(`Le traitement ${code} de type DEDUCT_FROM_GROSS possède des effets incohérents.`);
  }
  if (kind === "DEDUCT_FROM_NET" && (grossEffect !== "EXCLUDE_FROM_GROSS" || netEffect !== "SUBTRACT_FROM_NET")) {
    throw new Error(`Le traitement ${code} de type DEDUCT_FROM_NET possède des effets incohérents.`);
  }
  if (kind === "REIMBURSEMENT" && (grossEffect !== "EXCLUDE_FROM_GROSS" || netEffect !== "ADD_TO_NET")) {
    throw new Error(`Le traitement ${code} de type REIMBURSEMENT possède des effets incohérents.`);
  }
  if (kind === "INFORMATIONAL" && (grossEffect !== "EXCLUDE_FROM_GROSS" || netEffect !== "NONE")) {
    throw new Error(`Le traitement ${code} de type INFORMATIONAL possède des effets incohérents.`);
  }
  if (
    kind === "NON_CASH" &&
    !(
      (grossEffect === "ADD_TO_GROSS" && netEffect === "SUBTRACT_FROM_NET") ||
      (grossEffect === "EXCLUDE_FROM_GROSS" && netEffect === "NONE")
    )
  ) {
    throw new Error(`Le traitement ${code} de type NON_CASH possède des effets incohérents.`);
  }
}

/**
 * Résout les effets d'une variable uniquement à partir d'une règle versionnée.
 *
 * Aucune catégorie métier n'invente ici un taux ou un montant. La valeur en
 * euros doit déjà avoir été déterminée (par saisie, import ou calcul métier),
 * puis la règle indique explicitement si elle entre dans le brut et/ou modifie
 * le net à payer.
 */
export function resolvePayrollVariableTreatment(input: {
  code: string;
  amount: number;
  unit: string;
  rule: PayrollVariableTreatmentRule;
}): PayrollVariableTreatmentResult {
  if (!input.code.trim()) throw new Error("Le code de variable est obligatoire.");
  if (!Number.isFinite(input.amount)) throw new Error(`La valeur de la variable ${input.code} est invalide.`);
  if (input.amount < 0) throw new Error(`La valeur de la variable ${input.code} ne peut pas être négative.`);
  if (!input.rule.ruleVersionId.trim()) throw new Error(`La variable ${input.code} ne possède pas de version de règle.`);
  if (input.rule.code !== input.code) throw new Error(`La règle fournie ne correspond pas à la variable ${input.code}.`);
  if (!input.rule.supportedUnits.includes(input.unit as "EUR")) {
    throw new Error(`L'unité ${input.unit} n'est pas prise en charge par la règle ${input.code}.`);
  }

  const definition = getPayrollElementDefinition(input.code);
  const netEffect = input.rule.netEffect ?? "NONE";
  const kind = input.rule.kind ?? inferKind(input.rule.grossEffect, netEffect, definition?.allowedKinds);

  if (definition && !definition.allowedKinds.includes(kind)) {
    throw new Error(`Le type de traitement ${kind} n'est pas autorisé pour l'élément ${input.code}.`);
  }
  assertTreatmentCombination({ code: input.code, kind, grossEffect: input.rule.grossEffect, netEffect });

  const grossDelta =
    input.rule.grossEffect === "ADD_TO_GROSS"
      ? input.amount
      : input.rule.grossEffect === "SUBTRACT_FROM_GROSS"
        ? -input.amount
        : 0;

  const netAdjustment =
    netEffect === "ADD_TO_NET"
      ? input.amount
      : netEffect === "SUBTRACT_FROM_NET"
        ? -input.amount
        : 0;

  return {
    code: input.code,
    ruleVersionId: input.rule.ruleVersionId,
    grossDelta: roundMoney(grossDelta),
    netAdjustment: roundMoney(netAdjustment),
    kind,
  };
}

export function composeGrossAmount(input: {
  baseSalaryAmount: number;
  variableTreatments: Array<Pick<PayrollVariableTreatmentResult, "grossDelta">>;
}): number {
  if (!Number.isFinite(input.baseSalaryAmount) || input.baseSalaryAmount < 0) {
    throw new Error("Le salaire de base doit être un montant positif ou nul.");
  }

  const gross = input.variableTreatments.reduce(
    (total, treatment) => total + treatment.grossDelta,
    input.baseSalaryAmount,
  );

  if (gross < 0) throw new Error("Le brut résultant ne peut pas être négatif.");
  return roundMoney(gross);
}

export function composeNetBeforeTaxAmount(input: {
  socialNetBeforeTax: number;
  variableTreatments: Array<Pick<PayrollVariableTreatmentResult, "netAdjustment">>;
}): number {
  if (!Number.isFinite(input.socialNetBeforeTax) || input.socialNetBeforeTax < 0) {
    throw new Error("Le net avant impôt issu du moteur social est invalide.");
  }
  const result = input.variableTreatments.reduce(
    (total, treatment) => total + treatment.netAdjustment,
    input.socialNetBeforeTax,
  );
  if (result < -0.01) {
    throw new Error("Les retenues nettes dépassent le net avant impôt disponible.");
  }
  return Math.max(0, roundMoney(result));
}
