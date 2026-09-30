/**
 * Reconstitution de l'état antérieur d'un salarié à partir des calculs déjà
 * validés : cumuls de l'année (régularisation progressive, RGDU), compteurs de
 * congés payés, jours de maintien maladie des douze derniers mois, derniers
 * bruts (estimation des IJSS) et brut total du contrat (fin de CDD).
 *
 * Fonction pure : l'appelant charge les calculs et les reprises.
 */
import { round2 } from "./money";
import { paidLeaveReferenceYear, parseYearToDate, rollPaidLeaveBalances } from "./inputs";
import type { PaidLeaveBalances, PayslipInput, PayslipResult, SickPayHistory, YearToDate } from "./types";

export const BULLETIN_SNAPSHOT_ENGINE = "RHPILOT_BULLETIN";

export type PriorCalculation = {
  year: number;
  month: number;
  status: string;
  grossAmount: number;
  snapshot: unknown;
};

export type PaidLeaveOpening = { asOf: string; balances: PaidLeaveBalances };
export type PayrollOpening = { year: number; throughMonth: number; cumuls: unknown; sickPayHistory?: unknown };

export type PriorState = {
  yearToDate: YearToDate | null;
  paidLeave: PaidLeaveBalances;
  paidLeaveIndemnities: NonNullable<PayslipInput["priorPaidLeaveIndemnities"]>;
  sickPayHistory: SickPayHistory;
  previousGrossSalaries: number[];
  grossSalaryHistory: Array<{ year: number; month: number; gross: number }>;
  contractGrossBefore: number;
  /** Tous les mois depuis l'embauche ont été calculés dans RH Pilot (brut du contrat complet). */
  contractGrossComplete: boolean;
  warnings: string[];
};

const FINAL_STATUSES = new Set(["VALIDATED", "LOCKED"]);
const index = (year: number, month: number) => year * 12 + (month - 1);

/** La régularisation annuelle ne peut pas repartir à zéro après une paie manquante. */
export function assertPriorPayrollCoverage(input: {
  year: number; month: number; hireDate: string; displayName: string;
  calculations: readonly PriorCalculation[]; payrollOpening?: PayrollOpening | null;
}): void {
  const hireYear = Number(input.hireDate.slice(0, 4));
  const hireMonth = Number(input.hireDate.slice(5, 7));
  const firstMonth = hireYear < input.year ? 1 : hireYear === input.year ? hireMonth : input.month;
  const opening = input.payrollOpening?.year === input.year && input.payrollOpening.throughMonth < input.month ? input.payrollOpening : null;
  for (let month = firstMonth; month < input.month; month += 1) {
    if (opening && month <= opening.throughMonth) continue;
    const calculation = input.calculations.find((item) => item.year === input.year && item.month === month && FINAL_STATUSES.has(item.status));
    if (!calculation || !bulletinFromSnapshot(calculation.snapshot)) {
      throw new Error(`Calcul bloqué pour ${input.displayName} : les cumuls de ${String(month).padStart(2, "0")}/${input.year} manquent ou proviennent de l'ancien moteur. Validez le bulletin détaillé de ce mois ou renseignez les cumuls de reprise arrêtés avant la période à calculer.`);
    }
  }
}

export function bulletinFromSnapshot(snapshot: unknown): PayslipResult | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const record = snapshot as { calculationSource?: { engine?: unknown }; bulletin?: unknown };
  if (record.calculationSource?.engine !== BULLETIN_SNAPSHOT_ENGINE) return null;
  const bulletin = record.bulletin as PayslipResult | undefined;
  if (!bulletin || typeof bulletin !== "object" || !bulletin.totals || !bulletin.yearToDate) return null;
  return bulletin;
}

