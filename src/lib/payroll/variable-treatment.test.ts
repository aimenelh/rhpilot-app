import { describe, expect, it } from "vitest";
import {
  composeGrossAmount,
  resolvePayrollVariableTreatment,
} from "./variable-treatment";

const addRule = {
  code: "PRIME",
  ruleVersionId: "rule-prime-2026",
  grossEffect: "ADD_TO_GROSS" as const,
  supportedUnits: ["EUR"] as const,
};

const subtractRule = {
  code: "RETENUE",
  ruleVersionId: "rule-retenue-2026",
  grossEffect: "SUBTRACT_FROM_GROSS" as const,
  supportedUnits: ["EUR"] as const,
};

describe("traitement versionné des variables de paie", () => {
  it("ajoute une variable autorisée au brut", () => {
    const result = resolvePayrollVariableTreatment({
      code: "PRIME",
      amount: 250,
      unit: "EUR",
      rule: addRule,
    });

    expect(result).toEqual({
      code: "PRIME",
      ruleVersionId: "rule-prime-2026",
      grossDelta: 250,
    });
  });

  it("soustrait une retenue explicitement définie", () => {
    const result = resolvePayrollVariableTreatment({
      code: "RETENUE",
      amount: 75,
      unit: "EUR",
      rule: subtractRule,
    });

    expect(result.grossDelta).toBe(-75);
  });

  it("refuse d'utiliser une règle pour un autre code", () => {
    expect(() =>
      resolvePayrollVariableTreatment({
        code: "PRIME",
        amount: 100,
        unit: "EUR",
        rule: subtractRule,
      }),
    ).toThrow("ne correspond pas");
  });

  it("refuse une unité non supportée par la règle", () => {
    expect(() =>
      resolvePayrollVariableTreatment({
        code: "PRIME",
        amount: 2,
        unit: "HOURS",
        rule: addRule,
      }),
    ).toThrow("n'est pas prise en charge");
  });

  it("refuse une règle sans version", () => {
    expect(() =>
      resolvePayrollVariableTreatment({
        code: "PRIME",
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
          { code: "PRIME", ruleVersionId: "rule-prime-2026", grossDelta: 250 },
          { code: "RETENUE", ruleVersionId: "rule-retenue-2026", grossDelta: -50 },
        ],
      }),
    ).toBe(2200);
  });

  it("refuse un brut résultant négatif", () => {
    expect(() =>
      composeGrossAmount({
        baseSalaryAmount: 100,
        variableTreatments: [
          { code: "RETENUE", ruleVersionId: "rule-retenue-2026", grossDelta: -150 },
        ],
      }),
    ).toThrow("ne peut pas être négatif");
  });
});
