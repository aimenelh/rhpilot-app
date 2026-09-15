import { describe, expect, it } from "vitest";
import {
  calculateCddEndAllowance2026,
  calculateFinalSettlement2026,
  calculateLegalSeveranceMinimum2026,
  selectLegalSeveranceReferenceSalary,
} from "./termination-2026";

describe("termination-2026", () => {
  it("choisit le salaire de référence le plus favorable", () => {
    const result = selectLegalSeveranceReferenceSalary({
      last12GrossSalaries: Array(12).fill(2000),
      last3GrossSalaries: [2200, 2200, 2200],
    });
    expect(result.twelveMonthAverage).toBe(2000);
    expect(result.threeMonthAverage).toBe(2200);
    expect(result.selected).toBe(2200);
  });

  it("calcule le minimum légal de licenciement avec prorata des mois complets", () => {
    const result = calculateLegalSeveranceMinimum2026({
      referenceMonthlySalary: 1500,
      completeYearsOfSeniority: 12,
      additionalCompleteMonths: 9,
    });
    expect(result.amount).toBe(5125);
  });

  it("calcule la prime de fin de CDD à 10 % par défaut", () => {
    expect(calculateCddEndAllowance2026({ totalEligibleGrossRemuneration: 20000, eligible: true }).amount).toBe(2000);
  });

  it("n'applique 6 % que lorsque le taux conventionnel est explicitement fourni", () => {
    expect(calculateCddEndAllowance2026({ totalEligibleGrossRemuneration: 20000, eligible: true, conventionalReducedRate: 0.06 }).amount).toBe(1200);
  });

  it("retourne zéro lorsque l'éligibilité à la prime de CDD est exclue", () => {
    expect(calculateCddEndAllowance2026({ totalEligibleGrossRemuneration: 20000, eligible: false }).amount).toBe(0);
  });

  it("assemble le solde de tout compte sans inventer le régime social d'une rupture", () => {
    const result = calculateFinalSettlement2026({
      finalSalaryGross: 1200,
      finalSalaryNetPayable: 950,
      referencePeriodGrossForPaidLeave: 30000,
      remainingPaidLeaveDays: 5,
      paidLeaveDenominator: 30,
      equivalentPaidLeaveMaintenanceAmount: 450,
      cdd: { totalEligibleGrossRemuneration: 20000, eligible: true },
      severance: { legalMinimum: 1000, conventionalOrNegotiatedAmount: 1200 },
      noticeCompensation: 800,
      expenseReimbursements: 100,
    });
    expect(result.paidLeaveCompensation).toBe(500);
    expect(result.cddEndAllowance).toBe(2000);
    expect(result.severanceAmount).toBe(1200);
    expect(result.grossTerminationItemsBeforeSocialRecalculation).toBe(3300);
    expect(result.nonGrossCashItems).toBe(100);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
