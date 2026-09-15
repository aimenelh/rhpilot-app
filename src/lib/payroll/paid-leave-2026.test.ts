import { describe, expect, it } from "vitest";
import {
  calculatePaidLeaveAcquisition2026,
  calculatePaidLeaveCompensationAtTermination2026,
  calculatePaidLeaveIndemnity2026,
} from "./paid-leave-2026";

describe("paid-leave-2026", () => {
  it("acquiert 2,5 jours par mois de travail effectif", () => {
    const result = calculatePaidLeaveAcquisition2026({ workingMonthsEquivalent: 12 });
    expect(result.acquiredTotalRounded).toBe(30);
  });

  it("acquiert 2 jours par mois de maladie non professionnelle", () => {
    const result = calculatePaidLeaveAcquisition2026({
      workingMonthsEquivalent: 8,
      nonProfessionalSicknessMonthsEquivalent: 4,
    });
    expect(result.acquiredWorkingDays).toBe(20);
    expect(result.acquiredSicknessDays).toBe(8);
    expect(result.acquiredTotalRounded).toBe(28);
  });

  it("arrondit le droit acquis à l'entier supérieur", () => {
    expect(calculatePaidLeaveAcquisition2026({ workingMonthsEquivalent: 5 }).acquiredTotalRounded).toBe(13);
  });

  it("compare dixième et maintien avec l'horaire réel", () => {
    const result = calculatePaidLeaveIndemnity2026({
      referencePeriodGrossAmount: 21840,
      leaveDays: 12,
      leaveDayDenominator: 30,
      monthlySalaryAmount: 1820,
      actualHoursInMonth: 147,
      leaveHoursInMonth: 70,
      leaveStartDate: new Date(Date.UTC(2026, 7, 3)),
      leaveEndDate: new Date(Date.UTC(2026, 7, 16)),
    });
    expect(result.tenthMethodAmount).toBe(873.6);
    expect(result.salaryMaintenanceAmount).toBe(866.67);
    expect(result.selectedMethod).toBe("TENTH");
    expect(result.selectedAmount).toBe(873.6);
    expect(result.netGrossDelta).toBe(6.93);
  });

  it("calcule l'indemnité compensatrice de congés payés au plus favorable", () => {
    const result = calculatePaidLeaveCompensationAtTermination2026({
      referencePeriodGrossAmount: 30000,
      remainingLeaveDays: 5,
      leaveDayDenominator: 30,
      equivalentSalaryMaintenanceAmount: 450,
    });
    expect(result.amount).toBe(500);
    expect(result.selectedMethod).toBe("TENTH");
  });
});
