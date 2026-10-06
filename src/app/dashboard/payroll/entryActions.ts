"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBulletinVariable } from "@/lib/payroll/bulletin/variables";
import { readDsnBonusDeclaration } from "@/lib/payroll/bulletin/inputs";
import { RECURRING_CODES, entryTabOf, parseCellInput } from "@/lib/payroll/entry-grid";
import { calculatePayrollPeriod } from "@/lib/payroll/payroll-period-calculation";
import { getPayrollMembership } from "@/lib/payrollAccess";
import { userFacingError } from "@/lib/userFacingError";

export type EntryActionResult = { ok: true; count?: number } | { error: string; cellErrors?: Record<string, string> };

type Context = { organizationId: string; userId: string; period: { id: string; year: number; month: number; status: string } };

async function context(periodId: string, options: { draftOnly?: boolean } = {}): Promise<Context> {
  const membership = await getPayrollMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Session expirée, veuillez recharger la page.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) throw new Error("Seuls les administrateurs peuvent préparer la paie.");
  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId: membership.organizationId }, select: { id: true, year: true, month: true, status: true } });
  if (!period) throw new Error("Période de paie introuvable.");
  if (options.draftOnly && period.status !== "DRAFT") throw new Error("La saisie est fermée : revenez à la saisie pour modifier ce mois.");
  return { organizationId: membership.organizationId, userId: user.id, period };
}

function bounds(year: number, month: number) {
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)) };
}

async function activeEmployeeIds(organizationId: string, year: number, month: number, ids: string[]): Promise<Set<string>> {
  const { start, end } = bounds(year, month);
  const employees = await prisma.employee.findMany({
    where: { organizationId, id: { in: ids }, deletedAt: null, hireDate: { lte: end }, OR: [{ contractEndDate: null }, { contractEndDate: { gte: start } }] },
    select: { id: true },
  });
  return new Set(employees.map((employee) => employee.id));
}

function refresh(periodId: string) {
  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath("/dashboard/payroll");
}

const failure = (error: unknown): EntryActionResult => ({ error: userFacingError(error, "L'enregistrement a échoué.") });