export function resolvePriorState(input: {
  year: number;
  month: number;
  displayName: string;
  hireDate: string;
  calculations: readonly PriorCalculation[];
  paidLeaveOpening?: PaidLeaveOpening | null;
  payrollOpening?: PayrollOpening | null;
  /** Absences de la chaîne d'arrêt en cours : leurs jours déjà indemnisés ne comptent pas deux fois. */
  currentChainAbsenceIds?: ReadonlySet<string>;
}): PriorState {
  const warnings: string[] = [];
  const current = index(input.year, input.month);
  const earlier = input.calculations
    .filter((calculation) => index(calculation.year, calculation.month) < current)
    .sort((a, b) => index(b.year, b.month) - index(a.year, a.month));

  // Un mois non validé de la même année (cumuls) ou le mois précédent (compteurs) bloque le calcul.
  // Un brouillon plus ancien, abandonné, est ignoré et signalé.
  const pending = earlier.filter((calculation) => !FINAL_STATUSES.has(calculation.status));
  const blocking = pending.find((calculation) => calculation.year === input.year || index(calculation.year, calculation.month) === current - 1);
  if (blocking) {
    throw new Error(`La paie de ${String(blocking.month).padStart(2, "0")}/${blocking.year} de ${input.displayName} n'est pas validée : validez les mois précédents avant de calculer celui-ci, les cumuls en dépendent.`);
  }
  for (const ignored of pending) warnings.push(`La paie de ${String(ignored.month).padStart(2, "0")}/${ignored.year} de ${input.displayName} n'a jamais été validée : elle est ignorée pour les cumuls et les compteurs.`);
  const prior = earlier.filter((calculation) => FINAL_STATUSES.has(calculation.status));

  // Cumuls de l'année.
  let yearToDate: YearToDate | null = null;
  const lastThisYear = prior.find((calculation) => calculation.year === input.year);
  const lastBulletinThisYear = prior.map((calculation) => ({ calculation, bulletin: bulletinFromSnapshot(calculation.snapshot) })).find((entry) => entry.calculation.year === input.year && entry.bulletin);
  const opening = input.payrollOpening && input.payrollOpening.year === input.year && input.payrollOpening.throughMonth < input.month ? input.payrollOpening : null;
  if (lastBulletinThisYear && (!opening || lastBulletinThisYear.calculation.month >= opening.throughMonth)) {
    yearToDate = lastBulletinThisYear.bulletin!.yearToDate;
    if (lastThisYear && lastThisYear !== lastBulletinThisYear.calculation) warnings.push(`Des mois de ${input.year} ont été calculés par l'ancien moteur après le dernier bulletin détaillé de ${input.displayName} : les cumuls repartent du dernier bulletin détaillé.`);
  } else if (opening) {
    yearToDate = parseYearToDate(opening.cumuls, input.year);
  } else if (lastThisYear) {
    warnings.push(`Les mois précédents de ${input.year} de ${input.displayName} ont été calculés par l'ancien moteur : la régularisation progressive des tranches et de la RGDU repart de ce mois. Saisissez les cumuls de reprise pour une régularisation exacte.`);
  } else if (input.month > 1 && input.hireDate < `${input.year}-01-01`) {
    warnings.push(`Aucun cumul antérieur de ${input.year} n'est connu pour ${input.displayName} : saisissez les cumuls de reprise si le salarié a été payé en dehors de RH Pilot cette année.`);
  }

  // Compteurs de congés payés.
  let paidLeave: PaidLeaveBalances | null = null;
  let stateFrom: { year: number; month: number } | null = null;
  const lastWithLeave = prior.map((calculation) => ({ calculation, bulletin: bulletinFromSnapshot(calculation.snapshot) })).find((entry) => entry.bulletin?.paidLeave);
  const leaveOpening = input.paidLeaveOpening ?? null;
  const openingIndex = leaveOpening ? index(Number(leaveOpening.asOf.slice(0, 4)), Number(leaveOpening.asOf.slice(5, 7))) : null;
  // Une reprise datée d'un mois postérieur ne s'applique pas encore.
  const usableOpening = leaveOpening && openingIndex !== null && openingIndex <= current ? leaveOpening : null;
  // Les compteurs sont rattachés au mois où ils ont été arrêtés : celui du dernier bulletin, ou le mois qui précède
  // la date d'application d'une reprise (soldes recopiés du dernier bulletin établi ailleurs).
  if (lastWithLeave && (!usableOpening || index(lastWithLeave.calculation.year, lastWithLeave.calculation.month) >= openingIndex!)) {
    paidLeave = { ...lastWithLeave.bulletin!.paidLeave!.balancesAfter };
    stateFrom = { year: lastWithLeave.calculation.year, month: lastWithLeave.calculation.month };
  } else if (usableOpening) {
    paidLeave = { ...usableOpening.balances };
    const closing = openingIndex! - 1;
    stateFrom = { year: Math.floor(closing / 12), month: (closing % 12) + 1 };
  }
  if (paidLeave && stateFrom) {
    const rolled = rollPaidLeaveBalances(paidLeave, stateFrom, { year: input.year, month: input.month });
    paidLeave = rolled.balances;
    if (rolled.carriedOver > 0) warnings.push(`${round2(rolled.carriedOver)} jour(s) de congés de la période précédente de ${input.displayName} n'ont pas été pris avant le 31 mai : ils sont reportés, vérifiez s'ils doivent l'être (accord, maladie, maternité) ou être soldés.`);
  } else {
    const referenceStart = `${paidLeaveReferenceYear(input.year, input.month)}-06-01`;
    const periodFirst = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
    const hiredThisPeriod = input.hireDate >= periodFirst;
    paidLeave = { previousAcquired: 0, previousTaken: 0, currentAcquired: 0, currentTaken: 0, referenceGross: null, referenceAcquiredDays: null, currentReferenceGross: hiredThisPeriod ? 0 : null };
    if (!hiredThisPeriod) {
      warnings.push(input.hireDate >= referenceStart
        ? `Les compteurs de congés payés de ${input.displayName} partent de zéro : les mois déjà travaillés depuis l'embauche n'ont pas été calculés dans RH Pilot, saisissez la reprise des soldes.`
        : `Les compteurs de congés payés de ${input.displayName} ne sont pas initialisés : saisissez la reprise des soldes pour que les congés et l'indemnité compensatrice soient exacts.`);
    }
  }

  // Maintien maladie : jours indemnisés sur les douze mois précédents, hors arrêt en cours.
  const sickPayHistory: SickPayHistory = { fullRateDaysUsed: 0, reducedRateDaysUsed: 0 };
  for (const calculation of prior) {
    if (index(calculation.year, calculation.month) < current - 12) continue;
    const bulletin = bulletinFromSnapshot(calculation.snapshot);
    if (!bulletin?.sickPayByAbsence) continue;
    for (const [absenceId, used] of Object.entries(bulletin.sickPayByAbsence)) {
      if (input.currentChainAbsenceIds?.has(absenceId)) continue;
      sickPayHistory.fullRateDaysUsed += used.fullRateDaysUsed;
      sickPayHistory.reducedRateDaysUsed += used.reducedRateDaysUsed;
    }
  }
  if (opening?.sickPayHistory && typeof opening.sickPayHistory === "object") {
    const record = opening.sickPayHistory as Record<string, unknown>;
    const full = Number(record.fullRateDaysUsed ?? 0);
    const reduced = Number(record.reducedRateDaysUsed ?? 0);
    if (Number.isFinite(full) && full >= 0) sickPayHistory.fullRateDaysUsed += full;
    if (Number.isFinite(reduced) && reduced >= 0) sickPayHistory.reducedRateDaysUsed += reduced;
  }

  // Trois derniers bruts mensuels (estimation des IJSS), du plus ancien au plus récent.
  const previousGrossSalaries: number[] = [];
  for (let offset = 3; offset >= 1; offset -= 1) {
    const target = current - offset;
    const calculation = prior.find((candidate) => index(candidate.year, candidate.month) === target);
    if (!calculation) continue;
    const bulletin = bulletinFromSnapshot(calculation.snapshot);
    previousGrossSalaries.push(round2(bulletin ? bulletin.totals.grossSubject : calculation.grossAmount));
  }

  // Brut total déjà versé au titre du contrat (indemnité de fin de CDD).
  const hireIndex = index(Number(input.hireDate.slice(0, 4)), Number(input.hireDate.slice(5, 7)));
  const contractGrossBefore = round2(prior
    .filter((calculation) => index(calculation.year, calculation.month) >= hireIndex)
    .reduce((total, calculation) => {
      const bulletin = bulletinFromSnapshot(calculation.snapshot);
      return total + (bulletin ? bulletin.totals.grossTotal : calculation.grossAmount);
    }, 0));

  const monthsSinceHire = current - hireIndex;
  const calculatedMonths = new Set(prior.filter((calculation) => index(calculation.year, calculation.month) >= hireIndex).map((calculation) => index(calculation.year, calculation.month)));
  const contractGrossComplete = monthsSinceHire <= 0 || calculatedMonths.size >= monthsSinceHire;

  const grossSalaryHistory = prior.map((calculation) => {
    const bulletin = bulletinFromSnapshot(calculation.snapshot);
    return { year: calculation.year, month: calculation.month, gross: round2(bulletin ? bulletin.totals.grossSubject : calculation.grossAmount) };
  });

  const paidLeaveIndemnities: NonNullable<PayslipInput["priorPaidLeaveIndemnities"]> = {};
  for (const calculation of [...prior].reverse()) {
    const bulletin = bulletinFromSnapshot(calculation.snapshot);
    for (const line of bulletin?.lines ?? []) {
      const absenceId = line.detail?.absenceId;
      if (line.code !== "CP_INDEMNITY" || typeof absenceId !== "string") continue;
      const previous = paidLeaveIndemnities[absenceId];
      const deduction = bulletin?.lines.find((item) => item.code === "ABS_PAID_LEAVE" && item.detail?.absenceId === absenceId);
      paidLeaveIndemnities[absenceId] = {
        days: round2((previous?.days ?? 0) + (line.quantity ?? 0)),
        maintenance: round2((previous?.maintenance ?? 0) - (deduction?.amount ?? 0)),
        paid: round2((previous?.paid ?? 0) + (line.amount ?? 0)),
        referenceGross: bulletin?.paidLeave?.balancesAfter.referenceGross ?? null,
        referenceDays: bulletin?.paidLeave?.balancesAfter.referenceAcquiredDays ?? null,
      };
    }
  }
  return { yearToDate, paidLeave, paidLeaveIndemnities, sickPayHistory, previousGrossSalaries, grossSalaryHistory, contractGrossBefore, contractGrossComplete, warnings };
}
