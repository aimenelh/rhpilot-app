import { describe, expect, it } from "vitest";
import { calculateEmployeeWithholdingTax, assertWithholdingTaxProfile } from "./withholding-tax-validation";

describe("withholding tax validation", () => {
  it("accepts an explicit zero rate", () => {
    const profile = { rate: 0, validFrom: new Date("2026-09-01"), validUntil: null, source: "DGFiP", sourceReference: "PAS-TEST-0" };
    expect(assertWithholdingTaxProfile(profile, "employee-1").rate).toBe(0);
    expect(calculateEmployeeWithholdingTax(2000, profile, "employee-1")).toBe(0);
  });

  it("calculates the employee-specific rate", () => {
    const profile = { rate: 0.1234, validFrom: new Date("2026-09-01"), validUntil: null, source: "DGFiP", sourceReference: "PAS-TEST-1234" };
    expect(calculateEmployeeWithholdingTax(2500, profile, "employee-1")).toBe(308.5);
  });

  it("rejects a missing profile", () => {
    expect(() => assertWithholdingTaxProfile(null, "employee-1")).toThrow(/Aucun taux/);
  });

  it("rejects an invalid rate", () => {
    const profile = { rate: 1.01, validFrom: new Date("2026-09-01"), validUntil: null, source: "DGFiP", sourceReference: null };
    expect(() => assertWithholdingTaxProfile(profile, "employee-1")).toThrow(/invalide/);
  });
});
