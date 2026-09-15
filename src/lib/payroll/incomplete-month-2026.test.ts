import { describe, expect, it } from "vitest";
import { calculateIncompleteMonthActualHours2026 } from "./incomplete-month-2026";

const weekdays = [1, 2, 3, 4, 5] as const;
const hoursByWeekday = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7 } as const;

describe("incomplete-month-2026", () => {
  it("proratise une entrée au milieu du mois sur les heures réelles programmées", () => {
    const result = calculateIncompleteMonthActualHours2026({
      year: 2026,
      month: 9,
      monthlySalaryAmount: 3000,
      hireDate: new Date(Date.UTC(2026, 8, 15)),
      workingWeekdays: weekdays,
      hoursByWeekday,
    });
    expect(result.monthScheduledHours).toBe(154);
    expect(result.payableScheduledHours).toBe(84);
    expect(result.grossDeduction).toBe(1363.64);
    expect(result.payableSalaryAmount).toBe(1636.36);
  });

  it("proratise une sortie en tenant compte d'un jour non travaillé explicite", () => {
    const result = calculateIncompleteMonthActualHours2026({
      year: 2026,
      month: 9,
      monthlySalaryAmount: 3000,
      contractEndDate: new Date(Date.UTC(2026, 8, 15)),
      workingWeekdays: weekdays,
      hoursByWeekday,
      nonWorkedDates: ["2026-09-01"],
    });
    expect(result.monthScheduledHours).toBe(147);
    expect(result.payableScheduledHours).toBe(63);
    expect(result.payableSalaryAmount).toBe(1285.71);
  });

  it("refuse de choisir un planning à la place de l'utilisateur", () => {
    expect(() => calculateIncompleteMonthActualHours2026({
      year: 2026,
      month: 9,
      monthlySalaryAmount: 3000,
      hireDate: new Date(Date.UTC(2026, 8, 15)),
      workingWeekdays: [],
      hoursByWeekday: {},
    })).toThrow("planning hebdomadaire");
  });
});
