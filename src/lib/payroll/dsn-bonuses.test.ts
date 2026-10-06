import { describe, expect, it } from "vitest";
import { computedDsnFixture, computedSnapshot } from "../../../scripts/payroll/dsn-computed-fixture";
import { mapPayrollVariables, readDsnBonusDeclaration } from "./bulletin/inputs";
import { readLockedRemunerationDeclaration } from "./dsn-locked-remuneration";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";

const variable = { id: "v1", code: "YEAR_END_BONUS", label: "13e mois", amount: 2500, unit: "EUR" };

describe("primes non mensuelles : saisie de la nature DSN", () => {
  it("exige la nature et la période d'une prime liée à l'activité avant le calcul", () => {
    expect(mapPayrollVariables([variable], [], "2026-12-31").errors[0]).toMatch(/nature DSN/);
    expect(mapPayrollVariables([{ ...variable, dsnBonusType: "027" }], [], "2026-12-31").errors[0]).toMatch(/période de travail/);
    expect(mapPayrollVariables([{ ...variable, dsnBonusType: "026", attachmentStart: "2026-10-01", attachmentEnd: null }], [], "2026-12-31").errors[0]).toMatch(/début et une fin/);
  });

  it("accepte une prime non liée à l'activité sans période", () => {
    const mapped = mapPayrollVariables([{ ...variable, code: "EXCEPTIONAL_BONUS", label: "Prime exceptionnelle", dsnBonusType: "028" }], [], "2026-12-31");
    expect(mapped.errors).toEqual([]);
    expect(mapped.bonuses[0]).toMatchObject({ excludedFromPaidLeaveBase: true, dsn: { type: "028", attachmentStart: null, attachmentEnd: null } });
  });

  it("refuse une période inversée, future ou une nature hors nomenclature", () => {
    expect(readDsnBonusDeclaration({ dsnBonusType: "027", attachmentStart: "2026-12-31", attachmentEnd: "2026-01-01" }, "13e mois", "2026-12-31")).toMatchObject({ error: expect.stringMatching(/avant de commencer/) });
    expect(readDsnBonusDeclaration({ dsnBonusType: "027", attachmentStart: "2027-01-01", attachmentEnd: "2027-12-31" }, "13e mois", "2026-12-31")).toMatchObject({ error: expect.stringMatching(/après le mois de paie/) });
    expect(readDsnBonusDeclaration({ dsnBonusType: "046", attachmentStart: null, attachmentEnd: null }, "13e mois", "2026-12-31")).toMatchObject({ error: expect.stringMatching(/nature DSN/) });
  });

  it("n'exige rien pour une prime à zéro ni pour un aperçu sans mois de paie", () => {
    expect(mapPayrollVariables([{ ...variable, amount: 0 }], [], "2026-12-31")).toMatchObject({ errors: [], bonuses: [] });
    expect(mapPayrollVariables([variable], []).errors).toEqual([]);
  });
});

describe("primes non mensuelles : DSN S21.G00.52", () => {
  const thirteenth = { code: "YEAR_END_BONUS", label: "13e mois", amount: 2500, excludedFromPaidLeaveBase: true, dsn: { type: "027" as const, attachmentStart: "2025-01-01" as const, attachmentEnd: "2025-12-31" as const } };

  it("reprend le montant de la ligne figée et la période saisie", () => {
    const snapshot = computedSnapshot({ bonuses: [thirteenth] });
    expect(readLockedRemunerationDeclaration(snapshot).bonuses).toEqual([{ type: "027", amount: 2500, start: "2025-01-01", end: "2025-12-31" }]);
  });

  it("garde la prime dans le brut, les droits chômage et le salaire rétabli, hors salaire de base", () => {
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, { bonuses: [thirteenth] });
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.52.001,'027'\r\nS21.G00.52.002,'2500.00'\r\nS21.G00.52.003,'01012025'\r\nS21.G00.52.004,'31122025'\r\nS21.G00.52.006,'CONTRAT001'");
    expect(content).toContain("S21.G00.51.011,'001'\r\nS21.G00.51.013,'5000.00'");
    expect(content).toContain("S21.G00.51.011,'010'\r\nS21.G00.51.013,'2500.00'");
    expect(data.employees[0].payroll.unemploymentRemuneration).toBe(5000);
  });

  it("déclare une prime non liée à l'activité sans période de rattachement", () => {
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, {
      bonuses: [{ code: "EXCEPTIONAL_BONUS", label: "Prime de naissance", amount: 150, excludedFromPaidLeaveBase: true, dsn: { type: "028", attachmentStart: null, attachmentEnd: null } }],
    });
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.52.001,'028'\r\nS21.G00.52.002,'150.00'\r\nS21.G00.52.006,'CONTRAT001'");
  });

  it("refuse une prime figée dont le montant ne correspond plus au bulletin", () => {
    const snapshot = computedSnapshot({ bonuses: [thirteenth] });
    snapshot.inputs.bonuses![0].amount = 2400;
    expect(() => readLockedRemunerationDeclaration(snapshot)).toThrow(/diverge/);
  });
});
