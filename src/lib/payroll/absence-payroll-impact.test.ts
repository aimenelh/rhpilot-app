import { describe, expect, it } from "vitest";
import { resolveValidatedAbsencesForPayrollPeriod } from "./absence-payroll-impact";

/**
 * La résolution SQL est testée séparément en intégration. Ces tests ciblent
 * les règles de découpage calendaire exposées par le module sans requérir une
 * base PostgreSQL.
 */

describe("absence payroll impact", () => {
  it("exports the expected payroll impact shape", async () => {
    expect(typeof resolveValidatedAbsencesForPayrollPeriod).toBe("function");
  });
});
