import { describe, expect, it } from "vitest";
import { resolveAbsencePayrollTreatment } from "./absence-payroll-treatment";

describe("absence payroll treatment", () => {
  it("resolves a treatment from an explicit versioned rule", () => {
    expect(
      resolveAbsencePayrollTreatment({
        absence: { absenceId: "a1", type: "PAID_LEAVE", calendarDaysInPeriod: 2 },
        rules: [
          {
            absenceType: "PAID_LEAVE",
            effect: "EXCLUDE_FROM_GROSS",
            basis: "RULE_DEFINED",
            ruleVersionId: "rule-1",
          },
        ],
      }),
    ).toEqual({
      status: "RESOLVED",
      absenceId: "a1",
      absenceType: "PAID_LEAVE",
      calendarDaysInPeriod: 2,
      ruleVersionId: "rule-1",
      effect: "EXCLUDE_FROM_GROSS",
      basis: "RULE_DEFINED",
    });
  });

  it("requires an explicit rule instead of inventing a default treatment", () => {
    expect(
      resolveAbsencePayrollTreatment({
        absence: { absenceId: "a2", type: "SICK_LEAVE", calendarDaysInPeriod: 4 },
        rules: [],
      }),
    ).toEqual({
      status: "RULE_REQUIRED",
      absenceId: "a2",
      absenceType: "SICK_LEAVE",
      calendarDaysInPeriod: 4,
    });
  });
});
