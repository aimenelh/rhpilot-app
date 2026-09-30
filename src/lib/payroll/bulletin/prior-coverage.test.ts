import { describe, expect, it } from "vitest";
import { assertPriorPayrollCoverage, type PriorCalculation } from "./prior-state";

const data = () => ({ year: 2026, month: 3, hireDate: "2024-01-01", displayName: "Léa", calculations: [] as PriorCalculation[] });
const prior = (month: number): PriorCalculation => ({ year: 2026, month, status: "LOCKED", grossAmount: 2500, snapshot: { calculationSource: { engine: "RHPILOT_BULLETIN" }, bulletin: { totals: {}, yearToDate: {} } } });

describe("continuité des cumuls annuels", () => {
  it("bloque une reprise implicite à zéro et un trou entre deux bulletins", () => {
    expect(() => assertPriorPayrollCoverage(data())).toThrow(/01\/2026/);
    expect(() => assertPriorPayrollCoverage({ ...data(), calculations: [prior(1)] })).toThrow(/02\/2026/);
  });
  it("accepte les mois détaillés ou une reprise qui couvre les mois manquants", () => {
    expect(() => assertPriorPayrollCoverage({ ...data(), calculations: [prior(1), prior(2)] })).not.toThrow();
    expect(() => assertPriorPayrollCoverage({ ...data(), payrollOpening: { year: 2026, throughMonth: 2, cumuls: {} } })).not.toThrow();
  });
  it("ne réclame pas de paie avant l'embauche et refuse une reprise postérieure", () => {
    expect(() => assertPriorPayrollCoverage({ ...data(), hireDate: "2026-03-10" })).not.toThrow();
    expect(() => assertPriorPayrollCoverage({ ...data(), payrollOpening: { year: 2026, throughMonth: 3, cumuls: {} } })).toThrow(/01\/2026/);
  });
  it("un montant d'ancien moteur ne suffit pas à reconstituer des cotisations annuelles", () => {
    expect(() => assertPriorPayrollCoverage({ ...data(), calculations: [{ ...prior(1), snapshot: {} }, prior(2)] })).toThrow(/ancien moteur/);
  });
});