/** Enregistre une ou plusieurs cellules du tableau de saisie (frappe ou collage). */
export async function saveEntryCells(periodId: string, cells: Array<{ employeeId: string; code: string; raw: string }>): Promise<EntryActionResult> {
  try {
    if (!Array.isArray(cells) || cells.length === 0) return { ok: true, count: 0 };
    if (cells.length > 2000) return { error: "Le bloc collé est trop grand." };
    const { organizationId, userId, period } = await context(periodId, { draftOnly: true });
    const cellErrors: Record<string, string> = {};
    const valid: Array<{ employeeId: string; code: string; value: number | null; unit: string; label: string }> = [];
    for (const cell of cells) {
      const definition = getBulletinVariable(cell.code);
      if (!definition || !entryTabOf(definition.code)) { cellErrors[`${cell.employeeId}:${cell.code}`] = "Élément non saisissable ici."; continue; }
      const parsed = parseCellInput(String(cell.raw ?? ""), definition.unit);
      if ("error" in parsed) { cellErrors[`${cell.employeeId}:${cell.code}`] = parsed.error; continue; }
      valid.push({ employeeId: cell.employeeId, code: definition.code, value: parsed.value, unit: definition.unit, label: definition.label });
    }
    const active = await activeEmployeeIds(organizationId, period.year, period.month, [...new Set(valid.map((cell) => cell.employeeId))]);
    const accepted = valid.filter((cell) => {
      if (active.has(cell.employeeId)) return true;
      cellErrors[`${cell.employeeId}:${cell.code}`] = "Salarié hors de cette période.";
      return false;
    });
    // Deux requêtes pour tout le bloc (suppression groupée puis insertion groupée), au lieu de
    // deux par cellule : un grand collage ne dépasse plus le délai de la transaction.
    const unique = new Map(accepted.map((cell) => [`${cell.employeeId}:${cell.code}`, cell]));
    const cellsToSave = [...unique.values()];
    if (cellsToSave.length > 0) {
      // Une prime non mensuelle ressaisie garde sa nature DSN et sa période de rattachement.
      const kept = await prisma.payrollVariable.findMany({
        where: { organizationId, payrollPeriodId: period.id, reference: null, dsnBonusType: { not: null }, OR: cellsToSave.map((cell) => ({ employeeId: cell.employeeId, code: cell.code })) },
        select: { employeeId: true, code: true, dsnBonusType: true, attachmentStart: true, attachmentEnd: true },
      });
      const declarations = new Map(kept.map((row) => [`${row.employeeId}:${row.code}`, { dsnBonusType: row.dsnBonusType, attachmentStart: row.attachmentStart, attachmentEnd: row.attachmentEnd }]));
      await prisma.$transaction([
        prisma.payrollVariable.deleteMany({
          where: { organizationId, payrollPeriodId: period.id, reference: null, OR: cellsToSave.map((cell) => ({ employeeId: cell.employeeId, code: cell.code })) },
        }),
        prisma.payrollVariable.createMany({
          data: cellsToSave
            .filter((cell) => cell.value !== null)
            .map((cell) => ({ id: randomUUID(), organizationId, payrollPeriodId: period.id, employeeId: cell.employeeId, code: cell.code, label: cell.label, amount: cell.value as number, unit: cell.unit, source: "MANUAL", ...declarations.get(`${cell.employeeId}:${cell.code}`) })),
        }),
        prisma.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action: "payroll.entry.saved", entityType: "PayrollPeriod", entityId: period.id, metadata: { cells: cellsToSave.length } } }),
      ]);
    }
    refresh(period.id);
    if (Object.keys(cellErrors).length > 0) return { error: "Certaines valeurs n'ont pas été enregistrées.", cellErrors };
    return { ok: true, count: accepted.length };
  } catch (error) {
    return failure(error);
  }
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Nature S21.G00.52.001 et période de rattachement d'une prime non mensuelle saisie. */
export async function saveBonusDsnDeclaration(periodId: string, employeeId: string, code: string, raw: { type: string; start: string; end: string }): Promise<EntryActionResult> {
  try {
    const { organizationId, userId, period } = await context(periodId, { draftOnly: true });
    const definition = getBulletinVariable(code);
    if (!definition || definition.kind !== "BONUS_ANNUAL") return { error: "Cet élément n'est pas une prime non mensuelle." };
    const start = raw.start?.trim() || null;
    const end = raw.end?.trim() || null;
    if ((start && !ISO_DAY.test(start)) || (end && !ISO_DAY.test(end))) return { error: "Date invalide." };
    const last = new Date(Date.UTC(period.year, period.month, 0)).toISOString().slice(0, 10);
    const checked = readDsnBonusDeclaration({ dsnBonusType: raw.type, attachmentStart: start, attachmentEnd: end }, definition.label, last);
    if ("error" in checked) return { error: checked.error };
    const variable = await prisma.payrollVariable.findFirst({ where: { organizationId, payrollPeriodId: period.id, employeeId, code: definition.code, reference: null }, select: { id: true } });
    if (!variable) return { error: "Saisissez d'abord le montant de la prime." };
    await prisma.$transaction([
      prisma.payrollVariable.update({ where: { id: variable.id }, data: {
        dsnBonusType: checked.value.type,
        attachmentStart: checked.value.attachmentStart ? new Date(`${checked.value.attachmentStart}T00:00:00.000Z`) : null,
        attachmentEnd: checked.value.attachmentEnd ? new Date(`${checked.value.attachmentEnd}T00:00:00.000Z`) : null,
      } }),
      prisma.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action: "payroll.bonus_dsn.saved", entityType: "PayrollPeriod", entityId: period.id, metadata: { employeeId, code: definition.code, type: checked.value.type } } }),
    ]);
    refresh(period.id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** IJSS brutes de l'attestation de la CPAM, rattachées à l'arrêt concerné. */
export async function saveIjssAmount(periodId: string, employeeId: string, absenceId: string, raw: string): Promise<EntryActionResult> {
  try {
    const { organizationId, userId, period } = await context(periodId, { draftOnly: true });
    const parsed = parseCellInput(String(raw ?? ""), "EUR");
    if ("error" in parsed) return { error: parsed.error };
    const { start, end } = bounds(period.year, period.month);
    const absence = await prisma.absence.findFirst({
      where: { id: absenceId, organizationId, employeeId, status: "VALIDATED", type: { in: ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"] }, startDate: { lte: end }, endDate: { gte: start } },
      select: { id: true },
    });
    if (!absence) return { error: "Cet arrêt n'est pas un arrêt indemnisable validé sur la période." };
    const definition = getBulletinVariable("IJSS_GROSS")!;
    await prisma.$transaction(async (tx) => {
      await tx.payrollVariable.deleteMany({ where: { organizationId, payrollPeriodId: period.id, employeeId, code: "IJSS_GROSS", reference: absence.id } });
      if (parsed.value !== null) await tx.payrollVariable.create({ data: { id: randomUUID(), organizationId, payrollPeriodId: period.id, employeeId, code: "IJSS_GROSS", label: definition.label, amount: parsed.value, unit: "EUR", source: "MANUAL", reference: absence.id } });
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action: "payroll.entry.ijss.saved", entityType: "PayrollPeriod", entityId: period.id, metadata: { employeeId, absenceId: absence.id, amount: parsed.value } } });
    });
    refresh(period.id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Reprend les éléments récurrents du mois précédent dans les cellules encore vides. */
export async function copyPreviousMonthEntries(periodId: string): Promise<EntryActionResult> {
  try {
    const { organizationId, userId, period } = await context(periodId, { draftOnly: true });
    const previousYear = period.month === 1 ? period.year - 1 : period.year;
    const previousMonth = period.month === 1 ? 12 : period.month - 1;
    const previous = await prisma.payrollPeriod.findUnique({ where: { organizationId_year_month: { organizationId, year: previousYear, month: previousMonth } }, select: { id: true } });
    if (!previous) return { error: "Aucune paie n'existe pour le mois précédent." };
    const [source, existing] = await Promise.all([
      prisma.payrollVariable.findMany({ where: { organizationId, payrollPeriodId: previous.id, reference: null, code: { in: [...RECURRING_CODES] } }, select: { employeeId: true, code: true, label: true, amount: true, unit: true } }),
      prisma.payrollVariable.findMany({ where: { organizationId, payrollPeriodId: period.id, reference: null }, select: { employeeId: true, code: true } }),
    ]);
    const active = await activeEmployeeIds(organizationId, period.year, period.month, [...new Set(source.map((row) => row.employeeId))]);
    const filled = new Set(existing.map((row) => `${row.employeeId}:${row.code}`));
    const totals = new Map<string, { employeeId: string; code: string; label: string; unit: string; amount: number }>();
    for (const row of source) {
      const key = `${row.employeeId}:${row.code}`;
      if (!active.has(row.employeeId) || filled.has(key)) continue;
      const current = totals.get(key) ?? { employeeId: row.employeeId, code: row.code, label: row.label, unit: row.unit, amount: 0 };
      current.amount += Number(row.amount);
      totals.set(key, current);
    }
    const rows = [...totals.values()].filter((row) => row.amount > 0);
    if (rows.length === 0) return { ok: true, count: 0 };
    await prisma.$transaction(async (tx) => {
      await tx.payrollVariable.createMany({ data: rows.map((row) => ({ id: randomUUID(), organizationId, payrollPeriodId: period.id, employeeId: row.employeeId, code: row.code, label: row.label, amount: Math.round(row.amount * 100) / 100, unit: row.unit, source: "IMPORT" })) });
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action: "payroll.entry.copied_previous_month", entityType: "PayrollPeriod", entityId: period.id, metadata: { fromPeriodId: previous.id, cells: rows.length } } });
    });
    refresh(period.id);
    return { ok: true, count: rows.length };
  } catch (error) {
    return failure(error);
  }
}

