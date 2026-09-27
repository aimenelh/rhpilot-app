/**
 * Valorisation des absences selon l'horaire réel du mois (Cass. soc., méthode
 * admise : retenue = salaire mensuel × heures d'absence / heures programmées du mois)
 * et calcul du maintien de salaire maladie / AT-MP avec déduction des IJSS.
 */
import { addDays, daysBetweenInclusive, fromIsoDay, type CalendarDay, type IsoDay } from "./calendar";
import { IJSS, LEGAL_SICK_PAY, LEGAL_WORK_ACCIDENT_PAY, PMSS, SMIC_HOURLY, LEGAL_MONTHLY_HOURS, valueAt, type SickPayRule } from "./params";
import { round2 } from "./money";
import type { AbsenceInput, AbsenceKind, SickPayHistory } from "./types";

export type AbsenceDay = { day: IsoDay; hours: number; fullDay: boolean; inPeriod: boolean };

export type ValuedAbsence = {
  input: AbsenceInput;
  /** Jours de l'absence compris dans la période d'emploi du mois. */
  days: AbsenceDay[];
  hours: number;
  deduction: number;
  /** Jours civils entiers d'absence non rémunérée par l'employeur (réduction du plafond). */
  unpaidCalendarDays: number;
  maintenance: { amount: number; fullRateDays: number; reducedRateDays: number; waitingDays: number; ijssDeducted: number; rule: string } | null;
  ijss: { gross: number; net: number; taxable: number; estimated: boolean; days: number } | null;
};

const SICKNESS_KINDS: readonly AbsenceKind[] = ["SICK_LEAVE", "WORK_ACCIDENT"];
const IJSS_KINDS: readonly AbsenceKind[] = ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"];
/** Jours d'arrêt maladie dont les IJSS subrogées entrent dans l'assiette du prélèvement à la source. */
const SICKNESS_PAS_DAYS = 60;
const UNPAID_BY_EMPLOYER: readonly AbsenceKind[] = ["UNPAID_LEAVE", "OTHER_UNPAID", "SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"];

export function isDeductedAbsence(kind: AbsenceKind): boolean {
  return UNPAID_BY_EMPLOYER.includes(kind) || kind === "PAID_LEAVE";
}

/** Jours de l'absence limités à la période d'emploi, avec heures programmées ou partielles. */
export function absenceDays(absence: AbsenceInput, windowStart: IsoDay, windowEnd: IsoDay, calendar: ReadonlyMap<IsoDay, CalendarDay>): AbsenceDay[] {
  if (absence.end < absence.start) throw new Error(`L'absence ${absence.id} se termine avant de commencer.`);
  const from = absence.start > windowStart ? absence.start : windowStart;
  const to = absence.end < windowEnd ? absence.end : windowEnd;
  const out: AbsenceDay[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const scheduled = calendar.get(day)?.scheduledHours ?? 0;
    const partial = absence.partialDayHours?.[day];
    if (partial !== undefined && (!Number.isFinite(partial) || partial < 0 || partial > scheduled + 1e-9)) {
      throw new Error(`Les heures d'absence du ${day.split("-").reverse().join("/")} dépassent l'horaire programmé ce jour-là.`);
    }
    const hours = partial ?? scheduled;
    out.push({ day, hours, fullDay: partial === undefined || partial >= scheduled - 1e-9, inPeriod: true });
  }
  return out;
}

function completedSeniority(from: IsoDay, at: IsoDay): { months: number; years: number } {
  const start = fromIsoDay(from);
  const end = fromIsoDay(at);
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  return { months: Math.max(0, months), years: Math.max(0, Math.floor(months / 12)) };
}

export type IjssEstimateContext = { previousGrossSalaries: readonly number[] | null | undefined };

