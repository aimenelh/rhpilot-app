import { describe, expect, it } from "vitest";
import { identifyDsnAffiliations, normalizeDsnComplementaryAffiliations } from "./dsn-complementary-affiliations";

export const healthAffiliation = { coverage: "SANTE", organismCode: "P0983", contractReference: "SANTE-TEST", delegateCode: null, populationCode: null, optionCode: null, validFrom: "2024-01-01", validUntil: null, paymentFrequency: "MONTHLY", componentCodes: ["20"], sourceReference: "FPOC test : montant forfaitaire 20" };
describe("affiliations complémentaires DSN", () => {
  it("reprend la fiche et distingue adhésion d'entreprise et affiliation individuelle", () => {
    const config = normalizeDsnComplementaryAffiliations([healthAffiliation]);
    const identified = identifyDsnAffiliations([config, config]);
    expect(identified[0][0].adhesionId).toBe(identified[1][0].adhesionId);
    expect(identified[0][0].affiliationId).toBe("1");
  });
  it("refuse doublons, paiements non mensuels, dates et composants non couverts", () => {
    expect(() => normalizeDsnComplementaryAffiliations([healthAffiliation, healthAffiliation])).toThrow(/dupliquée/);
    expect(() => normalizeDsnComplementaryAffiliations([{ ...healthAffiliation, paymentFrequency: "QUARTERLY" }])).toThrow(/échéancier/);
    expect(() => normalizeDsnComplementaryAffiliations([{ ...healthAffiliation, validFrom: "2026-02-30" }])).toThrow(/date/);
    expect(() => normalizeDsnComplementaryAffiliations([{ ...healthAffiliation, componentCodes: ["18"] }])).toThrow(/forfaitaire/);
  });
  it("ne fabrique pas de référence ni de code population", () => {
    expect(() => normalizeDsnComplementaryAffiliations([{ ...healthAffiliation, sourceReference: "" }])).toThrow(/fiche/);
    const config = normalizeDsnComplementaryAffiliations([healthAffiliation]);
    expect(config[0].populationCode).toBeNull();
    expect(config[0].optionCode).toBeNull();
  });
});
