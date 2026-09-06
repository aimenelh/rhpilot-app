import { describe, expect, it } from "vitest";
import { calculatePayroll } from "./engine";
import { assertPayrollPeriodMutable, assertPayrollPeriodStatus } from "./domain";

describe("moteur paie", () => {
  const ruleSet = {
    version: "test-2026.09",
    rules: [
      {
        code: "TEST_EMPLOYEE",
        label: "Cotisation salarié de test",
        side: "EMPLOYEE" as const,
        rate: 0.1,
        base: "GROSS" as const,
        ruleVersionId: "rule-employee-1",
      },
      {
        code: "TEST_EMPLOYER",
        label: "Cotisation employeur de test",
        side: "EMPLOYER" as const,
        rate: 0.2,
        base: "GROSS" as const,
        ruleVersionId: "rule-employer-1",
      },
    ],
  };

  it("calcule séparément les parts salarié et employeur", () => {
    const result = calculatePayroll({
      grossAmount: 3000,
      ruleSet,
    });

    expect(result.grossAmount).toBe(3000);
    expect(result.employeeContributions).toBe(300);
    expect(result.employerContributions).toBe(600);
    expect(result.netBeforeTax).toBe(2700);
    expect(result.netPaid).toBe(2700);
    expect(result.contributions).toHaveLength(2);
  });

  it("applique le prélèvement après les cotisations salarié", () => {
    const result = calculatePayroll({
      grossAmount: 3000,
      withholdingTaxRate: 0.1,
      ruleSet,
    });

    expect(result.netBeforeTax).toBe(2700);
    expect(result.withholdingTax).toBe(270);
    expect(result.netPaid).toBe(2430);
  });

  it("refuse un calcul sans version de règles", () => {
    expect(() =>
      calculatePayroll({
        grossAmount: 3000,
        ruleSet: { ...ruleSet, version: "" },
      }),
    ).toThrow("version de règles");
  });

  it("refuse un brut négatif", () => {
    expect(() =>
      calculatePayroll({
        grossAmount: -1,
        ruleSet,
      }),
    ).toThrow("brut");
  });
});

describe("cycle de vie d'une période de paie", () => {
  it("accepte uniquement les statuts connus", () => {
    expect(() => assertPayrollPeriodStatus("REVIEW")).not.toThrow();
    expect(() => assertPayrollPeriodStatus("UNKNOWN")).toThrow();
  });

  it("interdit toute modification après verrouillage", () => {
    expect(() => assertPayrollPeriodMutable("VALIDATED")).not.toThrow();
    expect(() => assertPayrollPeriodMutable("LOCKED")).toThrow("verrouillée");
  });
});
