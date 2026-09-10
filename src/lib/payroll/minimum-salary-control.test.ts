import { describe, expect, it } from "vitest";
import { buildMinimumSalaryControlSnapshot } from "./minimum-salary-control";
import type { SmicMinimumResult } from "./minimum-wage";

const smic: SmicMinimumResult = {
  hourlyGrossCents: 1231,
  monthlyGrossCentsAt35Hours: 186702,
  monthlyHoursAt35Hours: 151.67,
  ruleCode: "SMIC_GROSS",
  ruleVersionId: "smic-2026-06",
};

const collective = {
  status: "APPLICABLE" as const,
  classificationCode: "IC_1.1",
  monthlyMinimumCents: 213500,
  differenceCents: 6500,
  compliant: true,
};

describe("snapshot du contrôle du salaire minimum", () => {
  it("trace le minimum conventionnel retenu", () => {
    expect(buildMinimumSalaryControlSnapshot({
      smic,
      collectiveMinimum: collective,
      monthlyHours: 151.67,
      collectiveRuleVersionId: "ccn-2025-v1",
      monthlyGrossCents: 220000,
    })).toEqual({
      status: "APPLICABLE",
      source: "COLLECTIVE_AGREEMENT",
      appliedMonthlyMinimumCents: 213500,
      smicMonthlyMinimumCents: 186706,
      collectiveMonthlyMinimumCents: 213500,
      compliant: true,
      differenceCents: 6500,
      smicRuleCode: "SMIC_GROSS",
      smicRuleVersionId: "smic-2026-06",
      collectiveRuleVersionId: "ccn-2025-v1",
      explanation: "Le minimum conventionnel applicable est supérieur ou égal au SMIC proratisé.",
    });
  });

  it("trace le SMIC lorsque celui-ci est le minimum le plus favorable", () => {
    expect(buildMinimumSalaryControlSnapshot({
      smic,
      collectiveMinimum: { ...collective, monthlyMinimumCents: 180000 },
      monthlyHours: 160,
      collectiveRuleVersionId: "ccn-2025-v1",
      monthlyGrossCents: 200000,
    })).toMatchObject({
      status: "APPLICABLE",
      source: "SMIC",
      appliedMonthlyMinimumCents: 196960,
      collectiveMonthlyMinimumCents: 180000,
      collectiveRuleVersionId: undefined,
      compliant: true,
    });
  });

  it("ne masque pas une résolution impossible", () => {
    expect(buildMinimumSalaryControlSnapshot({
      smic,
      collectiveMinimum: {
        status: "UNRESOLVED",
        code: "CLASSIFICATION_MISMATCH",
        message: "Classification absente.",
      },
      monthlyHours: 151.67,
      monthlyGrossCents: 190000,
    })).toEqual({
      status: "UNRESOLVED",
      explanation: "Le minimum conventionnel n'est pas déterminable : Classification absente.",
      code: "COLLECTIVE_MINIMUM_UNRESOLVED",
    });
  });
});