/** IJSS maladie journalières estimées (CSS art. R323-4) à partir des trois derniers bruts. */
export function estimateDailySicknessIjss(absenceStart: IsoDay, previousGrossSalaries: readonly number[]): { daily: number; source: string } {
  if (previousGrossSalaries.length < 3) throw new Error("Estimation des IJSS impossible : les trois derniers salaires bruts avant l'arrêt sont nécessaires. Saisissez le montant des IJSS figurant sur l'attestation de la CPAM.");
  const dayBefore = fromIsoDay(addDays(absenceStart, -1));
  const params = valueAt(IJSS, fromIsoDay(absenceStart), "IJSS maladie").value;
  const smicMonthly = valueAt(SMIC_HOURLY, dayBefore, "Smic horaire").value * LEGAL_MONTHLY_HOURS;
  const cap = params.sicknessSalaryCapSmicMultiple * smicMonthly;
  const reference = previousGrossSalaries.slice(-3).reduce((total, gross) => total + Math.min(gross, cap), 0);
  const daily = Math.floor((reference / params.sicknessReferenceDays) * params.sicknessRate * 100) / 100;
  return { daily, source: "IJSS maladie estimées : 50 % du salaire journalier de base (3 derniers bruts plafonnés à 1,4 Smic / 91,25)" };
}

/** IJSS maternité / paternité estimées : 3 derniers bruts plafonnés au PMSS, abattement forfaitaire de 21 %. */
export function estimateDailyMaternityIjss(absenceStart: IsoDay, previousGrossSalaries: readonly number[]): { daily: number; source: string } {
  if (previousGrossSalaries.length < 3) throw new Error("Estimation des IJSS impossible : les trois derniers salaires bruts avant le congé sont nécessaires. Saisissez le montant indiqué par la CPAM.");
  const pmss = valueAt(PMSS, fromIsoDay(addDays(absenceStart, -1)), "plafond mensuel de la sécurité sociale").value;
  const reference = previousGrossSalaries.slice(-3).reduce((total, gross) => total + Math.min(gross, pmss), 0);
  const daily = Math.floor((reference * (1 - 0.21) / 91.25) * 100) / 100;
  return { daily, source: "IJSS maternité / paternité estimées : 3 derniers bruts plafonnés au PMSS, abattement forfaitaire de 21 %, / 91,25" };
}

/** IJSS AT/MP estimées : 60 % du salaire journalier (brut du mois précédent / 30,42) pendant 28 jours, puis 80 %. */
export function estimateDailyWorkAccidentIjss(previousGrossSalaries: readonly number[], dayIndexFromStart: number): number {
  if (previousGrossSalaries.length < 1) throw new Error("Estimation des IJSS AT/MP impossible : le salaire brut du mois précédant l'arrêt est nécessaire. Saisissez le montant indiqué par la CPAM.");
  const dailySalary = previousGrossSalaries[previousGrossSalaries.length - 1] / 30.42;
  const rate = dayIndexFromStart < 28 ? 0.6 : 0.8;
  return Math.floor(dailySalary * rate * 100) / 100;
}

type MaintenanceComputation = {
  paidDays: Array<{ day: IsoDay; rate: number; tier: "FULL" | "REDUCED" }>;
  waitingDays: number;
  usedInPeriod: SickPayHistory;
};

/**
 * Répartit les jours civils d'un arrêt entre carence, plein tarif (90 %) et taux
 * réduit (2/3). Les jours antérieurs à la période sont rejoués pour connaître la
 * position dans l'arrêt ; seuls ceux de la période produisent un paiement.
 */
