import { describe, expect, it } from "vitest";
import { parseCollectiveAgreementAbsenceTreatment } from "./collective-agreement-absence-prisma";

describe("collective agreement absence treatment", () => {
  it("refuse des paramètres conventionnels incomplets", () => {
    expect(
      parseCollectiveAgreementAbsenceTreatment(
        { effect: "SUBTRACT_FROM_GROSS", basis: "CALENDAR_DAYS" },
        "fallback-rule",
        "SICK_LEAVE",
      ),
    ).toBeNull();
  });

  it("conserve un identifiant de version explicite quand il est fourni", () => {
    expect(
      parseCollectiveAgreementAbsenceTreatment(
        {
          effect: "SUBTRACT_FROM_GROSS",
          basis: "CALENDAR_DAYS",
          divisor: 30,
          rate: 1,
          ruleVersionId: "collective-rule-version-42",
        },
        "fallback-rule",
        "SICK_LEAVE",
      ),
    ).toEqual({
      absenceType: "SICK_LEAVE",
      effect: "SUBTRACT_FROM_GROSS",
      basis: "CALENDAR_DAYS",
      ruleVersionId: "collective-rule-version-42",
      divisor: 30,
      rate: 1,
    });
  });
});
