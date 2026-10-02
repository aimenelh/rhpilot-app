import { describe, expect, it } from "vitest";
import {
  assertValidatedAbsencesReadyForPayroll,
  getCalendarOverlapDays,
  isAbsenceNeededForPayrollMonth,
} from "./absence-payroll-impact";

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("absence payroll impact", () => {
  it("conserve la reprise du premier jour du mois sans prolonger la retenue de l'arrêt précédent", () => {
    const absence = { type: "SICK_LEAVE", startDate: utcDate("2026-01-20"), endDate: utcDate("2026-01-31"), returnDate: utcDate("2026-02-01"), returnReasonCode: "01" };
    expect(isAbsenceNeededForPayrollMonth(absence, utcDate("2026-02-01"), utcDate("2026-02-28"))).toBe(true);
    expect(getCalendarOverlapDays(absence.startDate, absence.endDate, utcDate("2026-02-01"), utcDate("2026-02-28"))).toBe(0);
    expect(isAbsenceNeededForPayrollMonth(absence, utcDate("2026-03-01"), utcDate("2026-03-31"))).toBe(false);
  });
  it("counts the full absence when it fits inside the payroll period", () => {
    expect(
      getCalendarOverlapDays(
        utcDate("2026-09-10"),
        utcDate("2026-09-12"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(3);
  });

  it("limits a cross-month absence to the payroll period", () => {
    expect(
      getCalendarOverlapDays(
        utcDate("2026-09-28"),
        utcDate("2026-10-02"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(3);
  });

  it("returns zero when there is no overlap or when the range is invalid", () => {
    expect(
      getCalendarOverlapDays(
        utcDate("2026-10-01"),
        utcDate("2026-10-02"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(0);

    expect(
      getCalendarOverlapDays(
        utcDate("2026-09-12"),
        utcDate("2026-09-10"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(0);
  });

  it("accepts validated absences when every payroll impact is ready", () => {
    expect(() =>
      assertValidatedAbsencesReadyForPayroll([
        { id: "absence-1", payrollImpactStatus: "READY" },
        { id: "absence-2", payrollImpactStatus: "INTEGRATED" },
      ]),
    ).not.toThrow();
  });

  it("blocks payroll when a validated absence still has a non-ready payroll impact", () => {
    expect(() =>
      assertValidatedAbsencesReadyForPayroll([
        { id: "absence-ready", payrollImpactStatus: "READY" },
        { id: "absence-pending", payrollImpactStatus: "PENDING" },
      ]),
    ).toThrow(/Calcul de paie bloqué/);
  });
});
