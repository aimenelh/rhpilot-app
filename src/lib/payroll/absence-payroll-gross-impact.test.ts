import { describe, expect, it } from "vitest";
import { calculateAbsenceGrossImpact } from "./absence-payroll-gross-impact";

describe("absence payroll gross impact", () => {
  it("applies an explicit calendar-day deduction", () => {
    expect(
      calculateAbsenceGrossImpact({
        baseSalaryAmount: 3000,
        monthlyCalendarDays: 30,
        absenceDays: 3,
        rule: {
          absenceType: "SICK_LEAVE",
          effect: "SUBTRACT_FROM_GROSS",
          basis: "CALENDAR_DAYS",
          ruleVersionId: "rule-2026-01",
          divisor: 30,
          rate: 1,
        },
      }),
    ).toMatchObject({ status: "RESOLVED", grossDelta: -300, ruleVersionId: "rule-2026-01" });
  });

  it("does not invent a conversion for working days", () => {
    expect(
      calculateAbsenceGrossImpact({
        baseSalaryAmount: 3000,
        monthlyCalendarDays: 30,
        absenceDays: 3,
        rule: {
          absenceType: "SICK_LEAVE",
          effect: "SUBTRACT_FROM_GROSS",
          basis: "WORKING_DAYS",
          ruleVersionId: "rule-2026-01",
        },
      }),
    ).toEqual({ status: "UNSUPPORTED_BASIS" });
  });

  it("keeps an explicitly excluded absence neutral on gross", () => {
    expect(
      calculateAbsenceGrossImpact({
        baseSalaryAmount: 2500,
        monthlyCalendarDays: 31,
        absenceDays: 5,
        rule: {
          absenceType: "PAID_LEAVE",
          effect: "EXCLUDE_FROM_GROSS",
          basis: "RULE_DEFINED",
          ruleVersionId: "rule-2026-01",
        },
      }),
    ).toMatchObject({ status: "RESOLVED", grossDelta: 0, effect: "EXCLUDE_FROM_GROSS" });
  });
});
