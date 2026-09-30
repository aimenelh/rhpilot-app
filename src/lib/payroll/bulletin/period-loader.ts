/**
 * Lectures en base propres au moteur de bulletin (colonnes ajoutées par SQL
 * brut, reprises, solde de tout compte, calculs antérieurs).
 */
import { validateMaintenanceRule } from "./maintenance-settings";
import type { SickPayRule } from "./params";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PasTerritory } from "./params";
import type { PaidLeaveBalances, TerminationReason } from "./types";
import type { PaidLeaveOpening, PayrollOpening, PriorCalculation } from "./prior-state";

export type OrganizationBulletinSettings = {
  sickPayRule?: SickPayRule;
  workAccidentPayRule?: SickPayRule;
  payrollHeadcount: number | null;
  mobilityRatePercent: number | null;
  ijssSubrogation: boolean;
  paidLeaveMethod: "OUVRABLES" | "OUVRES";
  workedSolidarityDay: boolean;
  prevoyanceRates: unknown;
  mealVoucherFaceValue: number | null;
  mealVoucherEmployerShare: number | null;
  transportEmployerShare: number;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export async function loadOrganizationBulletinSettings(organizationId: string): Promise<OrganizationBulletinSettings> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT "sickPayRule", "workAccidentPayRule", "payrollHeadcount", "mobilityRate", "ijssSubrogation", "paidLeaveMethod", "workedSolidarityDay", "prevoyanceRates",
           "mealVoucherFaceValue", "mealVoucherEmployerShare", "transportEmployerShare"
    FROM "organizations" WHERE "id" = ${organizationId} LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error("Organisation introuvable.");
  return {
    sickPayRule: validateMaintenanceRule(row.sickPayRule, "sickPayRule"),
    workAccidentPayRule: validateMaintenanceRule(row.workAccidentPayRule, "workAccidentPayRule"),
    payrollHeadcount: toNumber(row.payrollHeadcount),
    mobilityRatePercent: toNumber(row.mobilityRate),
    ijssSubrogation: row.ijssSubrogation !== false,
    paidLeaveMethod: row.paidLeaveMethod === "OUVRES" ? "OUVRES" : "OUVRABLES",
    workedSolidarityDay: row.workedSolidarityDay === true,
    prevoyanceRates: row.prevoyanceRates ?? null,
    mealVoucherFaceValue: toNumber(row.mealVoucherFaceValue),
    mealVoucherEmployerShare: toNumber(row.mealVoucherEmployerShare),
    transportEmployerShare: toNumber(row.transportEmployerShare) ?? 0.5,
  };
}

/** Territoire du barème PAS et régime local, déduits du département de l'établissement. */
export function territoryFromDepartment(department: string): { territory: PasTerritory; alsaceMoselle: boolean } {
  // Le département est saisi en code (« 57 ») ou en toutes lettres (« Moselle »).
  const code = department.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^(la |le )/, "").replace(/\s+/g, "-");
  if (["971", "972", "974", "guadeloupe", "martinique", "reunion"].includes(code)) return { territory: "ANTILLES_REUNION", alsaceMoselle: false };
  if (["973", "976", "guyane", "mayotte"].includes(code)) return { territory: "GUYANE_MAYOTTE", alsaceMoselle: false };
  return { territory: "METROPOLE", alsaceMoselle: ["57", "67", "68", "moselle", "bas-rhin", "haut-rhin"].includes(code) };
}

export type ProfileBulletinExtras = { weeklySchedule: unknown; structuralOvertimeHours: number | null; structuralOvertimeRate: number | null; healthPlanWaiver: boolean };

export async function loadProfileBulletinExtras(profileIds: string[]): Promise<Map<string, ProfileBulletinExtras>> {
  if (profileIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ id: string; weeklySchedule: unknown; structuralOvertimeHours: unknown; structuralOvertimeRate: unknown; healthPlanWaiver: boolean | null }>>`
    SELECT "id", "weeklySchedule", "structuralOvertimeHours", "structuralOvertimeRate", "healthPlanWaiver"
    FROM "payroll_profiles" WHERE "id" IN (${Prisma.join(profileIds)})
  `;
  return new Map(rows.map((row) => [row.id, { weeklySchedule: row.weeklySchedule ?? null, structuralOvertimeHours: toNumber(row.structuralOvertimeHours), structuralOvertimeRate: toNumber(row.structuralOvertimeRate), healthPlanWaiver: row.healthPlanWaiver === true }]));
}