/** Coche ou décoche « saisie vérifiée » pour un salarié. */
export async function setEntryReviewed(periodId: string, employeeId: string, reviewed: boolean): Promise<EntryActionResult> {
  try {
    const { organizationId, userId, period } = await context(periodId, { draftOnly: true });
    const active = await activeEmployeeIds(organizationId, period.year, period.month, [employeeId]);
    if (!active.has(employeeId)) return { error: "Salarié hors de cette période." };
    await prisma.$executeRaw`DELETE FROM "payroll_entry_reviews" WHERE "organizationId" = ${organizationId} AND "payrollPeriodId" = ${period.id} AND "employeeId" = ${employeeId}`;
    if (reviewed) {
      await prisma.$executeRaw`INSERT INTO "payroll_entry_reviews" ("id", "organizationId", "payrollPeriodId", "employeeId", "reviewedByUserId", "reviewedAt") VALUES (${randomUUID()}, ${organizationId}, ${period.id}, ${employeeId}, ${userId}, CURRENT_TIMESTAMP)`;
    }
    refresh(period.id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

async function assertNoPayslips(organizationId: string, periodId: string) {
  const count = await prisma.payslip.count({ where: { organizationId, payrollPeriodId: periodId } });
  if (count > 0) throw new Error("Des bulletins ont déjà été produits pour ce mois : il ne peut plus revenir à la saisie.");
}

/** Rouvre la saisie d'un mois calculé mais pas encore clôturé. */
export async function backToEntryAction(periodId: string): Promise<EntryActionResult> {
  try {
    const { organizationId, userId, period } = await context(periodId);
    if (!["CALCULATED", "REVIEW", "VALIDATED"].includes(period.status)) return { error: period.status === "DRAFT" ? "La saisie est déjà ouverte." : "Un mois clôturé se rouvre depuis l'onglet Bulletins, avec un motif." };
    await assertNoPayslips(organizationId, period.id);
    await prisma.$transaction(async (tx) => {
      await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "DRAFT", validatedAt: null } });
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action: "payroll.period.back_to_entry", entityType: "PayrollPeriod", entityId: period.id, metadata: { from: period.status } } });
    });
    refresh(period.id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Calcule ou recalcule le mois (un mois calculé non clôturé repasse d'abord en saisie). */
export async function runPayrollCalculation(periodId: string, ruleCode: string, ruleScope: string): Promise<EntryActionResult> {
  try {
    const { organizationId, userId, period } = await context(periodId);
    if (period.status === "LOCKED") return { error: "Ce mois est clôturé : rouvrez-le avec un motif pour le recalculer." };
    await assertNoPayslips(organizationId, period.id);
    if (period.status !== "DRAFT") await prisma.payrollPeriod.update({ where: { id: period.id }, data: { status: "DRAFT", validatedAt: null } });
    const result = await calculatePayrollPeriod({ periodId: period.id, organizationId, ruleCode, ruleScope, actorUserId: userId });
    refresh(period.id);
    return { ok: true, count: result.employeeCount };
  } catch (error) {
    refresh(periodId);
    return failure(error);
  }
}

/** Valide et clôture le mois : les bulletins peuvent ensuite être produits. */
export async function closePayrollPeriodAction(periodId: string): Promise<EntryActionResult> {
  try {
    const { organizationId, userId, period } = await context(periodId);
    if (!["CALCULATED", "REVIEW", "VALIDATED"].includes(period.status)) return { error: period.status === "DRAFT" ? "Calculez la paie avant de la valider." : "Ce mois est déjà clôturé." };
    const { start, end } = bounds(period.year, period.month);
    const [employeeCount, calculations] = await Promise.all([
      prisma.employee.count({ where: { organizationId, deletedAt: null, hireDate: { lte: end }, OR: [{ contractEndDate: null }, { contractEndDate: { gte: start } }] } }),
      prisma.payrollCalculation.findMany({ where: { organizationId, payrollPeriodId: period.id }, select: { employeeId: true, grossAmount: true, netPaid: true, calculationSnapshot: true } }),
    ]);
    if (employeeCount === 0 || calculations.length !== employeeCount) return { error: `Validation impossible : ${calculations.length} salarié(s) calculé(s) sur ${employeeCount}. Relancez le calcul.` };
    if (calculations.some((calculation) => calculation.calculationSnapshot === null || Number(calculation.grossAmount) < 0 || Number(calculation.netPaid) < 0)) return { error: "Validation impossible : un calcul enregistré est incomplet. Relancez le calcul." };
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "LOCKED", validatedAt: now, lockedAt: now } });
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: userId, action: "payroll.period.locked", entityType: "PayrollPeriod", entityId: period.id, metadata: { from: period.status, employeeCount, lockedAt: now.toISOString() } } });
    });
    refresh(period.id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
