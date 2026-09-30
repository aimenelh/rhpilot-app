import { describe, expect, it } from "vitest";
import { computePayslip } from "./compute";
import { FULL_TIME_SCHEDULE } from "./calendar";
import { LEGAL_SICK_PAY, LEGAL_WORK_ACCIDENT_PAY, type SickPayRule } from "./params";
import { parseMaintenanceForm, validateMaintenanceRule, MAINTENANCE_SENIORITY_YEARS } from "./maintenance-settings";
import { parsePayrollSettingsForm } from "./settings-form";
import type { PayslipInput } from "./types";

const agreement: SickPayRule = { ...LEGAL_SICK_PAY, minSeniorityMonths: 0, waitingDays: 0, fullRate: 1, reducedRate: 1, source: "Accord d'entreprise du 01/01/2026, article 4", tiers: [{ minSeniorityYears: 0, fullRateDays: 90, reducedRateDays: 90 }] };
function input(rule?: SickPayRule): PayslipInput {
  return {
    period: { year: 2026, month: 3 },
    organization: { headcount: 4, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE", healthPlan: null, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES", sickPayRule: rule },
    employee: { id: "synthetic", displayName: "Salarié test", contract: "CDI", executive: false, hireDate: "2026-01-01" },
    pay: { monthlyBaseSalary: 2500, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
    absences: [{ id: "sick", kind: "SICK_LEAVE", start: "2026-03-02", end: "2026-03-06", ijssGrossAmount: 100 }],
    withholding: { mode: "PERSONALIZED", rate: 0 },
  };
}

describe("maintien conventionnel enregistré et calculé", () => {
  it("maintient à 100 % dès l'embauche, déduit les IJSS et affiche le taux réellement appliqué", () => {
    const legal = computePayslip(input());
    expect(legal.lines.some((line) => line.code === "SICK_MAINTENANCE")).toBe(false);
    const result = computePayslip(input(agreement));
    const deduction = result.lines.find((line) => line.code === "ABS_SICK_LEAVE")!;
    const maintenance = result.lines.find((line) => line.code === "SICK_MAINTENANCE")!;
    expect(maintenance.amount).toBeCloseTo(-deduction.amount! - 100, 2);
    expect(maintenance.label).toContain("100 %");
    expect(maintenance.source).toBe(agreement.source);
    expect(result.sickPayUsed.fullRateDaysUsed).toBe(5);
    expect(result.warnings.some((warning) => warning.includes("le maintien de salaire légal a été appliqué"))).toBe(false);
  });

  it("refuse une règle défavorable même lorsqu'elle contourne le formulaire", () => {
    expect(() => computePayslip(input({ ...agreement, fullRate: 0.8 }))).toThrow(/minimum légal/);
    expect(() => validateMaintenanceRule({ ...agreement, tiers: [{ minSeniorityYears: 0, fullRateDays: 90, reducedRateDays: 29 }] }, "sickPayRule")).toThrow(/minimum légal/);
    expect(() => validateMaintenanceRule({ ...LEGAL_WORK_ACCIDENT_PAY, waitingDays: 1 }, "workAccidentPayRule")).toThrow(/carence/);
  });

  it("applique l'historique des jours indemnisés à la règle conventionnelle", () => {
    const data = input(agreement);
    data.sickPayHistory = { fullRateDaysUsed: 89, reducedRateDaysUsed: 90 };
    const result = computePayslip(data);
    expect(result.sickPayUsed).toEqual({ fullRateDaysUsed: 1, reducedRateDaysUsed: 0 });
  });

  it("relit les valeurs du formulaire en fractions et exige une référence", () => {
    const values: Record<string, string> = { "sickPayRule.enabled": "1", "sickPayRule.minSeniorityMonths": "0", "sickPayRule.waitingDays": "0", "sickPayRule.fullRate": "100", "sickPayRule.reducedRate": "100", "sickPayRule.source": agreement.source };
    for (const years of MAINTENANCE_SENIORITY_YEARS) { values[`sickPayRule.tiers.${years}.fullRateDays`] = "90"; values[`sickPayRule.tiers.${years}.reducedRateDays`] = "90"; }
    expect(parseMaintenanceForm((key) => values[key] ?? null, "sickPayRule")).toMatchObject({ fullRate: 1, waitingDays: 0, source: agreement.source });
    values["sickPayRule.source"] = "";
    expect(() => parseMaintenanceForm((key) => values[key] ?? null, "sickPayRule")).toThrow(/référence/);
    values["sickPayRule.enabled"] = "0";
    expect(parseMaintenanceForm((key) => values[key] ?? null, "sickPayRule")).toBeNull();
  });

  it("conserve les deux décimales de l'effectif et refuse une précision supplémentaire", () => {
    expect(parsePayrollSettingsForm((key) => key === "payrollHeadcount" ? "10,99" : null).payrollHeadcount).toBe(10.99);
    expect(() => parsePayrollSettingsForm((key) => key === "payrollHeadcount" ? "10.999" : null)).toThrow(/deux décimales/);
    const below = input();
    below.organization.headcount = 10.99;
    const over = input();
    over.organization.headcount = 11;
    expect(computePayslip(below).lines.find((line) => line.code === "FORMATION")?.employerRate).toBe(0.0055);
    expect(computePayslip(over).lines.find((line) => line.code === "FORMATION")?.employerRate).toBe(0.01);
    below.organization.headcount = 0;
    expect(() => computePayslip(below)).not.toThrow();
  });
});
