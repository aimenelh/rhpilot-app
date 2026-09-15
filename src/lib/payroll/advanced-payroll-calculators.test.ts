import { describe, expect, it } from "vitest";
import {
  calculateAnnualCumuls,
  calculateExpenseReimbursement,
  calculateFinalSettlement,
  calculateHourlyPremium,
  calculateIncompleteMonthProration,
  calculateMealVouchers,
  calculateNonCashBenefit,
  calculatePaidLeaveIndemnity,
  calculateRegularization,
  composeReplacementIncomeFlows,
} from "./advanced-payroll-calculators";

const source = {
  ruleVersionId: "rule-2026-v1",
  sourceName: "Référentiel validé",
  sourceUrl: "https://example.test/rule",
};

describe("calculateHourlyPremium", () => {
  it("valorise des heures avec le taux explicitement fourni", () => {
    const result = calculateHourlyPremium({ hours: 10, baseSalaryAmount: 2000, monthlyHours: 151.67, premiumRate: 0.25, source });
    expect(result.baseHourlyRate).toBe(13.19);
    expect(result.grossAmount).toBe(164.83);
  });

  it("refuse un taux négatif", () => {
    expect(() => calculateHourlyPremium({ hours: 2, baseSalaryAmount: 2000, monthlyHours: 151.67, premiumRate: -0.1, source })).toThrow("ne peut pas être négatif");
  });
});

describe("calculateIncompleteMonthProration", () => {
  it("proratise selon les unités explicites sans choisir de méthode", () => {
    const result = calculateIncompleteMonthProration({ monthlySalaryAmount: 3000, referenceUnits: 21, payableUnits: 15, unit: "WORKING_DAYS", source });
    expect(result.payableSalaryAmount).toBe(2142.86);
    expect(result.grossDeduction).toBe(857.14);
  });
});

describe("avantages et frais", () => {
  it("ajoute puis retire du net un avantage non monétaire", () => {
    expect(calculateNonCashBenefit({ assessedValue: 180, source })).toMatchObject({ grossDelta: 180, netAdjustment: -180, kind: "NON_CASH" });
  });

  it("ajoute un remboursement uniquement au net", () => {
    expect(calculateExpenseReimbursement({ reimbursedAmount: 75.5, source })).toMatchObject({ grossDelta: 0, netAdjustment: 75.5, kind: "REIMBURSEMENT" });
  });
});

describe("calculateMealVouchers", () => {
  it("calcule les parts à partir d'une règle datée", () => {
    const result = calculateMealVouchers({
      count: 20,
      faceValue: 10,
      employerShareRate: 0.6,
      rule: { ...source, minEmployerShareRate: 0.5, maxEmployerShareRate: 0.6, exemptionCapPerVoucher: 7 },
    });
    expect(result.employerTotal).toBe(120);
    expect(result.employeeTotal).toBe(80);
    expect(result.status).toBe("COMPLIANT");
  });

  it("signale une règle à revoir sans inventer une réintégration", () => {
    const result = calculateMealVouchers({
      count: 10,
      faceValue: 20,
      employerShareRate: 0.7,
      rule: { ...source, minEmployerShareRate: 0.5, maxEmployerShareRate: 0.6, exemptionCapPerVoucher: 7 },
    });
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.compliantShareRate).toBe(false);
    expect(result.withinExemptionCap).toBe(false);
  });
});

describe("calculatePaidLeaveIndemnity", () => {
  it("retient la méthode la plus favorable", () => {
    const result = calculatePaidLeaveIndemnity({
      referenceGrossAmount: 30000,
      leaveDays: 5,
      referenceLeaveDays: 30,
      currentMonthlyGrossAmount: 2500,
      referenceWorkUnitsInMonth: 21,
      leaveWorkUnitsInMonth: 5,
      source,
    });
    expect(result.tenthMethodAmount).toBe(500);
    expect(result.salaryMaintenanceAmount).toBe(595.24);
    expect(result.selectedMethod).toBe("SALARY_MAINTENANCE");
    expect(result.selectedAmount).toBe(595.24);
  });
});

describe("composeReplacementIncomeFlows", () => {
  it("assemble les flux explicitement résolus", () => {
    const result = composeReplacementIncomeFlows({
      absenceGrossDeduction: 400,
      employerMaintenanceGross: 300,
      ijssGrossDeduction: 100,
      ijssNetReintegration: 92,
      subrogated: true,
      source,
    });
    expect(result.grossDelta).toBe(-200);
    expect(result.netAdjustment).toBe(92);
  });
});

describe("cumuls et régularisations", () => {
  it("cumule les sorties de paie de l'année", () => {
    const result = calculateAnnualCumuls([
      { grossAmount: 2000, netTaxableAmount: 1600, netSocialAmount: 1550, withholdingTax: 100, netPaid: 1450, employeeContributions: 400, employerContributions: 800 },
      { grossAmount: 2100, netTaxableAmount: 1680, netSocialAmount: 1620, withholdingTax: 110, netPaid: 1510, employeeContributions: 420, employerContributions: 840 },
    ]);
    expect(result.grossAmount).toBe(4100);
    expect(result.netPaid).toBe(2960);
    expect(result.withholdingTax).toBe(210);
  });

  it("calcule seulement l'écart d'une régularisation", () => {
    expect(calculateRegularization({ previousAmount: 100, correctedAmount: 135, source })).toMatchObject({ delta: 35, direction: "ADD" });
    expect(calculateRegularization({ previousAmount: 150, correctedAmount: 120, source })).toMatchObject({ delta: -30, direction: "DEDUCT" });
  });
});

describe("calculateFinalSettlement", () => {
  it("agrège des composants déjà calculés et sourcés", () => {
    const result = calculateFinalSettlement([
      { code: "FINAL_SALARY", label: "Dernier salaire", amount: 1200, cashImpact: 900, source },
      { code: "PAID_LEAVE_COMPENSATION", label: "ICCP", amount: 500, cashImpact: 390, source },
      { code: "EXPENSE_REAL", label: "Frais", amount: 80, cashImpact: 80, source },
    ]);
    expect(result.totalCashImpact).toBe(1370);
  });
});
