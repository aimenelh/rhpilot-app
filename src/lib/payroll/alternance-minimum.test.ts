import { describe, expect, it } from "vitest";
import { resolveApprenticeshipMinimum, resolveProfessionalisationMinimum } from "./alternance-minimum";

describe("minimums alternance", () => {
  const smic = 186702;

  it("apprentissage 18-20 ans, première année = 43 % du SMIC", () => {
    const result = resolveApprenticeshipMinimum({ age: 19, contractYear: 1, smicMonthlyCents: smic });
    expect(result.status).toBe("APPLICABLE");
    expect(result.monthlyMinimumCents).toBe(Math.round(smic * 0.43));
  });

  it("apprentissage 21-25 ans compare le même pourcentage du SMIC et du minimum conventionnel", () => {
    const collective = 250000;
    const result = resolveApprenticeshipMinimum({ age: 23, contractYear: 2, smicMonthlyCents: smic, collectiveMinimumCents: collective });
    expect(result.status).toBe("APPLICABLE");
    expect(result.monthlyMinimumCents).toBe(Math.max(Math.round(smic * 0.61), Math.round(collective * 0.61)));
  });

  it("apprentissage en troisième année applique 78 % du SMIC entre 21 et 25 ans", () => {
    const result = resolveApprenticeshipMinimum({ age: 24, contractYear: 3, smicMonthlyCents: smic });
    expect(result.status).toBe("APPLICABLE");
    expect(result.percentageOfSmic).toBe(0.78);
    expect(result.monthlyMinimumCents).toBe(Math.round(smic * 0.78));
  });

  it("apprentissage à partir de 26 ans atteint au minimum 100 % du SMIC", () => {
    const result = resolveApprenticeshipMinimum({ age: 26, contractYear: 1, smicMonthlyCents: smic });
    expect(result.status).toBe("APPLICABLE");
    expect(result.percentageOfSmic).toBe(1);
    expect(result.monthlyMinimumCents).toBe(smic);
  });

  it("apprentissage avant 16 ans exige une confirmation d'éligibilité", () => {
    const unresolved = resolveApprenticeshipMinimum({ age: 15, contractYear: 1, smicMonthlyCents: smic });
    expect(unresolved.status).toBe("UNRESOLVED");
    expect(unresolved.code).toBe("UNDER_16_ELIGIBILITY_REQUIRED");

    const confirmed = resolveApprenticeshipMinimum({ age: 15, contractYear: 1, smicMonthlyCents: smic, under16EligibilityConfirmed: true });
    expect(confirmed.status).toBe("APPLICABLE");
    expect(confirmed.monthlyMinimumCents).toBe(Math.round(smic * 0.27));
  });

  it("apprentissage prend en charge la quatrième année avec la grille de troisième année", () => {
    const result = resolveApprenticeshipMinimum({ age: 20, contractYear: 4, smicMonthlyCents: smic });
    expect(result.status).toBe("APPLICABLE");
    expect(result.percentageOfSmic).toBe(0.67);
  });

  it("apprentissage rejette une année de contrat non supportée", () => {
    const result = resolveApprenticeshipMinimum({ age: 19, contractYear: 5 as 1 | 2 | 3 | 4, smicMonthlyCents: smic });
    expect(result.status).toBe("UNRESOLVED");
    expect(result.code).toBe("INVALID_CONTRACT_YEAR");
  });

  it("apprentissage refuse un SMIC nul", () => {
    const result = resolveApprenticeshipMinimum({ age: 19, contractYear: 1, smicMonthlyCents: 0 });
    expect(result.status).toBe("UNRESOLVED");
    expect(result.code).toBe("INVALID_SMIC");
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

  it("professionnalisation des moins de 26 ans n'applique pas silencieusement le minimum conventionnel générique", () => {
    const result = resolveProfessionalisationMinimum({ age: 22, hasBaccalaureateOrHigher: true, smicMonthlyCents: smic, collectiveMinimumCents: 250000 });
    expect(result.status).toBe("APPLICABLE");
    expect(result.monthlyMinimumCents).toBe(Math.round(smic * 0.8));
  });

  it("professionnalisation rejette un minimum conventionnel négatif", () => {
    const result = resolveProfessionalisationMinimum({ age: 22, hasBaccalaureateOrHigher: true, smicMonthlyCents: smic, collectiveMinimumCents: -1 });
    expect(result.status).toBe("UNRESOLVED");
    expect(result.code).toBe("INVALID_COLLECTIVE_MINIMUM");
  });

  it("professionnalisation refuse un SMIC non numérique", () => {
    const result = resolveProfessionalisationMinimum({ age: 22, hasBaccalaureateOrHigher: true, smicMonthlyCents: Number.NaN });
    expect(result.status).toBe("UNRESOLVED");
    expect(result.code).toBe("INVALID_SMIC");
  });
});
