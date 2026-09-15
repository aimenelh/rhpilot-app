import { describe, expect, it } from "vitest";
import { assertPayrollOutputConsistency } from "./payroll-output-consistency";

const coherent = {
  grossAmount: 2500,
  employeeContributions: 520,
  employerContributions: 850,
  netBeforeTax: 1980,
  netTaxableAmount: 2050,
  netSocialAmount: 1960,
  withholdingTax: 153.75,
  netPaid: 1826.25,
  employerCost: 3350,
};

describe("payroll output consistency", () => {
  it("accepts reconciled payroll totals", () => {
    expect(assertPayrollOutputConsistency(coherent).netPaid).toBe(1826.25);
  });

  it("blocks a net paid that no longer reconciles with PAS", () => {
    expect(() => assertPayrollOutputConsistency({ ...coherent, netPaid: 1800 })).toThrow(/net payé/i);
  });

  it("blocks PAS greater than net before tax", () => {
    expect(() =>
      assertPayrollOutputConsistency({
        ...coherent,
        withholdingTax: 2000,
        netPaid: 0,
      }),
    ).toThrow(/prélèvement à la source/i);
  });
});
