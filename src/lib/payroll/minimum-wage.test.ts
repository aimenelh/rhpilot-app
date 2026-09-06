import { describe, expect, it } from "vitest";
import { resolveSmicMinimum } from "./minimum-wage";

describe("référentiel SMIC versionné", () => {
  const rule = {
    ruleCode: "FR.SMIC.MONTHLY_GROSS",
    ruleVersionId: "smic-2026-06-france",
    parameters: {
      territory: "METROPOLE_ET_OUTRE_MER_HORS_MAYOTTE",
      hourlyGrossCents: 1231,
      monthlyGrossCentsAt35Hours: 186702,
      monthlyHoursAt35Hours: 151.67,
    },
  };

  it("retourne les montants de la version de règle fournie", () => {
    expect(resolveSmicMinimum(rule)).toEqual({
      hourlyGrossCents: 1231,
      monthlyGrossCentsAt35Hours: 186702,
      monthlyHoursAt35Hours: 151.67,
      ruleCode: "FR.SMIC.MONTHLY_GROSS",
      ruleVersionId: "smic-2026-06-france",
    });
  });

  it("refuse un territoire inconnu", () => {
    expect(() =>
      resolveSmicMinimum({
        ...rule,
        parameters: { ...rule.parameters, territory: "UNKNOWN" },
      }),
    ).toThrow("territoire");
  });

  it("refuse un montant non positif", () => {
    expect(() =>
      resolveSmicMinimum({
        ...rule,
        parameters: { ...rule.parameters, hourlyGrossCents: 0 },
      }),
    ).toThrow("SMIC horaire");
  });

  it("refuse des paramètres absents", () => {
    expect(() =>
      resolveSmicMinimum({
        ...rule,
        parameters: null,
      }),
    ).toThrow("paramètres");
  });
});
