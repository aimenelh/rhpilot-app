import { describe, expect, it } from "vitest";
import { assertPasDsnScopeSupported, buildDsnPasData, resolveDsnPasRateType } from "./pas-dsn";
import type { WithholdingTaxProfile } from "./withholding-tax-profile";

function profile(overrides: Partial<WithholdingTaxProfile> = {}): WithholdingTaxProfile {
  return {
    rate: 0.071,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    source: "DGFIP",
    sourceReference: "123456789",
    ...overrides,
  };
}

describe("PAS DSN P26V01", () => {
  it("maps a DGFiP rate to type 01 and keeps the CRM identifier", () => {
    expect(resolveDsnPasRateType(profile(), "34")).toEqual({
      rateType: "01",
      rateIdentifier: "123456789",
    });
  });

  it("maps non-personalised monthly scales by geographic zone", () => {
    const neutral = profile({ source: "NON_PERSONNALISE", sourceReference: null });
    expect(resolveDsnPasRateType(neutral, "34").rateType).toBe("13");
    expect(resolveDsnPasRateType(neutral, "971").rateType).toBe("23");
    expect(resolveDsnPasRateType(neutral, "974").rateType).toBe("23");
    expect(resolveDsnPasRateType(neutral, "973").rateType).toBe("33");
    expect(resolveDsnPasRateType(neutral, "976").rateType).toBe("33");
  });

  it("rejects a DGFiP rate without its CRM identifier", () => {
    expect(() => resolveDsnPasRateType(profile({ sourceReference: null }), "34")).toThrow(
      /identifiant du taux PAS/i,
    );
  });

  it("builds a coherent PAS versement payload", () => {
    const result = buildDsnPasData({
      profile: profile({ rate: 0.075 }),
      payrollDepartment: "34",
      netTaxableAmount: 2000,
      withholdingAmount: 150,
    });
    expect(result).toEqual({
      rateType: "01",
      ratePercent: 7.5,
      rateIdentifier: "123456789",
      amountSubjectToPas: 2000,
      withholdingAmount: 150,
    });
  });

  it("rejects an incoherent withholding amount", () => {
    expect(() =>
      buildDsnPasData({
        profile: profile({ rate: 0.075 }),
        payrollDepartment: "34",
        netTaxableAmount: 2000,
        withholdingAmount: 149,
      }),
    ).toThrow(/ne correspond pas/i);
  });

  it("blocks a short fixed-term contract with a neutral rate until the special base rule is modelled", () => {
    expect(() =>
      assertPasDsnScopeSupported({
        source: "NON_PERSONNALISE",
        contractType: "CDD",
        hireDate: new Date("2026-06-01T00:00:00.000Z"),
        contractEndDate: new Date("2026-07-15T00:00:00.000Z"),
      }),
    ).toThrow(/CDD court/i);
  });
});
