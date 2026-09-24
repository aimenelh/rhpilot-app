import { describe, expect, it } from "vitest";
import { employeeQuantityForBilling } from "@/lib/billingPolicy";

describe("employeeQuantityForBilling", () => {
  it("conserve au moins une unité facturable", () => {
    expect(employeeQuantityForBilling(0)).toBe(1);
  });

  it("reflète le nombre réel de salariés actifs", () => {
    expect(employeeQuantityForBilling(1)).toBe(1);
    expect(employeeQuantityForBilling(12)).toBe(12);
  });

  it("refuse les valeurs incohérentes", () => {
    expect(() => employeeQuantityForBilling(-1)).toThrow();
    expect(() => employeeQuantityForBilling(1.5)).toThrow();
  });
});
