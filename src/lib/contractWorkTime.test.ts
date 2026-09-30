import { describe, expect, it } from "vitest";
import {
  buildContractWorkTime,
  defaultScheduleForWeeklyHours,
  monthlyHoursFromWeekly,
  structuralOvertimeMonthlyHours,
  weeklyHoursFromMonthly,
} from "./contractWorkTime";

describe("contractWorkTime", () => {
  it("convertit 35 h hebdomadaires en 151,67 h mensualisées", () => {
    expect(monthlyHoursFromWeekly(35)).toBe(151.67);
    expect(weeklyHoursFromMonthly(151.67)).toBe(35);
  });

  it("déduit 17,33 h supplémentaires structurelles pour un contrat de 39 h", () => {
    expect(monthlyHoursFromWeekly(39)).toBe(169);
    expect(structuralOvertimeMonthlyHours(39)).toBe(17.33);
  });

  it("propose une répartition lundi-vendredi sans modifier le total", () => {
    expect(defaultScheduleForWeeklyHours(24)).toEqual([4.8, 4.8, 4.8, 4.8, 4.8, 0, 0]);
  });

  it("accepte un vrai temps partiel réparti sur trois jours", () => {
    const work = buildContractWorkTime(24, [8, 8, 0, 8, 0, 0, 0]);
    expect(work.monthlyHours).toBe(104);
    expect(work.structuralOvertimeMonthlyHours).toBe(0);
    expect(work.schedule).toEqual([8, 8, 0, 8, 0, 0, 0]);
  });

  it("refuse une répartition incohérente avec le contrat", () => {
    expect(() => buildContractWorkTime(35, [8, 8, 8, 8, 8, 0, 0])).toThrow(/totalise/i);
    expect(() => buildContractWorkTime(35, [7, 7, 7])).toThrow(/sept jours/);
  });
});
