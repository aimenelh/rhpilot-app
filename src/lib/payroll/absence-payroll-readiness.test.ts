import { describe, expect, it } from "vitest";
import {
  extractAbsencePayrollTreatmentTypes,
  formatAbsencePayrollTreatmentGap,
  getMissingAbsencePayrollTreatmentTypes,
} from "./absence-payroll-readiness";

describe("absence payroll readiness", () => {
  it("extracts treatment types from validated rule parameters", () => {
    expect(
      extractAbsencePayrollTreatmentTypes({
        absenceTreatments: [
          { absenceType: "SICK_LEAVE" },
          { absenceType: " PAID_LEAVE " },
          { absenceType: "" },
        ],
      }),
    ).toEqual(["SICK_LEAVE", "PAID_LEAVE"]);
  });

  it("detects only absence types without an explicit validated treatment", () => {
    expect(
      getMissingAbsencePayrollTreatmentTypes({
        absenceTypes: ["SICK_LEAVE", "PAID_LEAVE", "SICK_LEAVE"],
        validatedTreatments: [{ absenceType: "PAID_LEAVE" }],
      }),
    ).toEqual(["SICK_LEAVE"]);
  });

  it("formats a useful gap message", () => {
    expect(formatAbsencePayrollTreatmentGap(["SICK_LEAVE", "RTT"]))
      .toBe("Une règle de traitement paie validée manque pour : arrêt maladie, RTT.");
  });
});
