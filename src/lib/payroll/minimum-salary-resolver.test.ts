import { describe, expect, it } from "vitest";
import { resolveMinimumSalary } from "./minimum-salary-resolver";
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

describe("résolveur du salaire minimum", () => {
  it("retient le minimum conventionnel lorsqu'il est supérieur au SMIC", () => {
    expect(resolveMinimumSalary({ smic, collectiveMinimum: collective, monthlyHours: 151.67, collectiveRuleVersionId: "ccn-2025-v1", monthlyGrossCents: 220000 })).toMatchObject({
      status: "APPLICABLE",
      source: "COLLECTIVE_AGREEMENT",
      appliedMonthlyMinimumCents: 213500,
      smicMonthlyMinimumCents: 186705,
      collectiveMonthlyMinimumCents: 213500,
      collectiveRuleVersionId: "ccn-2025-v1",
      compliant: true,
      differenceCents: 6500,
    });
  });

  it("retient le SMIC lorsqu'il est supérieur au minimum conventionnel", () => {
    expect(resolveMinimumSalary({
      smic,
      collectiveMinimum: { ...collective, monthlyMinimumCents: 180000 },
      monthlyHours: 160,
      collectiveRuleVersionId: "ccn-2025-v1",
      monthlyGrossCents: 200000,
    })).toMatchObject({
      source: "SMIC",
      appliedMonthlyMinimumCents: 196960,
      collectiveMonthlyMinimumCents: 180000,
      collectiveRuleVersionId: undefined,
      compliant: true,
    });
  });

  it("conserve le SMIC si aucune convention n'est applicable", () => {
    expect(resolveMinimumSalary({ smic, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({
      status: "APPLICABLE",
      source: "SMIC",
      appliedMonthlyMinimumCents: 186705,
      collectiveMonthlyMinimumCents: null,
      compliant: true,
    });
  });

  it("proratise le SMIC avec 80 % de la durée mensuelle", () => {
    expect(resolveMinimumSalary({ smic, monthlyHours: 151.67 * 0.8, monthlyGrossCents: 150000 })).toMatchObject({
      appliedMonthlyMinimumCents: 149364,
      compliant: true,
    });
  });

  it("retourne non conforme lorsque le brut est sous le minimum applicable", () => {
    expect(resolveMinimumSalary({ smic, collectiveMinimum: collective, monthlyHours: 151.67, monthlyGrossCents: 210000 })).toMatchObject({
      compliant: false,
      differenceCents: -3500,
    });
  });

  it("reste explicite si la convention est résolue mais inexploitable", () => {
    expect(resolveMinimumSalary({
      smic,
      collectiveMinimum: { status: "UNRESOLVED", code: "CLASSIFICATION_MISMATCH", message: "Classification absente." },
      monthlyHours: 151.67,
      monthlyGrossCents: 190000,
    })).toMatchObject({
      status: "UNRESOLVED",
      code: "COLLECTIVE_MINIMUM_UNRESOLVED",
    });
  });

  it("refuse une durée mensuelle invalide", () => {
    expect(resolveMinimumSalary({ smic, monthlyHours: 0, monthlyGrossCents: 190000 })).toMatchObject({
      status: "UNRESOLVED",
      code: "INVALID_MONTHLY_HOURS",
    });
  });

  it("refuse un SMIC invalide", () => {
    expect(resolveMinimumSalary({
      smic: { ...smic, hourlyGrossCents: 0 },
      monthlyHours: 151.67,
      monthlyGrossCents: 190000,
    })).toMatchObject({
      status: "UNRESOLVED",
      code: "INVALID_SMIC",
    });
  });
});
