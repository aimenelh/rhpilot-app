import { describe, expect, it } from "vitest";
import {
  getCalendarOverlapDays,
  resolveValidatedAbsencePayrollImpacts,
} from "./absence-payroll-impact";

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("absence payroll impact", () => {
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

  it("uses the versioned rule when one matches the absence type", () => {
    const [impact] = resolveValidatedAbsencePayrollImpacts({
      absences: [
        {
          absenceId: "absence-1",
          employeeId: "employee-1",
          type: "SICK_LEAVE",
          startDate: utcDate("2026-09-10"),
          endDate: utcDate("2026-09-12"),
          periodStart: utcDate("2026-09-10"),
          periodEnd: utcDate("2026-09-12"),
          calendarDaysInPeriod: 3,
          status: "READY",
        },
      ],
      rules: [
        {
          absenceType: "SICK_LEAVE",
          effect: "SUBTRACT_FROM_GROSS",
          basis: "RULE_DEFINED",
          ruleVersionId: "rule-v2",
        },
      ],
    });

    expect(impact).toEqual({
      status: "RESOLVED",
      absenceId: "absence-1",
      absenceType: "SICK_LEAVE",
      calendarDaysInPeriod: 3,
      ruleVersionId: "rule-v2",
      effect: "SUBTRACT_FROM_GROSS",
      basis: "RULE_DEFINED",
    });
  });

  it("does not invent a payroll treatment when no rule matches", () => {
    const [impact] = resolveValidatedAbsencePayrollImpacts({
      absences: [
        {
          absenceId: "absence-2",
          employeeId: "employee-1",
          type: "WORK_ACCIDENT",
          startDate: utcDate("2026-09-10"),
          endDate: utcDate("2026-09-10"),
          periodStart: utcDate("2026-09-10"),
          periodEnd: utcDate("2026-09-10"),
          calendarDaysInPeriod: 1,
          status: "READY",
        },
      ],
      rules: [],
    });

    expect(impact).toEqual({
      status: "RULE_REQUIRED",
      absenceId: "absence-2",
      absenceType: "WORK_ACCIDENT",
      calendarDaysInPeriod: 1,
    });
  });
});
