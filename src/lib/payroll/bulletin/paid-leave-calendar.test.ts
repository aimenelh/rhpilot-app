import { describe, expect, it } from "vitest";
import { FULL_TIME_SCHEDULE, paidLeaveDaysForAbsence, publicHolidays, type WeeklySchedule } from "./calendar";
import { computePayslip } from "./compute";
import { resolvePriorState } from "./prior-state";
import { parsePayrollSettingsForm } from "./settings-form";
import type { PayslipInput } from "./types";

const companyWorkingDays = [true, true, true, true, true, false, false];
const holidays = publicHolidays(2026);
const common = { absenceStart: "2026-08-10", absenceEnd: "2026-08-14", windowStart: "2026-08-01", windowEnd: "2026-08-31", holidays, companyWorkingDays };

describe("calendrier de congés de l'entreprise", () => {
  it("décompte cinq jours ouvrés pour une semaine d'un temps partiel sur trois jours", () => {
    expect(paidLeaveDaysForAbsence({ ...common, method: "OUVRES", schedule: [8, 8, 0, 8, 0, 0, 0] })).toBe(5);
  });
  it("décompte le repos du mercredi entre une absence mardi et une reprise jeudi", () => {
    expect(paidLeaveDaysForAbsence({ ...common, absenceStart: "2026-08-11", absenceEnd: "2026-08-11", method: "OUVRES", schedule: [8, 8, 0, 8, 0, 0, 0] })).toBe(2);
  });
  it("compte un calendrier d'entreprise du mardi au samedi", () => {
    expect(paidLeaveDaysForAbsence({ ...common, absenceStart: "2026-09-08", absenceEnd: "2026-09-12", windowStart: "2026-09-01", windowEnd: "2026-09-30", companyWorkingDays: [false, true, true, true, true, true, false], method: "OUVRES", schedule: [0, 8, 0, 8, 8, 0, 0] })).toBe(5);
  });
  it("conserve le samedi du mois suivant sans compter deux fois le vendredi", () => {
    const input = { ...common, absenceStart: "2026-07-31", absenceEnd: "2026-07-31", method: "OUVRABLES" as const, schedule: FULL_TIME_SCHEDULE };
    expect(paidLeaveDaysForAbsence({ ...input, windowStart: "2026-07-01", windowEnd: "2026-07-31" })).toBe(1);
    expect(paidLeaveDaysForAbsence(input)).toBe(1);
  });
  it("utilise le planning en vigueur à la reprise", () => {
    const nextSchedule: WeeklySchedule = [0, 8, 0, 8, 8, 0, 0];
    expect(paidLeaveDaysForAbsence({ ...common, absenceStart: "2026-07-31", absenceEnd: "2026-07-31", method: "OUVRABLES", schedule: FULL_TIME_SCHEDULE, scheduleAt: day => day < "2026-08-01" ? FULL_TIME_SCHEDULE : nextSchedule })).toBe(2);
  });
  it("refuse un calendrier ouvré absent ou un planning futur inconnu", () => {
    expect(() => paidLeaveDaysForAbsence({ ...common, companyWorkingDays: null, method: "OUVRES", schedule: FULL_TIME_SCHEDULE })).toThrow(/cinq jours/);
    expect(() => paidLeaveDaysForAbsence({ ...common, method: "OUVRABLES", schedule: FULL_TIME_SCHEDULE, scheduleAt: () => null })).toThrow(/confirmer/);
  });
  it("exige le calendrier explicite à l'enregistrement des paramètres ouvrés", () => {
    expect(() => parsePayrollSettingsForm(name => name === "paidLeaveMethod" ? "OUVRES" : null)).toThrow(/cinq jours/);
  });
});

describe("indemnité d'un congé traversant deux mois", () => {
  const input = (month: number): PayslipInput => ({ period: { year: 2026, month }, organization: { headcount: 4, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE", healthPlan: null, ijssSubrogation: false, paidLeaveMethod: "OUVRABLES" }, employee: { id: "e1", displayName: "Léa", contract: "CDI", executive: false, hireDate: "2023-01-01" }, pay: { monthlyBaseSalary: 2500, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE }, withholding: { mode: "PERSONALIZED", rate: 0 }, paidLeave: { previousAcquired: 30, previousTaken: 0, currentAcquired: 5, currentTaken: 0, referenceGross: 30000, referenceAcquiredDays: 30 }, absences: [{ id: "cp1", kind: "PAID_LEAVE", start: "2026-07-31", end: "2026-07-31" }] });
  it("compare le dixième et le maintien sur le congé entier, puis déduit ce qui est déjà payé", () => {
    const july = computePayslip(input(7));
    const prior = resolvePriorState({ year: 2026, month: 8, hireDate: "2023-01-01", displayName: "Léa", calculations: [{ year: 2026, month: 7, status: "LOCKED", grossAmount: july.totals.grossTotal, snapshot: { calculationSource: { engine: "RHPILOT_BULLETIN" }, bulletin: july } }] });
    const august = computePayslip({ ...input(8), yearToDate: july.yearToDate, paidLeave: prior.paidLeave, priorPaidLeaveIndemnities: prior.paidLeaveIndemnities });
    expect(july.paidLeave?.daysTaken).toBe(1);
    expect(august.paidLeave?.daysTaken).toBe(1);
    const paid = (july.lines.find(line => line.code === "CP_INDEMNITY")?.amount ?? 0) + (august.lines.find(line => line.code === "CP_INDEMNITY")?.amount ?? 0);
    expect(paid).toBeCloseTo(200, 2);
  });
});
