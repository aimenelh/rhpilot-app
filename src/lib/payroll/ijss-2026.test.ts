import { describe, expect, it } from "vitest";
import {
  buildSubrogatedIjssNetFlow,
  calculateMaternityPaternityAdoptionIjss2026,
  calculateSicknessIjss2026,
  calculateWorkAccidentIjss2026,
} from "./ijss-2026";

describe("IJSS 2026", () => {
  it("calcule la maladie avec 3 jours de carence et plafond post-juillet", () => {
    const result = calculateSicknessIjss2026({
      previousGrossSalaries: [3000, 3000, 3000],
      prescribedCalendarDays: 10,
      startDate: new Date(Date.UTC(2026, 6, 10)),
    });
    expect(result.waitingDays).toBe(3);
    expect(result.compensatedDays).toBe(7);
    expect(result.dailyBenefit).toBe(42.97);
    expect(result.grossBenefitTotal).toBe(300.79);
  });

  it("calcule maternité/paternité/adoption sans carence sur trois salaires plafonnés", () => {
    const result = calculateMaternityPaternityAdoptionIjss2026({
      previousGrossSalaries: [3500, 3500, 3500],
      compensatedCalendarDays: 5,
    });
    expect(result.waitingDays).toBe(0);
    expect(result.dailyReferenceSalary).toBe(90.9);
    expect(result.grossBenefitTotal).toBe(454.5);
  });

  it("plafonne maternité au plafond journalier", () => {
    const result = calculateMaternityPaternityAdoptionIjss2026({
      previousGrossSalaries: [10000, 10000, 10000],
      compensatedCalendarDays: 1,
    });
    expect(result.dailyBenefit).toBeLessThanOrEqual(104.02);
  });

  it("calcule AT/MP à 60 % jusqu'au 28e jour puis 80 %", () => {
    const result = calculateWorkAccidentIjss2026({
      previousMonthGrossSalary: 3000,
      compensatedCalendarDays: 10,
      daysAlreadyCompensatedBeforePeriod: 25,
    });
    expect(result.firstPeriodDays).toBe(3);
    expect(result.secondPeriodDays).toBe(7);
    expect(result.waitingDays).toBe(0);
    expect(result.grossBenefitTotal).toBe(758.72);
  });

  it("n'ajoute les IJSS nettes au net à payer qu'en subrogation", () => {
    expect(buildSubrogatedIjssNetFlow({ ijssGrossAmount: 100, subrogated: true })).toMatchObject({ netIjssAmount: 93.3, netAdjustment: 93.3 });
    expect(buildSubrogatedIjssNetFlow({ ijssGrossAmount: 100, subrogated: false }).netAdjustment).toBe(0);
  });
});
