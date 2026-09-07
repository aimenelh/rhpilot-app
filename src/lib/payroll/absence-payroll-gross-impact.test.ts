import { describe, expect, it } from "vitest";
import { calculateAbsenceGrossImpact } from "./absence-payroll-gross-impact";

describe("calculateAbsenceGrossImpact", () => {
  it("deducts an explicitly versioned calendar-day impact", () => {
    expect(
      calculateAbsenceGrossImpact({
        baseSalaryAmount: 2000,
        monthlyCalendarDays: 31,
        absenceDays: 3,
        rule: {
          absenceType: "EXPLICIT_ABSENCE",
          effect: "SUBTRACT_FROM_GROSS",
          basis: "CALENDAR_DAYS",
          divisor: 31,
          rate: 1,
          ruleVersionId: "rule-v1",
        },
      }),
    ).toEqual({
      status: "RESOLVED",
      grossDelta: -193.55,
      basis: "CALENDAR_DAYS",
      effect: "SUBTRACT_FROM_GROSS",
      ruleVersionId: "rule-v1",
      derivedVariableCode: "ABSENCE_EXPLICIT_ABSENCE",
      derivedVariableLabel: "Impact paie — EXPLICIT_ABSENCE",
    });
  });

  it("does not alter gross for an explicitly excluded absence", () => {
    expect(
      calculateAbsenceGrossImpact({
        baseSalaryAmount: 2000,
        monthlyCalendarDays: 30,
        absenceDays: 2,
        rule: {
          absenceType: "EXCLUDED_ABSENCE",
          effect: "EXCLUDE_FROM_GROSS",
          basis: "RULE_DEFINED",
          ruleVersionId: "rule-v2",
        },
      }).grossDelta,
    ).toBe(0);
  });

  it("rejects a basis that the engine does not implement yet", () => {
    expect(
      calculateAbsenceGrossImpact({
        baseSalaryAmount: 2000,
        monthlyCalendarDays: 30,
        absenceDays: 2,
        rule: {
          absenceType: "HOURLY_ABSENCE",
          effect: "SUBTRACT_FROM_GROSS",
          basis: "WORKED_HOURS",
          ruleVersionId: "rule-v3",
        },
      }),
    ).toEqual({ status: "UNSUPPORTED_BASIS" });
  });
});