export async function loadPaidLeaveOpenings(organizationId: string, employeeIds: string[], periodFirst: Date): Promise<Map<string, PaidLeaveOpening>> {
  if (employeeIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { employeeId: string; asOf: Date }>>`
    SELECT DISTINCT ON ("employeeId") "employeeId", "asOf", "previousAcquired", "previousTaken", "currentAcquired", "currentTaken",
           "referenceGross", "referenceAcquiredDays", "currentReferenceGross"
    FROM "employee_paid_leave_openings"
    WHERE "organizationId" = ${organizationId} AND "employeeId" IN (${Prisma.join(employeeIds)}) AND "asOf" <= ${periodFirst}
    ORDER BY "employeeId", "asOf" DESC
  `;
  const map = new Map<string, PaidLeaveOpening>();
  for (const row of rows) {
    const balances: PaidLeaveBalances = {
      previousAcquired: toNumber(row.previousAcquired) ?? 0,
      previousTaken: toNumber(row.previousTaken) ?? 0,
      currentAcquired: toNumber(row.currentAcquired) ?? 0,
      currentTaken: toNumber(row.currentTaken) ?? 0,
      referenceGross: toNumber(row.referenceGross),
      referenceAcquiredDays: toNumber(row.referenceAcquiredDays),
      currentReferenceGross: toNumber(row.currentReferenceGross),
    };
    map.set(row.employeeId, { asOf: row.asOf.toISOString().slice(0, 10), balances });
  }
  return map;
}

export async function loadPayrollOpenings(organizationId: string, employeeIds: string[], year: number): Promise<Map<string, PayrollOpening>> {
  if (employeeIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ employeeId: string; year: number; throughMonth: number; cumuls: unknown; sickPayHistory: unknown }>>`
    SELECT "employeeId", "year", "throughMonth", "cumuls", "sickPayHistory"
    FROM "employee_payroll_openings"
    WHERE "organizationId" = ${organizationId} AND "employeeId" IN (${Prisma.join(employeeIds)}) AND "year" = ${year}
  `;
  return new Map(rows.map((row) => [row.employeeId, { year: Number(row.year), throughMonth: Number(row.throughMonth), cumuls: row.cumuls, sickPayHistory: row.sickPayHistory }]));
}

export type StoredTermination = {
  employeeId: string;
  reason: TerminationReason;
  noticeCompensation: number | null;
  severanceAmount: number | null;
  severanceLegalMinimum: number | null;
  previousYearGross: number | null;
  eligibleForFullPension: boolean;
  cddEndAllowanceMode: "AUTO" | "NONE" | "AMOUNT";
  cddEndAllowanceAmount: number | null;
  cddEndAllowanceRate: number | null;
  paidLeaveCompensationAmount: number | null;
};

export async function loadTerminations(organizationId: string, periodId: string): Promise<Map<string, StoredTermination>> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { employeeId: string; reason: TerminationReason }>>`
    SELECT "employeeId", "reason", "noticeCompensation", "severanceAmount", "severanceLegalMinimum", "previousYearGross", "eligibleForFullPension",
           "cddEndAllowanceMode", "cddEndAllowanceAmount", "cddEndAllowanceRate", "paidLeaveCompensationAmount"
    FROM "payroll_terminations" WHERE "organizationId" = ${organizationId} AND "payrollPeriodId" = ${periodId}
  `;
  return new Map(rows.map((row) => [row.employeeId, {
    employeeId: row.employeeId,
    reason: row.reason,
    noticeCompensation: toNumber(row.noticeCompensation),
    severanceAmount: toNumber(row.severanceAmount),
    severanceLegalMinimum: toNumber(row.severanceLegalMinimum),
    previousYearGross: toNumber(row.previousYearGross),
    eligibleForFullPension: row.eligibleForFullPension === true,
    cddEndAllowanceMode: row.cddEndAllowanceMode === "NONE" ? "NONE" : row.cddEndAllowanceMode === "AMOUNT" ? "AMOUNT" : "AUTO",
    cddEndAllowanceAmount: toNumber(row.cddEndAllowanceAmount),
    cddEndAllowanceRate: toNumber(row.cddEndAllowanceRate),
    paidLeaveCompensationAmount: toNumber(row.paidLeaveCompensationAmount),
  }]));
}

/** Calculs des 24 derniers mois des salariés, avec le statut de leur période. */
export async function loadPriorCalculations(organizationId: string, employeeIds: string[], year: number, month: number): Promise<Map<string, PriorCalculation[]>> {
  const map = new Map<string, PriorCalculation[]>();
  if (employeeIds.length === 0) return map;
  const periods = await prisma.payrollPeriod.findMany({
    where: { organizationId, year: { gte: year - 2, lte: year } },
    select: { id: true, year: true, month: true, status: true },
  });
  const current = year * 12 + month - 1;
  const relevant = periods.filter((period) => {
    const index = period.year * 12 + period.month - 1;
    return index < current && index >= current - 24;
  });
  if (relevant.length === 0) return map;
  const byId = new Map(relevant.map((period) => [period.id, period]));
  const calculations = await prisma.payrollCalculation.findMany({
    where: { organizationId, employeeId: { in: employeeIds }, payrollPeriodId: { in: relevant.map((period) => period.id) } },
    select: { employeeId: true, payrollPeriodId: true, grossAmount: true, calculationSnapshot: true },
  });
  for (const calculation of calculations) {
    const period = byId.get(calculation.payrollPeriodId);
    if (!period) continue;
    const list = map.get(calculation.employeeId) ?? [];
    list.push({ year: period.year, month: period.month, status: period.status, grossAmount: Number(calculation.grossAmount), snapshot: calculation.calculationSnapshot });
    map.set(calculation.employeeId, list);
  }
  return map;
}

/** Arrêts maladie et AT validés terminés avant la période, pour relier les prolongations. */
export async function loadEarlierSickAbsences(organizationId: string, employeeIds: string[], periodStart: Date) {
  if (employeeIds.length === 0) return [];
  const since = new Date(periodStart.getTime() - 400 * 86_400_000);
  return prisma.absence.findMany({
    where: { organizationId, employeeId: { in: employeeIds }, status: "VALIDATED", type: { in: ["SICK_LEAVE", "WORK_ACCIDENT"] }, endDate: { gte: since, lt: periodStart } },
    select: { id: true, employeeId: true, type: true, startDate: true, endDate: true },
  });
}
