import { describe, expect, it } from "vitest";
import {
  composeGrossAmount,
  composeNetBeforeTaxAmount,
  resolvePayrollVariableTreatment,
} from "./variable-treatment";

const addRule = {
  code: "ACTIVITY_BONUS",
  ruleVersionId: "rule-prime-2026",
  grossEffect: "ADD_TO_GROSS" as const,
  netEffect: "NONE" as const,
  supportedUnits: ["EUR"] as const,
  kind: "ADD_TO_GROSS" as const,
};

const subtractRule = {
  code: "BASE_SALARY_ADJUSTMENT",
  ruleVersionId: "rule-retenue-2026",
  grossEffect: "SUBTRACT_FROM_GROSS" as const,
  netEffect: "NONE" as const,
  supportedUnits: ["EUR"] as const,
  kind: "DEDUCT_FROM_GROSS" as const,
};

describe("traitement versionné des variables de paie", () => {
  it("ajoute une variable autorisée au brut", () => {
    const result = resolvePayrollVariableTreatment({
      code: "ACTIVITY_BONUS",
      amount: 250,
      unit: "EUR",
      rule: addRule,
    });

    expect(result).toEqual({
      code: "ACTIVITY_BONUS",
      ruleVersionId: "rule-prime-2026",
      grossDelta: 250,
      netAdjustment: 0,
      kind: "ADD_TO_GROSS",
    });
  });

  it("soustrait une retenue explicitement définie du brut", () => {
    const result = resolvePayrollVariableTreatment({
      code: "BASE_SALARY_ADJUSTMENT",
      amount: 75,
      unit: "EUR",
      rule: subtractRule,
    });

    expect(result.grossDelta).toBe(-75);
    expect(result.netAdjustment).toBe(0);
  });

  it("intègre un avantage en nature au brut puis le retire du net à payer", () => {
    const result = resolvePayrollVariableTreatment({
      code: "BENEFIT_MEAL",
      amount: 120,
      unit: "EUR",
      rule: {
        code: "BENEFIT_MEAL",
        ruleVersionId: "benefit-2026",
        grossEffect: "ADD_TO_GROSS",
        netEffect: "SUBTRACT_FROM_NET",
        supportedUnits: ["EUR"],
        kind: "NON_CASH",
      },
    });

    expect(result).toMatchObject({ grossDelta: 120, netAdjustment: -120, kind: "NON_CASH" });
  });

  it("ajoute un remboursement professionnel au net sans modifier le brut", () => {
    const result = resolvePayrollVariableTreatment({
      code: "EXPENSE_REAL",
      amount: 86.42,
      unit: "EUR",
      rule: {
        code: "EXPENSE_REAL",
        ruleVersionId: "expenses-2026",
        grossEffect: "EXCLUDE_FROM_GROSS",
        netEffect: "ADD_TO_NET",
        supportedUnits: ["EUR"],
        kind: "REIMBURSEMENT",
      },
    });

    expect(result).toMatchObject({ grossDelta: 0, netAdjustment: 86.42, kind: "REIMBURSEMENT" });
  });

  it("déduit la participation salarié aux titres-restaurant du net", () => {
    const result = resolvePayrollVariableTreatment({
      code: "MEAL_VOUCHER_EMPLOYEE",
      amount: 48,
      unit: "EUR",
      rule: {
        code: "MEAL_VOUCHER_EMPLOYEE",
        ruleVersionId: "meal-voucher-2026",
        grossEffect: "EXCLUDE_FROM_GROSS",
        netEffect: "SUBTRACT_FROM_NET",
        supportedUnits: ["EUR"],
        kind: "DEDUCT_FROM_NET",
      },
    });

    expect(result).toMatchObject({ grossDelta: 0, netAdjustment: -48, kind: "DEDUCT_FROM_NET" });
  });

  it("refuse d'utiliser une règle pour un autre code", () => {
    expect(() =>
      resolvePayrollVariableTreatment({
        code: "ACTIVITY_BONUS",
        amount: 100,
        unit: "EUR",
        rule: subtractRule,
      }),
    ).toThrow("ne correspond pas");
  });

  it("refuse une combinaison d'effets incohérente avec le type métier", () => {
    expect(() =>
      resolvePayrollVariableTreatment({
        code: "EXPENSE_REAL",
        amount: 100,
        unit: "EUR",
        rule: {
          code: "EXPENSE_REAL",
          ruleVersionId: "bad-rule",
          grossEffect: "ADD_TO_GROSS",
          netEffect: "NONE",
          supportedUnits: ["EUR"],
          kind: "REIMBURSEMENT",
        },
      }),
    ).toThrow(/n'est pas autorisé|incohérents/i);
  });

  it("refuse une unité non supportée par la règle", () => {
    expect(() =>
      resolvePayrollVariableTreatment({
        code: "ACTIVITY_BONUS",
        amount: 2,
        unit: "HOURS",
        rule: addRule,
      }),
    ).toThrow("n'est pas prise en charge");
  });

  it("refuse une règle sans version", () => {
    expect(() =>
      resolvePayrollVariableTreatment({
        code: "ACTIVITY_BONUS",
        amount: 100,
        unit: "EUR",
        rule: { ...addRule, ruleVersionId: "" },
      }),
    ).toThrow("version de règle");
  });

  it("compose le brut avec le salaire de base et les impacts validés", () => {
    expect(
      composeGrossAmount({
        baseSalaryAmount: 2000,
        variableTreatments: [
          { grossDelta: 250 },
          { grossDelta: -50 },
        ],
      }),
    ).toBe(2200);
  });

  it("compose le net avant impôt avec les ajustements post-sociaux", () => {
    expect(
      composeNetBeforeTaxAmount({
        socialNetBeforeTax: 1800,
        variableTreatments: [
          { netAdjustment: -120 },
          { netAdjustment: 86.42 },
          { netAdjustment: -48 },
        ],
      }),
    ).toBe(1718.42);
  });

  it("refuse un brut résultant négatif", () => {
    expect(() =>
      composeGrossAmount({
        baseSalaryAmount: 100,
        variableTreatments: [{ grossDelta: -150 }],
      }),
    ).toThrow("ne peut pas être négatif");
  });

  it("refuse des retenues nettes supérieures au net disponible", () => {
    expect(() =>
      composeNetBeforeTaxAmount({
        socialNetBeforeTax: 100,
        variableTreatments: [{ netAdjustment: -150 }],
      }),
    ).toThrow(/dépassent le net/i);
  });
});
