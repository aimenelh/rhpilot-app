import { describe, expect, it } from "vitest";
import {
  evaluateCollectiveMinimumSalary,
  parseCollectiveMinimumSalaryParameters,
} from "./collective-agreement-rule-engine";

describe("moteur des minima conventionnels", () => {
  const parameters = {
    ruleType: "MINIMUM_GROSS_MONTHLY",
    classificationCode: "IC_1.1",
    monthlyMinimumCents: 213500,
    professionalCategory: "CADRE",
    sourceReference: "Annexe III — salaires minimaux",
  };

  it("parse une règle de minimum mensuel valide", () => {
    expect(parseCollectiveMinimumSalaryParameters(parameters)).toEqual(parameters);
  });

  it("déclare le salaire conforme lorsque le brut atteint le minimum", () => {
    expect(
      evaluateCollectiveMinimumSalary({
        monthlyGrossCents: 220000,
        classificationCode: "IC_1.1",
        professionalCategory: "CADRE",
        contractType: "CDI",
        parameters,
      }),
    ).toMatchObject({
      status: "APPLICABLE",
      monthlyMinimumCents: 213500,
      compliant: true,
      differenceCents: 6500,
    });
  });

  it("détecte un salaire inférieur au minimum", () => {
    expect(
      evaluateCollectiveMinimumSalary({
        monthlyGrossCents: 200000,
        classificationCode: "IC_1.1",
        professionalCategory: "CADRE",
        contractType: "CDI",
        parameters,
      }),
    ).toMatchObject({
      status: "APPLICABLE",
      compliant: false,
      differenceCents: -13500,
    });
  });

  it("refuse une classification différente", () => {
    expect(
      evaluateCollectiveMinimumSalary({
        monthlyGrossCents: 220000,
        classificationCode: "IC_1.2",
        professionalCategory: "CADRE",
        contractType: "CDI",
        parameters,
      }),
    ).toMatchObject({
      status: "UNRESOLVED",
      code: "CLASSIFICATION_MISMATCH",
    });
  });
});
