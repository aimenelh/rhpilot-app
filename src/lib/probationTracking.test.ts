import { describe, expect, it } from "vitest";
import {
  getProbationEndDate,
  isProbationActive,
  isProbationHistoricalAtEntry,
  shouldOfferProbationWorkflow,
} from "@/lib/probationTracking";

describe("probationTracking", () => {
  it("classe une période terminée avant l'import comme historique", () => {
    const employee = {
      hireDate: new Date("2000-02-01T00:00:00"),
      probationDuration: 2,
      probationDurationUnit: "MONTHS" as const,
      createdAt: new Date("2026-09-22T00:00:00"),
    };

    expect(getProbationEndDate(employee)?.toISOString().slice(0, 10)).toBe("2000-04-01");
    expect(isProbationHistoricalAtEntry(employee)).toBe(true);
    expect(isProbationActive(employee, new Date("2026-09-22T00:00:00"))).toBe(false);
    expect(shouldOfferProbationWorkflow(employee, new Date("2026-09-22T00:00:00"))).toBe(false);
  });

  it("continue à suivre une période encore active", () => {
    const employee = {
      hireDate: new Date("2026-09-01T00:00:00"),
      probationDuration: 2,
      probationDurationUnit: "MONTHS" as const,
      createdAt: new Date("2026-09-01T00:00:00"),
    };

    expect(isProbationHistoricalAtEntry(employee)).toBe(false);
    expect(isProbationActive(employee, new Date("2026-09-22T00:00:00"))).toBe(true);
    expect(shouldOfferProbationWorkflow(employee, new Date("2026-09-22T00:00:00"))).toBe(true);
  });

  it("garde la distinction entre une période suivie puis terminée et une donnée historique", () => {
    const employee = {
      hireDate: new Date("2026-01-01T00:00:00"),
      probationDuration: 2,
      probationDurationUnit: "MONTHS" as const,
      createdAt: new Date("2026-01-01T00:00:00"),
    };

    expect(isProbationHistoricalAtEntry(employee)).toBe(false);
    expect(isProbationActive(employee, new Date("2026-04-01T00:00:00"))).toBe(false);
  });

  it("laisse le parcours disponible quand aucune durée n'est connue", () => {
    const employee = {
      hireDate: new Date("2000-02-01T00:00:00"),
      probationDuration: null,
      probationDurationUnit: null,
    };

    expect(getProbationEndDate(employee)).toBeNull();
    expect(shouldOfferProbationWorkflow(employee, new Date("2026-09-22T00:00:00"))).toBe(true);
  });
});
