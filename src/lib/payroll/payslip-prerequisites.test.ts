import { describe, expect, it } from "vitest";
import { getPayslipPrerequisites, hasBlockingPayslipPrerequisites } from "./payslip-prerequisites";

describe("payslip prerequisites", () => {
  it("blocks generation when required data is missing", () => {
    const prerequisites = getPayslipPrerequisites({
      periodLocked: true,
      hasEmployees: true,
      calculationsComplete: true,
      snapshotsComplete: true,
      organizationSiret: null,
      employeePosition: null,
      employeeClassification: null,
      collectiveAgreementName: null,
    });

    expect(hasBlockingPayslipPrerequisites(prerequisites)).toBe(true);
    expect(prerequisites.find((item) => item.code === "EMPLOYER_ID")?.ready).toBe(false);
    expect(prerequisites.find((item) => item.code === "COLLECTIVE_AGREEMENT")?.ready).toBe(false);
  });

  it("allows all checks when the current model contains the required baseline", () => {
    const prerequisites = getPayslipPrerequisites({
      periodLocked: true,
      hasEmployees: true,
      calculationsComplete: true,
      snapshotsComplete: true,
      organizationSiret: "12345678900012",
      employeePosition: "Gestionnaire RH",
      employeeClassification: "OK",
      collectiveAgreementName: "Convention test",
    });

    expect(hasBlockingPayslipPrerequisites(prerequisites)).toBe(false);
  });
});
