import { describe, expect, it } from "vitest";
import { assertDsnRetirementScope, assertDsnStableContract } from "./dsn-contract-scope";

const ordinary = { contract: "CDI" as const, hireDate: "2024-01-01", executive: false };
const period = { year: 2026, month: 1 };

describe("événements de contrat non encore déclarables", () => {
  it("rapproche le statut retraite du statut effectivement utilisé par le moteur", () => {
    expect(() => assertDsnRetirementScope(false, "04")).not.toThrow();
    expect(() => assertDsnRetirementScope(true, "01")).not.toThrow();
    expect(() => assertDsnRetirementScope(false, "01")).toThrow(/bulletin verrouillé/);
    expect(() => assertDsnRetirementScope(true, "04")).toThrow(/bulletin verrouillé/);
    expect(() => assertDsnRetirementScope(false, "02")).toThrow(/extensions cadre/);
    expect(() => assertDsnRetirementScope(false, "98")).toThrow(/autres régimes/);
  });
  it("accepte un contrat stable et une embauche au premier jour", () => {
    expect(() => assertDsnStableContract(ordinary, period, ordinary)).not.toThrow();
    expect(() => assertDsnStableContract({ ...ordinary, hireDate: "2026-01-01" }, period)).not.toThrow();
  });
  it("bloque une sortie le dernier jour même avec un salaire entier, et les rappels après sortie", () => {
    expect(() => assertDsnStableContract({ ...ordinary, contractEndDate: "2026-01-31" }, period)).toThrow(/fins de contrat/);
    expect(() => assertDsnStableContract({ ...ordinary, contractEndDate: "2025-12-31" }, period)).toThrow(/rappels après sortie/);
    expect(() => assertDsnStableContract({ ...ordinary, hireDate: "2026-01-02" }, period)).toThrow(/entrées en cours/);
  });
  it("bloque une transformation de contrat et un passage cadre non déclarés", () => {
    expect(() => assertDsnStableContract(ordinary, period, { ...ordinary, contract: "CDD" })).toThrow(/changement/);
    expect(() => assertDsnStableContract({ ...ordinary, executive: true }, period, ordinary)).toThrow(/changement/);
    expect(() => assertDsnStableContract({ ...ordinary, contractEndDate: "2026-06-30" }, period, ordinary)).toThrow(/changement/);
  });
});
