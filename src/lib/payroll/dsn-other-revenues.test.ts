import { describe, expect, it } from "vitest";
import { computedDsnFixture, computedSnapshot } from "../../../scripts/payroll/dsn-computed-fixture";
import type { PayslipInput } from "./bulletin/types";
import { readLockedRemunerationDeclaration } from "./dsn-locked-remuneration";
import { mapLockedContributions } from "./dsn-locked-contributions";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";

const ids = { employeeNir: "1860875123456", urssafSiret: "75366412700077", retirementOps: "44832375800038" };
const everyday: Partial<PayslipInput> = {
  mealVouchers: { count: 20, faceValue: 10, employerShare: 0.6 },
  publicTransport: { monthlySubscription: 90.8, employerShare: 0.5 },
  benefitsInKind: [{ code: "BENEFIT_VEHICLE", label: "Avantage en nature véhicule", amount: 180 }],
  expenses: [
    { code: "EXPENSE_REAL", label: "Frais sur justificatifs", amount: 42.5 },
    { code: "EXPENSE_KILOMETRIC", label: "Indemnités kilométriques", amount: 60 },
    { code: "SUSTAINABLE_MOBILITY", label: "Forfait mobilités durables", amount: 25 },
  ],
};

describe("autres éléments de revenu brut (S21.G00.54)", () => {
  it("déclare titres-restaurant, transport, avantage et frais par type", () => {
    const snapshot = computedSnapshot(everyday);
    expect(readLockedRemunerationDeclaration(snapshot).otherRevenues).toEqual([
      { type: "04", amount: 180 }, { type: "07", amount: 60 }, { type: "09", amount: 42.5 },
      { type: "17", amount: 120 }, { type: "18", amount: 45.4 }, { type: "19", amount: 25 },
    ]);
  });

  it("ne bloque plus la DSN et rattache chaque élément au contrat", () => {
    const content = buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, everyday));
    expect(content).toContain("S21.G00.54.001,'17'\r\nS21.G00.54.002,'120.00'\r\nS21.G00.54.005,'CONTRAT001'");
    expect(content).toContain("S21.G00.54.001,'18'\r\nS21.G00.54.002,'45.40'");
    // L'avantage en nature reste dans le brut soumis.
    expect(content).toContain("S21.G00.51.011,'001'\r\nS21.G00.51.013,'2680.00'");
  });

  it("garde l'excédent de titres-restaurant dans le brut et déclare la participation entière", () => {
    const snapshot = computedSnapshot({ mealVouchers: { count: 20, faceValue: 13, employerShare: 0.6 } });
    const excess = snapshot.bulletin.lines.find((line) => line.code === "MEAL_VOUCHER_EXCESS")?.amount ?? 0;
    expect(excess).toBeGreaterThan(0);
    expect(readLockedRemunerationDeclaration(snapshot).otherRevenues).toEqual([{ type: "17", amount: 156 }]);
  });

  it("bloque encore les acomptes et retenues sur net", () => {
    const snapshot = computedSnapshot({ netAdjustments: [{ code: "SALARY_ADVANCE", label: "Acompte", amount: -300 }] });
    expect(() => mapLockedContributions({ snapshot, ...ids })).toThrow(/acomptes/);
  });
});