function allocateMaintenance(absence: AbsenceInput, rule: SickPayRule, seniorityFrom: IsoDay, history: SickPayHistory, periodStart: IsoDay, periodEnd: IsoDay): MaintenanceComputation | null {
  const seniority = completedSeniority(seniorityFrom, absence.start);
  if (seniority.months < rule.minSeniorityMonths) return null;
  const tier = [...rule.tiers].reverse().find((candidate) => seniority.years >= candidate.minSeniorityYears) ?? rule.tiers[0];
  let fullLeft = Math.max(0, tier.fullRateDays - history.fullRateDaysUsed);
  let reducedLeft = Math.max(0, tier.reducedRateDays - history.reducedRateDaysUsed);
  const waiting = absence.continuation ? 0 : rule.waitingDays;
  const lastDay = absence.end < periodEnd ? absence.end : periodEnd;
  // AT/MP : le jour de l'accident est payé normalement, l'indemnisation commence le lendemain.
  const firstDay = absence.kind === "WORK_ACCIDENT" && !absence.continuation ? addDays(absence.start, 1) : absence.start;
  const paidDays: MaintenanceComputation["paidDays"] = [];
  const used: SickPayHistory = { fullRateDaysUsed: 0, reducedRateDaysUsed: 0 };
  let waitingInPeriod = 0;
  let index = 0;
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1), index += 1) {
    const inPeriod = day >= periodStart;
    if (index < waiting) { if (inPeriod) waitingInPeriod += 1; continue; }
    if (fullLeft > 0) {
      fullLeft -= 1;
      if (inPeriod) { paidDays.push({ day, rate: rule.fullRate, tier: "FULL" }); used.fullRateDaysUsed += 1; }
    } else if (reducedLeft > 0) {
      reducedLeft -= 1;
      if (inPeriod) { paidDays.push({ day, rate: rule.reducedRate, tier: "REDUCED" }); used.reducedRateDaysUsed += 1; }
    }
  }
  return { paidDays, waitingDays: waitingInPeriod, usedInPeriod: used };
}

