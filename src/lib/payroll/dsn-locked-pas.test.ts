import { describe, expect, it } from "vitest";
import { dsnPasFromLockedBulletin } from "./dsn-locked-pas";

const data = () => ({ profile: { rate: 0.1, validFrom: new Date("2026-01-01"), validUntil: null, source: "DGFIP", sourceReference: "123456789" }, payrollDepartment: "34", contractType: "APPRENTISSAGE", netTaxableAmount: 816, withholdingAmount: 81.6, withholding: { rate: 0.1, amount: 81.6, base: 816, fiscalNetBeforeExemption: 2000, nonTaxableApprenticeIncome: 1184, taxableSubrogatedIjss: 0, shortContractAllowance: 0 } });

describe("reprise du PAS verrouillé en DSN", () => {
  it("distingue RNF entière, part exonérée et assiette PAS au franchissement du seuil", () => {
    const result = dsnPasFromLockedBulletin(data());
    expect(result.fiscalNet).toBe(2000);
    expect(result.pas.nonTaxableApprenticeIncome).toBe(1184);
    expect(result.pas.amountSubjectToPas).toBe(816);
    expect(result.pas.withholdingAmount).toBe(81.6);
  });
  it("réintègre les IJSS dans l'assiette PAS et les exclut de la RNF", () => {
    const input = data();
    input.netTaxableAmount = 1016;
    input.withholdingAmount = 101.6;
    input.withholding = { ...input.withholding, base: 1016, amount: 101.6, taxableSubrogatedIjss: 200 };
    const result = dsnPasFromLockedBulletin(input);
    expect(result.fiscalNet).toBe(2000);
    expect(result.pas.amountSubjectToPas).toBe(1016);
  });
  it("bloque un taux divergent et une décomposition incohérente", () => {
    expect(() => dsnPasFromLockedBulletin({ ...data(), withholding: { ...data().withholding, rate: 0.11 } })).toThrow(/divergent/);
    expect(() => dsnPasFromLockedBulletin({ ...data(), withholding: { ...data().withholding, nonTaxableApprenticeIncome: 100 } })).toThrow(/décomposition/);
  });
  it("refuse les snapshots absents et les données fiscales historiques d'apprenti", () => {
    expect(() => dsnPasFromLockedBulletin({ ...data(), withholding: null })).toThrow(/manque/);
    expect(() => dsnPasFromLockedBulletin({ ...data(), withholding: { base: 816, rate: 0.1, amount: 81.6 } })).toThrow(/historique/);
  });
});
