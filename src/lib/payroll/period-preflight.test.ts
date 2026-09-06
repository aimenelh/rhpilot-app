import { describe, expect, it } from "vitest";
import { checkPayrollPeriodReadiness } from "./period-preflight";

describe("contrôle de préparation d'une période de paie", () => {
  it("considère la période prête lorsque tous les profils ont les données de base", () => {
    const result = checkPayrollPeriodReadiness([
      {
        employeeId: "emp-1",
        firstName: "A",
        lastName: "Martin",
        baseSalaryCents: 200000,
        monthlyHours: 151.67,
      },
      {
        employeeId: "emp-2",
        firstName: "B",
        lastName: "Durand",
        baseSalaryCents: 230000,
        monthlyHours: 151.67,
      },
    ]);

    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("bloque lorsqu'un salaire brut manque", () => {
    const result = checkPayrollPeriodReadiness([
      {
        employeeId: "emp-1",
        firstName: "A",
        lastName: "Martin",
        baseSalaryCents: null,
        monthlyHours: 151.67,
      },
    ]);

    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "MISSING_BASE_SALARY",
        severity: "BLOCKING",
        employeeId: "emp-1",
      }),
    );
  });

  it("bloque lorsqu'une durée mensuelle manque", () => {
    const result = checkPayrollPeriodReadiness([
      {
        employeeId: "emp-1",
        firstName: "A",
        lastName: "Martin",
        baseSalaryCents: 200000,
        monthlyHours: null,
      },
    ]);

    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "MISSING_MONTHLY_HOURS",
        severity: "BLOCKING",
        employeeId: "emp-1",
      }),
    );
  });

  it("signale l'absence complète d'un profil", () => {
    const result = checkPayrollPeriodReadiness([
      {
        employeeId: "emp-1",
        firstName: "A",
        lastName: "Martin",
      },
    ]);

    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "MISSING_PAYROLL_PROFILE",
        employeeId: "emp-1",
      }),
    );
  });

  it("bloque une période sans salarié", () => {
    const result = checkPayrollPeriodReadiness([]);

    expect(result).toEqual({
      ready: false,
      issues: [
        {
          code: "NO_EMPLOYEES",
          severity: "BLOCKING",
          message: "Aucun salarié actif n'est disponible pour cette période.",
        },
      ],
    });
  });

  it("refuse des valeurs de base invalides", () => {
    const result = checkPayrollPeriodReadiness([
      {
        employeeId: "emp-1",
        firstName: "A",
        lastName: "Martin",
        baseSalaryCents: -1,
        monthlyHours: 0,
      },
    ]);

    expect(result.ready).toBe(false);
    expect(result.issues).toHaveLength(2);
  });
});
