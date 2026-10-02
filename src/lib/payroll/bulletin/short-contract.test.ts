import { describe, expect, it } from "vitest";
import { shortContractPasApplies, shortContractPasWindowEnd } from "./short-contract";
import { computePayslip } from "./compute";
import { computedSnapshot } from "../../../../scripts/payroll/dsn-computed-fixture";

const cdd = (hireDate: string, contractEndDate: string | null, plannedContractDays?: number) => ({ contract: "CDD" as const, hireDate, contractEndDate, plannedContractDays });
describe("abattement PAS des contrats courts", () => {
  it("suit l'exemple BOFiP du 15 janvier au 14 mars, sans accepter le 15 mars", () => {
    expect(shortContractPasWindowEnd("2026-01-15")).toBe("2026-03-14");
    expect(shortContractPasApplies(cdd("2026-01-15", "2026-03-14"), { year: 2026, month: 1 })).toBe(true);
    expect(shortContractPasApplies(cdd("2026-01-15", "2026-03-15"), { year: 2026, month: 1 })).toBe(false);
    expect(shortContractPasApplies(cdd("2026-07-01", "2026-08-31"), { year: 2026, month: 7 })).toBe(true);
  });
  it("applique l'abattement sur le troisième mois civil partiel d'un contrat inférieur à deux mois", () => {
    expect(shortContractPasApplies(cdd("2026-01-25", "2026-03-20"), { year: 2026, month: 3 })).toBe(true);
    expect(shortContractPasApplies(cdd("2026-01-25", "2026-03-31", 30), { year: 2026, month: 3 })).toBe(false);
    expect(shortContractPasApplies(cdd("2026-01-25", "2026-03-31", 30), { year: 2026, month: 2 })).toBe(true);
  });
  it("arrête l'abattement après la fenêtre d'embauche, même si le contrat a été prolongé", () => {
    expect(shortContractPasApplies(cdd("2026-01-01", "2026-06-30", 30), { year: 2026, month: 3 })).toBe(false);
    expect(shortContractPasApplies(cdd("2026-01-25", null, 30), { year: 2026, month: 4 })).toBe(false);
    expect(shortContractPasWindowEnd("2025-12-31")).toBe("2026-02-28");
  });
  it("exige une durée minimale connue pour un CDD à terme imprécis et refuse une durée invalide", () => {
    expect(() => shortContractPasApplies(cdd("2026-01-01", null), { year: 2026, month: 1 })).toThrow(/durée minimale/);
    expect(() => shortContractPasApplies(cdd("2026-01-01", null, -1), { year: 2026, month: 1 })).toThrow(/invalide/);
    expect(() => shortContractPasWindowEnd("2026-02-31")).toThrow(/invalide/);
  });
  it("utilise le montant daté 2026, sans abattement sur un taux personnalisé", () => {
    const { inputs } = computedSnapshot({ period: { year: 2026, month: 6 }, employee: { id: "cdd", displayName: "CDD Test", contract: "CDD", executive: false, hireDate: "2026-06-01", contractEndDate: "2026-07-15", plannedContractDays: 45 }, withholding: { mode: "DEFAULT_GRID" } });
    const neutral = computePayslip(inputs);
    expect(neutral.withholding.shortContractAllowance).toBe(766);
    expect(neutral.withholding.base).toBe(Math.max(0, Math.round((neutral.totals.netTaxable - 766) * 100) / 100));
    const personalized = computePayslip({ ...inputs, withholding: { mode: "PERSONALIZED", rate: 0.075, rateIdentifier: "123" } });
    expect(personalized.withholding.shortContractAllowance).toBe(0);
  });
  it("n'applique pas l'abattement du seul fait d'une durée inférieure à 62 jours", () => {
    const { inputs } = computedSnapshot({ employee: { id: "cdd", displayName: "CDD Test", contract: "CDD", executive: false, hireDate: "2026-01-15", contractEndDate: "2026-03-15", plannedContractDays: 60 }, withholding: { mode: "DEFAULT_GRID" } });
    expect(computePayslip(inputs).withholding.shortContractAllowance).toBe(0);
  });
});
