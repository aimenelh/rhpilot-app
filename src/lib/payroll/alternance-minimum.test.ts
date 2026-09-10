import { describe, expect, it } from "vitest";
import { resolveApprenticeshipMinimum, resolveProfessionalisationMinimum } from "./alternance-minimum";

describe("minimums alternance", () => {
  const smic = 186702;

  it("apprentissage 18-20 ans, première année = 43 % du SMIC", () => {
    const result = resolveApprenticeshipMinimum({ age: 19, contractYear: 1, smicMonthlyCents: smic });
    expect(result.status).toBe("APPLICABLE");
    expect(result.monthlyMinimumCents).toBe(Math.round(smic * 0.43));
  });

  it("apprentissage applique le minimum conventionnel lorsqu'il est plus favorable", () => {
    const result = resolveApprenticeshipMinimum({ age: 23, contractYear: 2, smicMonthlyCents: smic, collectiveMinimumCents: 160000 });
    expect(result.monthlyMinimumCents).toBe(160000);
  });

  it("professionnalisation distingue le niveau bac", () => {
    const withoutBac = resolveProfessionalisationMinimum({ age: 20, hasBaccalaureateOrHigher: false, smicMonthlyCents: smic });
    const withBac = resolveProfessionalisationMinimum({ age: 20, hasBaccalaureateOrHigher: true, smicMonthlyCents: smic });
    expect(withoutBac.monthlyMinimumCents).toBe(Math.round(smic * 0.55));
    expect(withBac.monthlyMinimumCents).toBe(Math.round(smic * 0.65));
  });

  it("professionnalisation à partir de 26 ans applique le plus favorable entre SMIC et 85 % du conventionnel", () => {
    const result = resolveProfessionalisationMinimum({ age: 26, hasBaccalaureateOrHigher: true, smicMonthlyCents: smic, collectiveMinimumCents: 250000 });
    expect(result.monthlyMinimumCents).toBe(Math.max(smic, Math.round(250000 * 0.85)));
  });
});