export function valueAbsence(input: {
  absence: AbsenceInput;
  windowStart: IsoDay;
  windowEnd: IsoDay;
  periodStart: IsoDay;
  periodEnd: IsoDay;
  calendar: ReadonlyMap<IsoDay, CalendarDay>;
  hourlyValue: number;
  seniorityFrom: IsoDay;
  sickPayRule?: SickPayRule;
  workAccidentPayRule?: SickPayRule;
  history: SickPayHistory;
  previousGrossSalaries?: readonly number[] | null;
  subrogation: boolean;
}): ValuedAbsence & { usedInPeriod: SickPayHistory } {
  const { absence } = input;
  const allDays = absenceDays(absence, input.windowStart, input.windowEnd, input.calendar);
  // Accident du travail : le jour de l'accident reste intégralement payé par l'employeur.
  const days = absence.kind === "WORK_ACCIDENT" && !absence.continuation ? allDays.filter((day) => day.day !== absence.start) : allDays;
  const hours = days.reduce((total, day) => total + day.hours, 0);
  const deducted = isDeductedAbsence(absence.kind);
  const deduction = deducted ? round2(hours * input.hourlyValue) : 0;
  const dayValue = (day: IsoDay) => (days.find((candidate) => candidate.day === day)?.hours ?? 0) * input.hourlyValue;

  let maintenance: ValuedAbsence["maintenance"] = null;
  let ijss: ValuedAbsence["ijss"] = null;
  let usedInPeriod: SickPayHistory = { fullRateDaysUsed: 0, reducedRateDaysUsed: 0 };
  const maintainedDays = new Set<IsoDay>();

  if (IJSS_KINDS.includes(absence.kind) && days.length > 0) {
    const ijssParams = valueAt(IJSS, fromIsoDay(absence.start), "IJSS").value;
    // Jours indemnisés par la CPAM dans la période : carence de 3 jours pour la maladie seulement.
    const cpamWaiting = absence.continuation ? 0 : absence.kind === "SICK_LEAVE" ? ijssParams.sicknessWaitingDays : absence.kind === "WORK_ACCIDENT" ? 1 : 0;
    const eligible = days.filter((day) => daysBetweenInclusive(absence.start, day.day) > cpamWaiting);
    let gross = 0;
    let estimated = false;
    if (absence.ijssGrossAmount !== undefined && absence.ijssGrossAmount !== null) {
      if (!Number.isFinite(absence.ijssGrossAmount) || absence.ijssGrossAmount < 0) throw new Error(`Le montant d'IJSS de l'absence ${absence.id} est invalide.`);
      gross = absence.ijssGrossAmount;
    } else if (eligible.length > 0) {
      const previous = input.previousGrossSalaries ?? [];
      estimated = true;
      if (absence.kind === "SICK_LEAVE") gross = estimateDailySicknessIjss(absence.start, previous).daily * eligible.length;
      else if (absence.kind === "WORK_ACCIDENT") gross = eligible.reduce((total, day) => total + estimateDailyWorkAccidentIjss(previous, daysBetweenInclusive(absence.start, day.day) - 1), 0);
      else gross = estimateDailyMaternityIjss(absence.start, previous).daily * eligible.length;
    }
    gross = round2(gross);
    const net = round2(gross * (1 - ijssParams.replacementIncomeCsgDeductible - ijssParams.replacementIncomeCsgNonDeductible - ijssParams.replacementIncomeCrds));
    // IJSS imposables après CSG déductible ; celles d'AT/MP ne le sont qu'à 50 % (CGI art. 80 quinquies).
    // Maladie : l'employeur subrogé ne les intègre au net imposable que pour les 60 premiers jours de l'arrêt (BOI-IR-PAS-20-10-10).
    let taxableGross = gross;
    if (absence.kind === "SICK_LEAVE" && eligible.length > 0) {
      const arretStart = absence.initialStart ?? absence.start;
      const withinSixtyDays = eligible.filter((day) => daysBetweenInclusive(arretStart, day.day) <= SICKNESS_PAS_DAYS).length;
      taxableGross = gross * withinSixtyDays / eligible.length;
    }
    const taxableShare = absence.kind === "WORK_ACCIDENT" ? 0.5 : 1;
    const taxable = round2(taxableGross * (1 - ijssParams.replacementIncomeCsgDeductible) * taxableShare);
    ijss = { gross, net, taxable, estimated, days: eligible.length };

    if (SICKNESS_KINDS.includes(absence.kind)) {
      const rule = absence.kind === "WORK_ACCIDENT" ? input.workAccidentPayRule ?? LEGAL_WORK_ACCIDENT_PAY : input.sickPayRule ?? LEGAL_SICK_PAY;
      const allocation = allocateMaintenance(absence, rule, input.seniorityFrom, input.history, input.periodStart, input.windowEnd);
      if (allocation) {
        usedInPeriod = allocation.usedInPeriod;
        const ijssPerEligibleDay = eligible.length > 0 ? gross / eligible.length : 0;
        const eligibleSet = new Set(eligible.map((day) => day.day));
        let guaranteed = 0;
        let ijssOnMaintained = 0;
        for (const paid of allocation.paidDays) {
          guaranteed += paid.rate * dayValue(paid.day);
          if (eligibleSet.has(paid.day)) ijssOnMaintained += ijssPerEligibleDay;
          maintainedDays.add(paid.day);
        }
        const amount = round2(Math.max(0, guaranteed - ijssOnMaintained));
        maintenance = {
          amount,
          fullRateDays: allocation.usedInPeriod.fullRateDaysUsed,
          reducedRateDays: allocation.usedInPeriod.reducedRateDaysUsed,
          waitingDays: allocation.waitingDays,
          ijssDeducted: round2(ijssOnMaintained),
          rule: rule.source,
        };
      }
    }
  }

  // Plafond de la sécurité sociale : seuls les jours civils entiers sans rémunération employeur le réduisent.
  let unpaidCalendarDays = 0;
  if (UNPAID_BY_EMPLOYER.includes(absence.kind)) {
    for (const day of days) {
      if (!day.fullDay) continue;
      if (maintainedDays.has(day.day)) continue;
      unpaidCalendarDays += 1;
    }
  }

  return { input: absence, days, hours, deduction, unpaidCalendarDays, maintenance, ijss, usedInPeriod };
}
