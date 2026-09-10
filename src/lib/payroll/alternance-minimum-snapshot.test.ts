import { describe, expect, it } from "vitest";
import { resolveApprenticeshipMinimum } from "./alternance-minimum";
import { buildAlternanceMinimumSnapshot } from "./alternance-minimum-snapshot";

describe("buildAlternanceMinimumSnapshot", () => {
  it("conserve toutes les données déterminantes du contrôle", () => {
    const result = resolveApprenticeshipMinimum({ age: 20, contractYear: 2, smicMonthlyCents: 186702, collectiveMinimumCents: 200000 });
    const snapshot = buildAlternanceMinimumSnapshot({
      result,
      age: 20,
      contractYear: 2,
      hasBaccalaureateOrHigher: null,
      smicMonthlyCents: 186702,
      smicScope: "FRANCE_HORS_MAYOTTE",
      collectiveMinimumCents: 200000,
      baseSalaryCents: 200000,
      profileValidFrom: new Date("2026-01-01T00:00:00.000Z"),
      profileValidUntil: null,
      profileSource: "CONTRACT",
      profileSourceReference: "contrat-001",
      legalMinimumCents: 95218,
    });

    expect(snapshot).toEqual(expect.objectContaining({
      status: "APPLICABLE",
      source: "APPRENTISSAGE_LEGAL",
      age: 20,
      contractYear: 2,
      smicMonthlyCents: 186702,
      smicScope: "FRANCE_HORS_MAYOTTE",
      legalMinimumCents: 95218,
      collectiveMinimumCents: 200000,
      applicableMinimumCents: 200000,
      percentageOfSmic: 0.51,
      baseSalaryCents: 200000,
      profileSource: "CONTRACT",
      profileSourceReference: "contrat-001",
    }));
  });

  it("conserve un résultat non résolu sans inventer de minimum", () => {
    const result = resolveApprenticeshipMinimum({ age: 20, contractYear: 2, smicMonthlyCents: Number.NaN });
    const snapshot = buildAlternanceMinimumSnapshot({
      result,
      age: 20,
      contractYear: 2,
      hasBaccalaureateOrHigher: null,
      smicMonthlyCents: 186702,
      smicScope: "FRANCE_HORS_MAYOTTE",
      collectiveMinimumCents: null,
      baseSalaryCents: 200000,
      profileValidFrom: new Date("2026-01-01T00:00:00.000Z"),
      profileValidUntil: null,
      profileSource: "CONTRACT",
      profileSourceReference: null,
    });

    expect(snapshot.status).toBe("UNRESOLVED");
    expect(snapshot.code).toBe("INVALID_SMIC");
    expect(snapshot.applicableMinimumCents).toBeNull();
    expect(snapshot.legalMinimumCents).toBeNull();
  });
});
