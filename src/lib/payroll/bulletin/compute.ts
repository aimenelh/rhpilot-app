/**
 * Moteur de bulletin RH Pilot.
 *
 * Calcul complet et déterministe d'un bulletin mensuel : brut (base, entrées et
 * sorties, absences, congés payés, maintien maladie, heures supplémentaires et
 * complémentaires, primes, avantages en nature), cotisations avec régularisation
 * progressive des tranches sur l'année civile, RGDU cumulée, exonérations des
 * heures supplémentaires, CSG/CRDS, net social, net imposable, prélèvement à la
 * source (taux personnalisé ou grille par défaut) et cumuls.
 *
 * Aucune donnée n'est lue en base ici : l'appelant fournit un contexte complet.
 * Toute information indispensable manquante bloque le calcul avec un message
 * explicite plutôt que de produire un bulletin approximatif.
 */
import { addDays, assertSchedule, calendarDays, daysBetweenInclusive, fromIsoDay, monthBounds, paidLeaveDaysForAbsence, publicHolidays, type CalendarDay, type IsoDay } from "./calendar";
import { valueAbsence, type ValuedAbsence } from "./absences";
import {
  CONTRIBUTION_RATES,
  ENGINE_FIRST_SUPPORTED_DAY,
  EXPENSES,
  LEGAL_MONTHLY_HOURS,
  OVERTIME,
  PAS_DEFAULT_GRIDS,
  PAS_SHORT_CONTRACT_ALLOWANCE,
  PMSS,
  RGDU,
  RGDU_SMIC_HOURLY,
  SMIC_HOURLY,
  pasBracketRate,
  valueAt,
} from "./params";
import { assertAmount, round2, round4 } from "./money";
import { NO_SEVERANCE, addTerminationLines } from "./termination";
import type { PaidLeaveBalances, PaidLeaveOutcome, PayslipInput, PayslipLine, PayslipResult, SickPayHistory, YearToDate } from "./types";

export const BULLETIN_ENGINE_VERSION = "rhpilot-bulletin-2026.1";

export function emptyYearToDate(year: number): YearToDate {
  return {
    year,
    grossSubject: 0,
    ceiling: 0,
    baseT1: 0,
    baseT2: 0,
    baseFourCeilings: 0,
    baseCet: 0,
    csgGross: 0,
    csgWithinFourCeilings: 0,
    rgduSmic: 0,
    rgduRemuneration: 0,
    rgduAmount: 0,
    overtimeTaxExemptGross: 0,
    netTaxable: 0,
    withholdingTax: 0,
    netPaid: 0,
    netSocial: 0,
    employeeContributions: 0,
    employerContributions: 0,
    hoursPaid: 0,
    grossTotal: 0,
    employerCost: 0,
  };
}

const ABSENCE_LABELS: Record<string, string> = {
  UNPAID_LEAVE: "Absence non rémunérée",
  OTHER_UNPAID: "Absence non rémunérée",
  PAID_LEAVE: "Absence congés payés",
  SICK_LEAVE: "Absence maladie",
  WORK_ACCIDENT: "Absence accident du travail",
  MATERNITY: "Absence congé maternité",
  PATERNITY: "Absence congé paternité et d'accueil de l'enfant",
};

function frDate(day: IsoDay): string {
  return day.split("-").reverse().join("/");
}

function headcountThresholds(headcount: number) {
  return { atLeast11: headcount >= 11, atLeast20: headcount >= 20, atLeast50: headcount >= 50 };
}

export function computePayslip(input: PayslipInput): PayslipResult {
  const warnings: string[] = [];
  const sources = new Set<string>();
  const { organization: org, employee, pay } = input;
  const { year, month } = input.period;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("La période de paie est invalide.");
  const period = monthBounds(year, month);
  if (period.first < ENGINE_FIRST_SUPPORTED_DAY) throw new Error(`Le moteur de bulletin couvre les périodes à compter du ${frDate(ENGINE_FIRST_SUPPORTED_DAY)}.`);
  const paymentDate = input.paymentDate ?? period.last;
  const periodDate = fromIsoDay(period.first);

  // --- Contrôles de contexte -------------------------------------------------
  if (org.territory !== "METROPOLE") throw new Error("Les cotisations propres aux départements d'outre-mer (dont LODEOM) ne sont pas encore prises en charge : le calcul est bloqué.");
  if (!Number.isInteger(org.headcount) || org.headcount < 1) throw new Error("L'effectif de l'entreprise est absent ou invalide : il détermine plusieurs cotisations.");
  assertAmount(org.atmpRatePercent, "Le taux AT/MP");
  if (org.atmpRatePercent > 30) throw new Error("Le taux AT/MP saisi est invraisemblable (au-delà de 30 %).");
  assertAmount(org.mobilityRatePercent, "Le taux de versement mobilité");
  if (org.mobilityRatePercent > 3.2) throw new Error("Le taux de versement mobilité saisi dépasse le maximum légal.");
  assertAmount(pay.monthlyBaseSalary, "Le salaire de base");
  assertAmount(pay.contractMonthlyHours, "L'horaire mensuel contractuel", { allowZero: false });
  if (pay.contractMonthlyHours > 250) throw new Error("L'horaire mensuel contractuel est invraisemblable.");
  assertSchedule(pay.schedule);
  if (org.healthPlan) {
    assertAmount(org.healthPlan.monthlyAmount, "La cotisation de complémentaire santé");
    if (org.healthPlan.employerShare < 0.5 || org.healthPlan.employerShare > 1) throw new Error("La part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %.");
  }

  const rates = valueAt(CONTRIBUTION_RATES, periodDate, "taux de cotisations");
  const pmss = valueAt(PMSS, periodDate, "plafond mensuel de la sécurité sociale");
  const smicHourly = valueAt(SMIC_HOURLY, periodDate, "Smic horaire");
  const rgduSmicHourly = valueAt(RGDU_SMIC_HOURLY, periodDate, "Smic RGDU");
  const rgdu = valueAt(RGDU, periodDate, "RGDU");
  const overtimeParams = valueAt(OVERTIME, periodDate, "heures supplémentaires");
  const expenseParams = valueAt(EXPENSES, periodDate, "frais professionnels");
  for (const source of [rates.source, pmss.source, smicHourly.source, rgdu.source]) sources.add(source);
  const r = rates.value;
  const thresholds = headcountThresholds(org.headcount);
  const isApprentice = employee.contract === "APPRENTISSAGE";

  // --- Temps de travail du mois ------------------------------------------------
  const holidays = publicHolidays(year, { workedSolidarityDay: org.workedSolidarityDay, alsaceMoselle: org.alsaceMoselle });
  const monthDays = calendarDays(period.first, period.last, pay.schedule, holidays);
  const calendar = new Map<IsoDay, CalendarDay>(monthDays.map((day) => [day.day, day]));
  const monthScheduledHours = monthDays.reduce((total, day) => total + day.scheduledHours, 0);
  if (monthScheduledHours <= 0) throw new Error("L'horaire du salarié ne prévoit aucune heure de travail sur le mois.");

  const windowStart = employee.hireDate > period.first ? employee.hireDate : period.first;
  const windowEnd = employee.contractEndDate && employee.contractEndDate < period.last ? employee.contractEndDate : period.last;
  if (windowStart > period.last || windowEnd < period.first || windowEnd < windowStart) throw new Error(`${employee.displayName} n'est pas sous contrat sur la période.`);
  const employedDays = monthDays.filter((day) => day.day >= windowStart && day.day <= windowEnd);
  const employedHours = employedDays.reduce((total, day) => total + day.scheduledHours, 0);
  const employedCalendarDays = daysBetweenInclusive(windowStart, windowEnd);
  const hourlyValue = pay.monthlyBaseSalary / monthScheduledHours;

  const lines: PayslipLine[] = [];
  const grossLine = (line: Omit<PayslipLine, "section">) => { lines.push({ section: "GROSS", ...line, amount: round2(line.amount ?? 0) }); };

  // --- Salaire de base et heures supplémentaires structurelles -----------------
  const structuralHours = pay.structuralOvertimeMonthlyHours ?? 0;
  if (structuralHours < 0 || structuralHours >= pay.contractMonthlyHours) throw new Error("Les heures supplémentaires structurelles sont invalides.");
  const structuralRate = pay.structuralOvertimeRate ?? 0.25;
  if (structuralHours > 0 && structuralRate < 0.1) throw new Error("La majoration des heures supplémentaires ne peut pas être inférieure à 10 %.");
  const normalHours = pay.contractMonthlyHours - structuralHours;
  const hourlyRate = pay.monthlyBaseSalary / (normalHours + structuralHours * (1 + structuralRate));
  const baseAmount = round2(hourlyRate * normalHours);
  const structuralAmount = round2(pay.monthlyBaseSalary - baseAmount);
  grossLine({ code: "BASE", label: "Salaire de base", quantity: round2(normalHours), unit: "HOURS", rate: round4(hourlyRate), amount: baseAmount, source: "Contrat de travail" });
  if (structuralHours > 0) {
    grossLine({ code: "HS_STRUCT", label: `Heures supplémentaires structurelles ${Math.round(structuralRate * 100)} %`, quantity: round2(structuralHours), unit: "HOURS", rate: round4(hourlyRate * (1 + structuralRate)), amount: structuralAmount, source: "Contrat de travail ; C. trav. art. L3121-36" });
  }

  // --- Entrée / sortie en cours de mois ---------------------------------------
  let entryExitDeduction = 0;
  if (employedHours < monthScheduledHours - 1e-9) {
    const missing = monthScheduledHours - employedHours;
    entryExitDeduction = round2(pay.monthlyBaseSalary * missing / monthScheduledHours);
    const reason = windowStart > period.first && windowEnd < period.last ? `entrée le ${frDate(windowStart)} et sortie le ${frDate(windowEnd)}` : windowStart > period.first ? `entrée le ${frDate(windowStart)}` : `sortie le ${frDate(windowEnd)}`;
    grossLine({ code: "ENTRY_EXIT", label: `Retenue pour mois incomplet (${reason})`, quantity: round2(missing), unit: "HOURS", rate: round4(hourlyValue), amount: -entryExitDeduction, source: "Horaire réel du mois : salaire × heures non couvertes par le contrat / heures programmées du mois" });
  }

  // --- Absences -------------------------------------------------------------------
  const history: SickPayHistory = input.sickPayHistory ?? { fullRateDaysUsed: 0, reducedRateDaysUsed: 0 };
  const sickPayUsed: SickPayHistory = { fullRateDaysUsed: 0, reducedRateDaysUsed: 0 };
  const sickPayByAbsence: Record<string, SickPayHistory> = {};
  const valued: ValuedAbsence[] = [];
  const runningHistory = { ...history };
  // Salaires de référence des IJSS : les mois civils qui précèdent le début de chaque arrêt (et non la période de paie).
  const salaryByMonth = input.grossSalaryHistory ? new Map(input.grossSalaryHistory.map((entry) => [entry.year * 12 + entry.month - 1, entry.gross])) : null;
  const referenceSalaries = (start: IsoDay): readonly number[] | null | undefined => {
    if (!salaryByMonth) return input.previousGrossSalaries;
    const startIndex = Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)) - 1;
    const salaries: number[] = [];
    for (let offset = 3; offset >= 1; offset -= 1) {
      const gross = salaryByMonth.get(startIndex - offset);
      if (gross !== undefined) salaries.push(gross);
    }
    return salaries;
  };
  for (const absence of [...(input.absences ?? [])].sort((a, b) => a.start.localeCompare(b.start))) {
    if (absence.end < windowStart || absence.start > windowEnd) continue;
    const result = valueAbsence({
      absence,
      windowStart,
      windowEnd,
      periodStart: period.first,
      periodEnd: period.last,
      calendar,
      hourlyValue,
      seniorityFrom: employee.seniorityDate ?? employee.hireDate,
      sickPayRule: org.sickPayRule,
      workAccidentPayRule: org.workAccidentPayRule,
      history: runningHistory,
      previousGrossSalaries: referenceSalaries(absence.start),
      subrogation: org.ijssSubrogation,
    });
    runningHistory.fullRateDaysUsed += result.usedInPeriod.fullRateDaysUsed;
    runningHistory.reducedRateDaysUsed += result.usedInPeriod.reducedRateDaysUsed;
    sickPayUsed.fullRateDaysUsed += result.usedInPeriod.fullRateDaysUsed;
    sickPayUsed.reducedRateDaysUsed += result.usedInPeriod.reducedRateDaysUsed;
    if (result.usedInPeriod.fullRateDaysUsed + result.usedInPeriod.reducedRateDaysUsed > 0) sickPayByAbsence[absence.id] = { ...result.usedInPeriod };
    valued.push(result);
  }

  const totalAbsenceDeduction = valued.reduce((total, absence) => total + absence.deduction, 0);
  if (org.alsaceMoselle && valued.some((absence) => absence.input.kind === "SICK_LEAVE" && absence.deduction > 0)) {
    warnings.push("Alsace-Moselle : le droit local (C. trav. art. L1226-23) maintient le salaire, sans carence ni condition d'ancienneté, pour une absence d'une durée relativement sans importance. Le maintien légal national a été appliqué : ajoutez le complément dû selon la durée de l'arrêt.");
  }
  if (valued.some((absence) => (absence.input.kind === "MATERNITY" || absence.input.kind === "PATERNITY") && absence.deduction > 0)) {
    warnings.push("Congé maternité ou paternité : aucun maintien de salaire légal n'est dû, vérifiez si votre convention collective en prévoit un et saisissez-le en prime le cas échéant.");
  }
  if (totalAbsenceDeduction + entryExitDeduction > pay.monthlyBaseSalary + 0.05) throw new Error(`Les absences saisies pour ${employee.displayName} dépassent le salaire du mois : vérifiez les dates.`);

  // Congés payés : décompte, indemnité et compteurs.
  let paidLeaveOutcome: PaidLeaveOutcome | null = null;
  let paidLeaveIndemnityTotal = 0;
  const paidLeaveAbsences = valued.filter((absence) => absence.input.kind === "PAID_LEAVE");
  const balances: PaidLeaveBalances = input.paidLeave ?? { previousAcquired: 0, previousTaken: 0, currentAcquired: 0, currentTaken: 0 };

  for (const absence of valued) {
    if (absence.deduction <= 0 && absence.input.kind !== "SICK_LEAVE" && absence.input.kind !== "WORK_ACCIDENT") continue;
    const first = absence.days[0]?.day;
    const last = absence.days[absence.days.length - 1]?.day;
    if (!first || !last) continue;
    const label = `${ABSENCE_LABELS[absence.input.kind] ?? "Absence"} du ${frDate(first)} au ${frDate(last)}`;
    if (absence.deduction > 0) {
      grossLine({ code: `ABS_${absence.input.kind}`, label, quantity: round2(absence.hours), unit: "HOURS", rate: round4(hourlyValue), amount: -absence.deduction, source: "Horaire réel du mois : salaire × heures d'absence / heures programmées du mois", detail: { absenceId: absence.input.id } });
    }
    if (absence.input.kind === "PAID_LEAVE") {
      const days = paidLeaveDaysForAbsence({ absenceStart: absence.input.start, absenceEnd: absence.input.end, windowStart, windowEnd, method: org.paidLeaveMethod, schedule: pay.schedule, holidays });
      let indemnity = absence.deduction;
      let method: "SALARY_MAINTENANCE" | "TENTH" = "SALARY_MAINTENANCE";
      const referenceGross = balances.referenceGross ?? null;
      const referenceDays = balances.referenceAcquiredDays ?? null;
      if (referenceGross !== null && referenceDays !== null && referenceDays > 0) {
        const tenth = round2((referenceGross / 10) * (days / referenceDays));
        if (tenth > indemnity) { indemnity = tenth; method = "TENTH"; }
      }
      paidLeaveIndemnityTotal += indemnity;
      grossLine({ code: "CP_INDEMNITY", label: `Indemnité de congés payés (${days} jour${days > 1 ? "s" : ""} ${org.paidLeaveMethod === "OUVRABLES" ? "ouvrables" : "ouvrés"})`, quantity: days, unit: "DAYS", amount: indemnity, source: method === "TENTH" ? "C. trav. art. L3141-24 : règle du dixième, plus favorable que le maintien" : "C. trav. art. L3141-24 : maintien de salaire", detail: { absenceId: absence.input.id, method } });
    }
    if (absence.maintenance && absence.maintenance.amount > 0) {
      grossLine({ code: absence.input.kind === "WORK_ACCIDENT" ? "AT_MAINTENANCE" : "SICK_MAINTENANCE", label: `Indemnité complémentaire ${absence.input.kind === "WORK_ACCIDENT" ? "accident du travail" : "maladie"} (${absence.maintenance.fullRateDays} j à 90 %${absence.maintenance.reducedRateDays ? `, ${absence.maintenance.reducedRateDays} j à 66,66 %` : ""}, IJSS déduites)`, amount: absence.maintenance.amount, source: absence.maintenance.rule, detail: { absenceId: absence.input.id, ijssDeducted: absence.maintenance.ijssDeducted, waitingDays: absence.maintenance.waitingDays, fullRateDays: absence.maintenance.fullRateDays, reducedRateDays: absence.maintenance.reducedRateDays } });
    }
  }

  if (paidLeaveAbsences.length > 0 || input.paidLeave) {
    const daysTaken = paidLeaveAbsences.reduce((total, absence) => total + paidLeaveDaysForAbsence({ absenceStart: absence.input.start, absenceEnd: absence.input.end, windowStart, windowEnd, method: org.paidLeaveMethod, schedule: pay.schedule, holidays }), 0);
    const previousAvailable = Math.max(0, balances.previousAcquired - balances.previousTaken);
    const takenFromPrevious = Math.min(daysTaken, previousAvailable);
    const takenFromCurrent = daysTaken - takenFromPrevious;
    if (daysTaken > 0 && takenFromCurrent > Math.max(0, balances.currentAcquired - balances.currentTaken) + 1e-9) {
      warnings.push(`${employee.displayName} prend plus de congés payés que son solde acquis : le dépassement est à régulariser (congés par anticipation).`);
    }
    // Acquisition : 2,5 jours ouvrables par mois de travail effectif (2,08 ouvrés) ; 2 jours par mois de maladie non professionnelle.
    const monthlyRight = org.paidLeaveMethod === "OUVRABLES" ? 2.5 : 25 / 12;
    const sicknessRight = org.paidLeaveMethod === "OUVRABLES" ? 2 : 2 * (25 / 30);
    const sicknessHours = valued.filter((absence) => absence.input.kind === "SICK_LEAVE").reduce((total, absence) => total + absence.hours, 0);
    const unpaidHours = valued.filter((absence) => absence.input.kind === "UNPAID_LEAVE" || absence.input.kind === "OTHER_UNPAID").reduce((total, absence) => total + absence.hours, 0);
    const effectiveShare = Math.max(0, employedHours - sicknessHours - unpaidHours) / monthScheduledHours;
    const sicknessShare = sicknessHours / monthScheduledHours;
    const acquiredThisMonth = Math.round((monthlyRight * effectiveShare + sicknessRight * sicknessShare) * 100) / 100;
    paidLeaveOutcome = {
      daysTaken,
      takenFromPrevious,
      takenFromCurrent,
      acquiredThisMonth,
      balancesAfter: {
        ...balances,
        previousTaken: balances.previousTaken + takenFromPrevious,
        currentTaken: balances.currentTaken + takenFromCurrent,
        currentAcquired: Math.round((balances.currentAcquired + acquiredThisMonth) * 100) / 100,
      },
      indemnityMethod: paidLeaveAbsences.length > 0 ? (lines.some((line) => line.code === "CP_INDEMNITY" && line.detail?.method === "TENTH") ? "TENTH" : "SALARY_MAINTENANCE") : null,
      tenthCompared: balances.referenceGross !== null && balances.referenceGross !== undefined && (balances.referenceAcquiredDays ?? 0) > 0,
    };
    if (daysTaken > 0 && !paidLeaveOutcome.tenthCompared) warnings.push("Congés payés indemnisés au maintien de salaire : la comparaison avec la règle du dixième sera faite en fin de période de référence, faute de brut de référence renseigné.");
  }

  // --- Heures supplémentaires et complémentaires -------------------------------------
  const overtime = input.overtime ?? {};
  const hsFirst = overtime.hoursFirstBand ?? 0;
  const hsSecond = overtime.hoursSecondBand ?? 0;
  const hsFirstRate = overtime.firstBandRate ?? 0.25;
  const hsSecondRate = overtime.secondBandRate ?? 0.5;
  for (const [hours, label] of [[hsFirst, "premières"], [hsSecond, "suivantes"]] as const) assertAmount(hours, `Les heures supplémentaires ${label}`);
  if (hsFirstRate < 0.1 || hsSecondRate < 0.1) throw new Error("La majoration des heures supplémentaires ne peut pas être inférieure à 10 % (C. trav. art. L3121-33).");
  const complementary = input.complementaryHours ?? {};
  const hcTenth = complementary.hoursWithinTenth ?? 0;
  const hcBeyond = complementary.hoursBeyondTenth ?? 0;
  assertAmount(hcTenth, "Les heures complémentaires");
  assertAmount(hcBeyond, "Les heures complémentaires au-delà du dixième");
  const isPartTime = pay.contractMonthlyHours < LEGAL_MONTHLY_HOURS - 0.01;
  if ((hcTenth > 0 || hcBeyond > 0) && !isPartTime) throw new Error("Des heures complémentaires ne peuvent être payées qu'à un salarié à temps partiel.");
  if ((hsFirst > 0 || hsSecond > 0) && isPartTime) throw new Error("Un salarié à temps partiel effectue des heures complémentaires, pas des heures supplémentaires.");
  if (hcTenth > pay.contractMonthlyHours / 10 + 1e-9) throw new Error("Les heures complémentaires à 10 % dépassent le dixième de l'horaire contractuel.");
  if (hcTenth + hcBeyond > pay.contractMonthlyHours / 3 + 1e-9) throw new Error("Les heures complémentaires dépassent le tiers de l'horaire contractuel.");
  if (hcTenth + hcBeyond > 0 && pay.contractMonthlyHours + hcTenth + hcBeyond >= LEGAL_MONTHLY_HOURS - 0.01) throw new Error("Les heures complémentaires ne peuvent pas porter la durée du travail au niveau de la durée légale.");
  const hcTenthRate = complementary.withinTenthRate ?? 0.1;
  const hcBeyondRate = complementary.beyondTenthRate ?? 0.25;

  const overtimeLines: Array<{ code: string; label: string; hours: number; rate: number; amount: number; employerDeductionEligible: boolean }> = [];
  if (hsFirst > 0) overtimeLines.push({ code: "HS_25", label: `Heures supplémentaires ${Math.round(hsFirstRate * 100)} %`, hours: hsFirst, rate: hsFirstRate, amount: round2(hsFirst * hourlyRate * (1 + hsFirstRate)), employerDeductionEligible: true });
  if (hsSecond > 0) overtimeLines.push({ code: "HS_50", label: `Heures supplémentaires ${Math.round(hsSecondRate * 100)} %`, hours: hsSecond, rate: hsSecondRate, amount: round2(hsSecond * hourlyRate * (1 + hsSecondRate)), employerDeductionEligible: true });
  if (hcTenth > 0) overtimeLines.push({ code: "HC_10", label: `Heures complémentaires ${Math.round(hcTenthRate * 100)} %`, hours: hcTenth, rate: hcTenthRate, amount: round2(hcTenth * hourlyRate * (1 + hcTenthRate)), employerDeductionEligible: false });
  if (hcBeyond > 0) overtimeLines.push({ code: "HC_25", label: `Heures complémentaires ${Math.round(hcBeyondRate * 100)} %`, hours: hcBeyond, rate: hcBeyondRate, amount: round2(hcBeyond * hourlyRate * (1 + hcBeyondRate)), employerDeductionEligible: false });
  for (const line of overtimeLines) grossLine({ code: line.code, label: line.label, quantity: round2(line.hours), unit: "HOURS", rate: round4(hourlyRate * (1 + line.rate)), amount: line.amount, source: line.code.startsWith("HS") ? "C. trav. art. L3121-36 (ou taux conventionnel)" : "C. trav. art. L3123-8 et L3123-29" });

  // --- Primes, avantages en nature, part patronale excédentaire des titres ----------
  let bonusesExcludedFromLeaveBase = 0;
  for (const bonus of input.bonuses ?? []) {
    assertAmount(bonus.amount, `Le montant de « ${bonus.label} »`);
    if (bonus.amount > 0) grossLine({ code: bonus.code, label: bonus.label, amount: bonus.amount, source: "Élément de rémunération soumis à cotisations", detail: bonus.excludedFromPaidLeaveBase ? { excludedFromPaidLeaveBase: true } : undefined });
    if (bonus.excludedFromPaidLeaveBase) bonusesExcludedFromLeaveBase += bonus.amount;
  }
  const benefitsTotal = (input.benefitsInKind ?? []).reduce((total, benefit) => {
    assertAmount(benefit.amount, `L'avantage en nature « ${benefit.label} »`);
    if (benefit.amount > 0) grossLine({ code: benefit.code, label: benefit.label, amount: benefit.amount, source: "Avantage en nature (CSS art. L242-1), évalué selon les barèmes Urssaf" });
    return total + benefit.amount;
  }, 0);

  let mealVoucherEmployeeShare = 0;
  let mealVoucherExcess = 0;
  if (input.mealVouchers && input.mealVouchers.count > 0) {
    const vouchers = input.mealVouchers;
    if (!Number.isInteger(vouchers.count) || vouchers.count < 0) throw new Error("Le nombre de titres-restaurant doit être un entier positif.");
    assertAmount(vouchers.faceValue, "La valeur faciale du titre-restaurant", { allowZero: false });
    if (vouchers.employerShare < expenseParams.value.mealVoucherEmployerShareMin - 1e-9 || vouchers.employerShare > expenseParams.value.mealVoucherEmployerShareMax + 1e-9) {
      throw new Error("La part patronale des titres-restaurant doit être comprise entre 50 % et 60 % de leur valeur pour être exonérée.");
    }
    const employerPerVoucher = round2(vouchers.faceValue * vouchers.employerShare);
    const exemptPerVoucher = Math.min(employerPerVoucher, expenseParams.value.mealVoucherEmployerExemptPerVoucher);
    mealVoucherExcess = round2((employerPerVoucher - exemptPerVoucher) * vouchers.count);
    mealVoucherEmployeeShare = round2((vouchers.faceValue - employerPerVoucher) * vouchers.count);
    if (mealVoucherExcess > 0) grossLine({ code: "MEAL_VOUCHER_EXCESS", label: "Titres-restaurant : part patronale au-delà de l'exonération", quantity: vouchers.count, unit: "UNITS", amount: mealVoucherExcess, source: expenseParams.source });
    sources.add(expenseParams.source);
  }

  let transportReimbursement = 0;
  let transportExcess = 0;
  if (input.publicTransport && input.publicTransport.monthlySubscription > 0) {
    const transport = input.publicTransport;
    assertAmount(transport.monthlySubscription, "Le coût de l'abonnement de transport");
    if (transport.employerShare < 0.5) throw new Error("L'employeur doit prendre en charge au moins 50 % de l'abonnement de transport public (C. trav. art. R3261-1).");
    if (transport.employerShare > 1) throw new Error("La prise en charge du transport ne peut pas dépasser 100 %.");
    transportReimbursement = round2(transport.monthlySubscription * transport.employerShare);
    const exempt = round2(transport.monthlySubscription * Math.min(transport.employerShare, expenseParams.value.publicTransportExemptShareCap));
    transportExcess = round2(transportReimbursement - exempt);
    if (transportExcess > 0) grossLine({ code: "TRANSPORT_EXCESS", label: "Prise en charge du transport au-delà de 75 %", amount: transportExcess, source: expenseParams.source });
  }

  // --- Fin de contrat : solde de tout compte -------------------------------------------
  const severanceTreatment = input.termination
    ? addTerminationLines({ input, lines, grossLine, paidLeaveOutcome, balances, warnings, sources, pmss: pmss.value, periodFirst: period.first, periodLast: period.last })
    : NO_SEVERANCE;

  // --- Brut ------------------------------------------------------------------------
  // Brut versé (y compris la fraction d'indemnité de rupture exclue de l'assiette) et brut soumis à cotisations.
  const grossTotal = round2(lines.filter((line) => line.section === "GROSS").reduce((total, line) => total + (line.amount ?? 0), 0));
  const G = round2(grossTotal - severanceTreatment.exemptFromContributions);
  if (G < 0) throw new Error("Le brut du mois est négatif : vérifiez les absences et retenues saisies.");

  // Assiette du dixième de la période d'acquisition : brut du mois hors primes annuelles, indemnités de rupture et indemnité compensatrice.
  if (paidLeaveOutcome) {
    const compensation = lines.find((line) => line.code === "PAID_LEAVE_COMPENSATION")?.amount ?? 0;
    const leaveBase = Math.max(0, G - bonusesExcludedFromLeaveBase - severanceTreatment.subjectToContributions - compensation);
    const reference = paidLeaveOutcome.balancesAfter.currentReferenceGross;
    // Un brut de référence inconnu ne repart de zéro qu'au début d'une période d'acquisition (juin) ou à l'embauche.
    const startsNow = month === 6 || employee.hireDate >= period.first;
    if (reference !== null && reference !== undefined) paidLeaveOutcome.balancesAfter = { ...paidLeaveOutcome.balancesAfter, currentReferenceGross: round2(reference + leaveBase) };
    else if (startsNow) paidLeaveOutcome.balancesAfter = { ...paidLeaveOutcome.balancesAfter, currentReferenceGross: round2(leaveBase) };
  }

  // --- Plafond de la sécurité sociale proratisé ------------------------------------
  const unpaidCalendarDays = valued.reduce((total, absence) => total + absence.unpaidCalendarDays, 0);
  const coveredDays = Math.max(0, employedCalendarDays - unpaidCalendarDays);
  const partTimeRatio = Math.min(1, (pay.contractMonthlyHours + hcTenth + hcBeyond) / LEGAL_MONTHLY_HOURS);
  const ceilingProrated = round2(pmss.value * partTimeRatio * coveredDays / period.days);
  const ceilingReasons: string[] = [];
  if (partTimeRatio < 1) ceilingReasons.push(`temps partiel ${round2(partTimeRatio * 100)} %`);
  if (coveredDays < period.days) ceilingReasons.push(`${coveredDays} jours sur ${period.days}`);

  // --- Bases cumulées (régularisation progressive) -----------------------------------
  const ytd = input.yearToDate && input.yearToDate.year === year ? input.yearToDate : emptyYearToDate(year);
  if (input.yearToDate && input.yearToDate.year !== year) warnings.push("Les cumuls fournis concernent une autre année : ils ont été ignorés.");
  const cumGross = ytd.grossSubject + G;
  const cumCeiling = ytd.ceiling + ceilingProrated;
  const cumT1 = Math.min(cumGross, cumCeiling);
  const cumT2 = Math.min(Math.max(cumGross - cumCeiling, 0), 7 * cumCeiling);
  const cumFour = Math.min(cumGross, 4 * cumCeiling);
  const baseT1 = round2(cumT1 - ytd.baseT1);
  const baseT2 = round2(cumT2 - ytd.baseT2);
  const baseFour = round2(cumFour - ytd.baseFourCeilings);
  // CET : due dès que la rémunération dépasse le plafond, sur la rémunération jusqu'à 8 plafonds (régularisée elle aussi).
  const cumCet = cumGross > cumCeiling + 1e-9 ? Math.min(cumGross, 8 * cumCeiling) : 0;
  const baseCet = round2(cumCet - ytd.baseCet);

  const contributions: PayslipLine[] = [];
  const contribution = (line: Omit<PayslipLine, "amount" | "employerAmount"> & { amount?: number; employerAmount?: number }) => {
    const amount = round2(line.amount ?? 0);
    const employerAmount = round2(line.employerAmount ?? 0);
    if (amount === 0 && employerAmount === 0) return;
    contributions.push({ ...line, amount, employerAmount });
  };

  // Apprentis : exonération salariale jusqu'à 50 % du Smic (contrats conclus depuis le 1er mars 2025), 79 % avant.
  const smicMonthlyFull = smicHourly.value * LEGAL_MONTHLY_HOURS;
  const apprenticeNewRegime = isApprentice && employee.hireDate >= "2025-03-01";
  const apprenticeExemptShare = isApprentice ? (apprenticeNewRegime ? 0.5 : 0.79) : 0;
  const apprenticeEmployeeBase = isApprentice ? Math.max(0, G - apprenticeExemptShare * smicMonthlyFull) : G;
  const employeeScale = G > 0 ? apprenticeEmployeeBase / G : 0;
  if (isApprentice) sources.add("Apprentis : exonération des cotisations salariales jusqu'à 50 % du Smic (79 % pour les contrats antérieurs au 1er mars 2025), CSS art. L6243-2 C. trav.");

  // SANTÉ
  contribution({ code: "MALADIE", label: "Sécurité sociale - Maladie Maternité Invalidité Décès", section: "SANTE", base: G, employerRate: r.maladieEmployer, employerAmount: G * r.maladieEmployer, source: rates.source });
  if (org.alsaceMoselle) {
    contribution({ code: "MALADIE_ALSACE_MOSELLE", label: "Sécurité sociale - Maladie régime local Alsace-Moselle", section: "SANTE", base: G, rate: r.alsaceMoselleEmployee, amount: G * r.alsaceMoselleEmployee * (isApprentice ? employeeScale : 1), source: "CSS art. L325-1 et D325-1 ; régime local d'assurance maladie d'Alsace-Moselle, taux de 1,30 % en 2026" });
  }
  const prevoyanceRates = employee.executive ? org.prevoyance?.cadre : org.prevoyance?.nonCadre;
  let prevoyanceEmployer = 0;
  let prevoyanceEmployee = 0;
  {
    let employerT1 = prevoyanceRates?.employerT1 ?? 0;
    const employeeT1 = prevoyanceRates?.employeeT1 ?? 0;
    if (employee.executive && employerT1 < r.prevoyanceCadreMinimumEmployer - 1e-9) {
      if (prevoyanceRates) warnings.push("La part patronale de prévoyance des cadres sur la tranche 1 est inférieure au minimum de 1,50 % : le minimum conventionnel est appliqué.");
      employerT1 = r.prevoyanceCadreMinimumEmployer;
    }
    const employeeT2 = prevoyanceRates?.employeeT2 ?? 0;
    const employerT2 = prevoyanceRates?.employerT2 ?? 0;
    const source = employee.executive ? "ANI du 17 novembre 2017 (1,50 % tranche 1 minimum) et contrat de prévoyance" : "Contrat de prévoyance de l'entreprise";
    prevoyanceEmployee = round2(baseT1 * employeeT1) + round2(baseT2 * employeeT2);
    prevoyanceEmployer = round2(baseT1 * employerT1) + round2(baseT2 * employerT2);
    contribution({ code: "PREVOYANCE", label: "Complémentaire Incapacité Invalidité Décès", section: "SANTE", base: baseT1, rate: employeeT1, employerRate: employerT1, amount: baseT1 * employeeT1, employerAmount: baseT1 * employerT1, source });
    if (employeeT2 > 0 || employerT2 > 0) contribution({ code: "PREVOYANCE_T2", label: "Complémentaire Incapacité Invalidité Décès tranche 2", section: "SANTE", base: baseT2, rate: employeeT2, employerRate: employerT2, amount: baseT2 * employeeT2, employerAmount: baseT2 * employerT2, source });
  }
  let healthEmployer = 0;
  if (org.healthPlan && org.healthPlan.monthlyAmount > 0) {
    const prorata = employedCalendarDays < period.days ? employedCalendarDays / period.days : 1;
    const total = org.healthPlan.monthlyAmount * prorata;
    healthEmployer = round2(total * org.healthPlan.employerShare);
    const healthEmployee = round2(total - healthEmployer);
    contribution({ code: "SANTE", label: "Complémentaire Santé", section: "SANTE", amount: healthEmployee, employerAmount: healthEmployer, source: "Contrat collectif de complémentaire santé (C. sécu. soc. art. L911-7)", detail: { prorata: round4(prorata) } });
  }

  // ACCIDENTS DU TRAVAIL
  contribution({ code: "ATMP", label: "Accidents du travail - Maladies professionnelles", section: "ACCIDENTS_TRAVAIL", base: G, employerRate: org.atmpRatePercent / 100, employerAmount: G * org.atmpRatePercent / 100, source: "Taux notifié par la Carsat" });

  // RETRAITE
  contribution({ code: "VIEILLESSE_PLAF", label: "Sécurité sociale plafonnée", section: "RETRAITE", base: baseT1, rate: r.vieillessePlafEmployee, employerRate: r.vieillessePlafEmployer, amount: baseT1 * r.vieillessePlafEmployee * (isApprentice ? employeeScale : 1), employerAmount: baseT1 * r.vieillessePlafEmployer, source: rates.source });
  contribution({ code: "VIEILLESSE_DEPLAF", label: "Sécurité sociale déplafonnée", section: "RETRAITE", base: G, rate: r.vieillesseDeplafEmployee, employerRate: r.vieillesseDeplafEmployer, amount: G * r.vieillesseDeplafEmployee * (isApprentice ? employeeScale : 1), employerAmount: G * r.vieillesseDeplafEmployer, source: rates.source });
  const t1EmployeeRate = r.retraiteT1Employee + r.cegT1Employee;
  const t1EmployerRate = r.retraiteT1Employer + r.cegT1Employer;
  const t2EmployeeRate = r.retraiteT2Employee + r.cegT2Employee;
  const t2EmployerRate = r.retraiteT2Employer + r.cegT2Employer;
  const apprenticeFactor = isApprentice ? employeeScale : 1;
  contribution({ code: "RETRAITE_T1", label: "Complémentaire Tranche 1", section: "RETRAITE", base: baseT1, rate: t1EmployeeRate, employerRate: t1EmployerRate, amount: baseT1 * t1EmployeeRate * apprenticeFactor, employerAmount: baseT1 * t1EmployerRate, source: "Agirc-Arrco : tranche 1 3,15 % / 4,72 % et CEG 0,86 % / 1,29 %", detail: { agircArrcoEmployee: r.retraiteT1Employee, agircArrcoEmployer: r.retraiteT1Employer, cegEmployee: r.cegT1Employee, cegEmployer: r.cegT1Employer } });
  contribution({ code: "RETRAITE_T2", label: "Complémentaire Tranche 2", section: "RETRAITE", base: baseT2, rate: t2EmployeeRate, employerRate: t2EmployerRate, amount: baseT2 * t2EmployeeRate * apprenticeFactor, employerAmount: baseT2 * t2EmployerRate, source: "Agirc-Arrco : tranche 2 8,64 % / 12,95 % et CEG 1,08 % / 1,62 %", detail: { agircArrcoEmployee: r.retraiteT2Employee, agircArrcoEmployer: r.retraiteT2Employer, cegEmployee: r.cegT2Employee, cegEmployer: r.cegT2Employer } });
  contribution({ code: "CET", label: "Contribution d'équilibre technique (CET)", section: "RETRAITE", base: baseCet, rate: r.cetEmployee, employerRate: r.cetEmployer, amount: baseCet * r.cetEmployee * apprenticeFactor, employerAmount: baseCet * r.cetEmployer, source: "Agirc-Arrco : CET 0,14 % / 0,21 % sur la rémunération jusqu'à 8 plafonds, due au-delà du plafond" });

  // FAMILLE
  contribution({ code: "FAMILLE", label: "Famille", section: "FAMILLE", base: G, employerRate: r.allocationsFamiliales, employerAmount: G * r.allocationsFamiliales, source: rates.source });

  // ASSURANCE CHÔMAGE
  contribution({ code: "CHOMAGE", label: "Assurance chômage", section: "CHOMAGE", base: baseFour, employerRate: r.chomage, employerAmount: baseFour * r.chomage, source: rates.source });
  contribution({ code: "AGS", label: "AGS (garantie des salaires)", section: "CHOMAGE", base: baseFour, employerRate: r.ags, employerAmount: baseFour * r.ags, source: rates.source });
  if (employee.executive) contribution({ code: "APEC", label: "Apec", section: "CHOMAGE", base: baseFour, rate: r.apecEmployee, employerRate: r.apecEmployer, amount: baseFour * r.apecEmployee, employerAmount: baseFour * r.apecEmployer, source: rates.source });

  // AUTRES CONTRIBUTIONS DUES PAR L'EMPLOYEUR
  const others: Array<[string, string, number, number]> = [];
  others.push(["CSA", "Contribution solidarité autonomie", G, r.csa]);
  if (thresholds.atLeast50) others.push(["FNAL", "Fnal", G, r.fnal50AndMore]);
  else others.push(["FNAL", "Fnal", baseT1, r.fnalUnder50]);
  if (thresholds.atLeast11 && org.mobilityRatePercent > 0) others.push(["VERSEMENT_MOBILITE", "Versement mobilité", G, org.mobilityRatePercent / 100]);
  others.push(["DIALOGUE_SOCIAL", "Contribution au dialogue social", G, r.dialogueSocial]);
  if (!(isApprentice && !thresholds.atLeast11)) {
    others.push(["FORMATION", "Contribution à la formation professionnelle", G, thresholds.atLeast11 ? r.formation11AndMore : r.formationUnder11]);
    if (org.alsaceMoselle) others.push(["TAXE_APPRENTISSAGE", "Taxe d'apprentissage (Alsace-Moselle)", G, r.taxeApprentissageAlsaceMoselle]);
    else {
      others.push(["TAXE_APPRENTISSAGE", "Taxe d'apprentissage", G, r.taxeApprentissage]);
      others.push(["TAXE_APPRENTISSAGE_SOLDE", "Solde de la taxe d'apprentissage", G, r.taxeApprentissageSolde]);
    }
  }
  if (employee.contract === "CDD") others.push(["CPF_CDD", "Contribution CPF-CDD", G, r.cpfCdd]);
  if (thresholds.atLeast11 && prevoyanceEmployer + healthEmployer > 0) others.push(["FORFAIT_SOCIAL", "Forfait social sur la prévoyance", prevoyanceEmployer + healthEmployer, r.forfaitSocialPrevoyance]);
  if (severanceTreatment.specificContributionBase > 0) others.push(["CONTRIBUTION_RUPTURE", "Contribution patronale spécifique sur l'indemnité de rupture", severanceTreatment.specificContributionBase, severanceTreatment.specificContributionRate]);
  const otherSource = (code: string) => code === "VERSEMENT_MOBILITE" ? "Taux de versement mobilité de la commune (Urssaf)" : code === "CONTRIBUTION_RUPTURE" ? severanceTreatment.source : rates.source;
  for (const [code, label, base, rate] of others) contribution({ code, label, section: "AUTRES_EMPLOYEUR", base: round2(base), employerRate: rate, employerAmount: base * rate, source: otherSource(code) });

  // Réintégration de la prévoyance patronale excédentaire : non prise en charge.
  const employerWelfare = prevoyanceEmployer + healthEmployer;
  const welfareSocialLimit = Math.min(0.06 * pmss.value + 0.015 * G, 0.12 * pmss.value);
  if (employerWelfare > welfareSocialLimit + 0.01) throw new Error("Les contributions patronales de prévoyance et de santé dépassent la limite d'exclusion d'assiette (CSS art. D242-1) : la réintégration n'est pas encore prise en charge, le calcul est bloqué.");

  // --- Heures supplémentaires : exonérations -----------------------------------------
  const overtimeGross = round2(overtimeLines.reduce((total, line) => total + line.amount, 0) + structuralAmount * (G > 0 ? Math.max(0, 1 - (totalAbsenceDeduction + entryExitDeduction) / Math.max(pay.monthlyBaseSalary, 0.01)) : 0));
  const overtimeHoursForDeduction = overtimeLines.filter((line) => line.employerDeductionEligible).reduce((total, line) => total + line.hours, 0)
    + structuralHours * Math.max(0, 1 - (totalAbsenceDeduction + entryExitDeduction) / Math.max(pay.monthlyBaseSalary, 0.01));
  const taxExemptGrossCap = overtimeParams.value.annualTaxExemptNetCap / (1 - (1 - r.csgBaseAbatement) * r.csgDeductible);
  const overtimeTaxExempt = round2(Math.max(0, Math.min(overtimeGross, taxExemptGrossCap - ytd.overtimeTaxExemptGross)));
  if (overtimeGross > 0 && overtimeTaxExempt < overtimeGross) warnings.push("Le plafond annuel de 7 500 € nets d'heures supplémentaires défiscalisées est atteint : le dépassement est imposable.");

  // --- CSG / CRDS --------------------------------------------------------------------
  // Les indemnités de rupture ne bénéficient pas de l'abattement de 1,75 % : elles sont traitées à part.
  const regularCsgGross = G - severanceTreatment.subjectToContributions;
  let csgGross = regularCsgGross;
  if (isApprentice) csgGross = apprenticeNewRegime ? Math.max(0, regularCsgGross - 0.5 * smicMonthlyFull) : 0;
  const csgCumGross = ytd.csgGross + csgGross;
  const csgCumWithin = Math.min(csgCumGross, 4 * cumCeiling);
  const csgWithinMonth = csgCumWithin - ytd.csgWithinFourCeilings;
  const csgBeyondMonth = csgGross - csgWithinMonth;
  const welfareForCsg = isApprentice && csgGross === 0 ? 0 : employerWelfare;
  const csgBaseTotal = round2(csgWithinMonth * (1 - r.csgBaseAbatement) + csgBeyondMonth + welfareForCsg);
  const csgOvertimeBase = isApprentice && csgGross === 0 ? 0 : round2(overtimeTaxExempt * (1 - r.csgBaseAbatement));
  const csgMainBase = round2(csgBaseTotal - csgOvertimeBase);
  contribution({ code: "CSG_DEDUCTIBLE", label: "CSG déductible de l'impôt sur le revenu", section: "CSG_CRDS", base: csgMainBase, rate: r.csgDeductible, amount: csgMainBase * r.csgDeductible, source: "CSS art. L136-1-1 et L136-8 (assiette 98,25 % jusqu'à 4 plafonds)" });
  contribution({ code: "CSG_CRDS_NON_DEDUCTIBLE", label: "CSG/CRDS non déductible de l'impôt sur le revenu", section: "CSG_CRDS", base: csgMainBase, rate: r.csgNonDeductible + r.crds, amount: csgMainBase * r.csgNonDeductible + (csgMainBase + csgOvertimeBase) * r.crds, source: "CSS art. L136-8 ; ordonnance n° 96-50 (CRDS)", detail: { crdsBase: round2(csgMainBase + csgOvertimeBase) } });
  if (csgOvertimeBase > 0) contribution({ code: "CSG_NON_IMPOSABLE", label: "CSG sur les heures supplémentaires défiscalisées", section: "CSG_CRDS", base: csgOvertimeBase, rate: r.csgDeductible + r.csgNonDeductible, amount: csgOvertimeBase * (r.csgDeductible + r.csgNonDeductible), source: "CSS art. L136-8 ; BOSS, heures supplémentaires" });
  if (severanceTreatment.csgTaxableBase > 0) {
    const base = severanceTreatment.csgTaxableBase;
    contribution({ code: "CSG_RUPTURE_DEDUCTIBLE", label: "CSG déductible sur l'indemnité de rupture (fraction imposable)", section: "CSG_CRDS", base, rate: r.csgDeductible, amount: base * r.csgDeductible, source: "CSS art. L136-1-1 III 5° : assiette à 100 %, sans abattement" });
    contribution({ code: "CSG_CRDS_RUPTURE_NON_DEDUCTIBLE", label: "CSG/CRDS non déductible sur l'indemnité de rupture (fraction imposable)", section: "CSG_CRDS", base, rate: r.csgNonDeductible + r.crds, amount: base * (r.csgNonDeductible + r.crds), source: "CSS art. L136-1-1 III 5° et L136-8" });
  }
  if (severanceTreatment.csgTaxExemptBase > 0) {
    const base = severanceTreatment.csgTaxExemptBase;
    contribution({ code: "CSG_CRDS_RUPTURE_EXONEREE_IR", label: "CSG/CRDS sur l'indemnité de rupture (fraction exonérée d'impôt, non déductible)", section: "CSG_CRDS", base, rate: r.csgDeductible + r.csgNonDeductible + r.crds, amount: base * (r.csgDeductible + r.csgNonDeductible + r.crds), source: "CSS art. L136-1-1 III 5° : CSG due au-delà de l'indemnité légale ou conventionnelle, non déductible sur un revenu exonéré" });
  }

  // Réduction salariale sur heures supplémentaires : taux effectif des cotisations vieillesse salariales, dans la limite de 11,31 %.
  if (overtimeGross > 0) {
    const pensionEmployee = contributions.filter((line) => ["VIEILLESSE_PLAF", "VIEILLESSE_DEPLAF", "RETRAITE_T1", "RETRAITE_T2", "CET"].includes(line.code)).reduce((total, line) => total + (line.amount ?? 0), 0);
    const effectiveRate = G > 0 ? Math.min(overtimeParams.value.employeeReductionCap, pensionEmployee / G) : 0;
    const reduction = round2(overtimeGross * effectiveRate);
    if (reduction > 0) contribution({ code: "REDUCTION_HS_SALARIALE", label: "Réduction de cotisations salariales sur heures supplémentaires", section: "EXONERATIONS", base: overtimeGross, rate: round4(effectiveRate), amount: -reduction, source: overtimeParams.source });
  }
  if (overtimeHoursForDeduction > 0) {
    const perHour = thresholds.atLeast20 ? overtimeParams.value.employerDeduction20AndMore : overtimeParams.value.employerDeductionUnder20;
    contribution({ code: "DEDUCTION_HS_PATRONALE", label: "Déduction forfaitaire patronale sur heures supplémentaires", section: "EXONERATIONS", quantity: round2(overtimeHoursForDeduction), unit: "HOURS", employerRate: perHour, employerAmount: -(overtimeHoursForDeduction * perHour), source: overtimeParams.source });
  }

  // --- RGDU (calcul cumulé sur l'année civile) ---------------------------------------
  const basePaidRatio = pay.monthlyBaseSalary > 0
    ? Math.min(1, Math.max(0, (pay.monthlyBaseSalary - entryExitDeduction - totalAbsenceDeduction + paidLeaveIndemnityTotal + valued.reduce((total, absence) => total + (absence.maintenance?.amount ?? 0), 0)) / pay.monthlyBaseSalary))
    : 0;
  const rgduHours = pay.contractMonthlyHours * basePaidRatio + hsFirst + hsSecond + hcTenth + hcBeyond;
  // Le Smic de référence n'est pas arrondi : seul le coefficient l'est, à quatre décimales.
  const rgduSmicMonth = round4(rgduSmicHourly.value * rgduHours);
  const cumSmic = ytd.rgduSmic + rgduSmicMonth;
  const cumRemuneration = ytd.rgduRemuneration + G;
  const tDelta = thresholds.atLeast50 ? rgdu.value.tDelta50AndMore : rgdu.value.tDeltaUnder50;
  let rgduCoefficient = 0;
  if (cumRemuneration > 0 && cumRemuneration < rgdu.value.exitSmicMultiple * cumSmic) {
    const raw = rgdu.value.tMin + tDelta * Math.pow(0.5 * (rgdu.value.exitSmicMultiple * cumSmic / cumRemuneration - 1), rgdu.value.exponent);
    rgduCoefficient = round4(Math.min(raw, rgdu.value.tMin + tDelta));
  }
  const rgduCumulative = round2(rgduCoefficient * cumRemuneration);
  const rgduMonth = round2(rgduCumulative - ytd.rgduAmount);
  if (rgduMonth !== 0) {
    contribution({ code: "RGDU", label: rgduMonth > 0 ? "Réduction générale dégressive unique" : "Régularisation de la réduction générale dégressive unique", section: "EXONERATIONS", base: G, employerRate: rgduCoefficient, employerAmount: -rgduMonth, source: `${rgdu.source} ; ${rgduSmicHourly.source}`, detail: { cumulativeSmic: round2(cumSmic), cumulativeRemuneration: round2(cumRemuneration), cumulativeReduction: rgduCumulative } });
    sources.add(rgduSmicHourly.source);
  }

  lines.push(...contributions);

  // --- Nets -------------------------------------------------------------------------
  const employeeContributions = round2(contributions.reduce((total, line) => total + (line.amount ?? 0), 0));
  const employerContributions = round2(contributions.reduce((total, line) => total + (line.employerAmount ?? 0), 0));
  const employerReductions = round2(contributions.reduce((total, line) => total + Math.min(0, line.employerAmount ?? 0), 0));
  const NON_DEDUCTIBLE_CODES = new Set(["CSG_CRDS_NON_DEDUCTIBLE", "CSG_NON_IMPOSABLE", "CSG_CRDS_RUPTURE_NON_DEDUCTIBLE", "CSG_CRDS_RUPTURE_EXONEREE_IR"]);
  const csgNonDeductibleAmount = round2(contributions.filter((line) => NON_DEDUCTIBLE_CODES.has(line.code)).reduce((total, line) => total + (line.amount ?? 0), 0));

  const netItems: PayslipLine[] = [];
  const netItem = (line: Omit<PayslipLine, "section">) => { if ((line.amount ?? 0) !== 0) netItems.push({ section: "NET_ITEMS", ...line, amount: round2(line.amount ?? 0) }); };
  if (benefitsTotal > 0) netItem({ code: "BENEFITS_IN_KIND_DEDUCTION", label: "Avantages en nature (déjà inclus dans le brut)", amount: -benefitsTotal, source: "Avantage non versé en espèces" });
  if (mealVoucherExcess > 0) netItem({ code: "MEAL_VOUCHER_EXCESS_DEDUCTION", label: "Titres-restaurant : part patronale excédentaire (remise en titres)", amount: -mealVoucherExcess, source: expenseParams.source });
  if (mealVoucherEmployeeShare > 0) netItem({ code: "MEAL_VOUCHER_EMPLOYEE", label: `Titres-restaurant : part salariale (${input.mealVouchers?.count ?? 0} titres)`, quantity: input.mealVouchers?.count, unit: "UNITS", amount: -mealVoucherEmployeeShare, source: expenseParams.source });
  if (transportReimbursement > 0) netItem({ code: "PUBLIC_TRANSPORT", label: "Remboursement transport public domicile-travail", amount: transportReimbursement - transportExcess, source: "C. trav. art. L3261-2 et R3261-1 (prise en charge exonérée jusqu'à 75 %)" });
  for (const expense of input.expenses ?? []) {
    assertAmount(expense.amount, `Le remboursement « ${expense.label} »`);
    netItem({ code: expense.code, label: expense.label, amount: expense.amount, source: "Frais professionnels remboursés sur justificatifs ou dans les limites d'exonération (arrêté du 20 décembre 2002)" });
  }
  let ijssNetTotal = 0;
  let ijssTaxableTotal = 0;
  for (const absence of valued) {
    if (!absence.ijss || absence.ijss.gross <= 0) continue;
    if (org.ijssSubrogation) {
      ijssNetTotal += absence.ijss.net;
      ijssTaxableTotal += absence.ijss.taxable;
      netItem({ code: "IJSS_SUBROGATION", label: `Indemnités journalières de sécurité sociale nettes (subrogation, ${absence.ijss.days} j)`, quantity: absence.ijss.days, unit: "DAYS", amount: absence.ijss.net, source: "Subrogation de l'employeur (CSS art. R323-11) ; CSG 6,2 % et CRDS 0,5 % précomptées par la CPAM", detail: { absenceId: absence.input.id, ijssGross: absence.ijss.gross, ijssTaxable: absence.ijss.taxable, estimated: absence.ijss.estimated } });
      if (absence.ijss.estimated) warnings.push(`IJSS estimées pour ${employee.displayName} : remplacez l'estimation par le montant de l'attestation de la CPAM dès réception.`);
    }
  }
  for (const adjustment of input.netAdjustments ?? []) {
    if (!Number.isFinite(adjustment.amount)) throw new Error(`Le montant de « ${adjustment.label} » est invalide.`);
    netItem({ code: adjustment.code, label: adjustment.label, amount: adjustment.amount, source: "Élément net saisi" });
  }
  lines.push(...netItems);

  const netItemsTotal = round2(netItems.reduce((total, line) => total + (line.amount ?? 0), 0));
  const netBeforeTax = round2(grossTotal - employeeContributions + netItemsTotal);
  // Net social : la fraction d'indemnité de rupture exonérée de cotisations mais soumise à CSG y figure.
  const netSocial = round2(G - employeeContributions + severanceTreatment.netSocialExtra + ijssNetTotal);

  let netTaxable = G - employeeContributions + csgNonDeductibleAmount + healthEmployer - overtimeTaxExempt + ijssTaxableTotal - severanceTreatment.taxExemptWithinSubject;
  if (isApprentice) netTaxable = Math.max(0, netTaxable - smicMonthlyFull);
  netTaxable = round2(Math.max(0, netTaxable));

  // --- Prélèvement à la source --------------------------------------------------------
  let withholdingRate = 0;
  let withholdingSource = "";
  let shortContractAllowance = 0;
  let rateIdentifier: string | null = null;
  if (input.withholding.mode === "PERSONALIZED") {
    if (!Number.isFinite(input.withholding.rate) || input.withholding.rate < 0 || input.withholding.rate > 0.43) throw new Error("Le taux de prélèvement à la source transmis par la DGFiP est invalide.");
    withholdingRate = input.withholding.rate;
    withholdingSource = "Taux personnalisé transmis par la DGFiP (compte-rendu métier DSN)";
    rateIdentifier = input.withholding.rateIdentifier ?? null;
  } else {
    const grid = valueAt(PAS_DEFAULT_GRIDS, fromIsoDay(paymentDate), "grille de taux par défaut du prélèvement à la source");
    const isShortContract = employee.contract === "CDD" && employee.plannedContractDays !== null && employee.plannedContractDays !== undefined && employee.plannedContractDays <= 62;
    if (isShortContract) shortContractAllowance = valueAt(PAS_SHORT_CONTRACT_ALLOWANCE, fromIsoDay(paymentDate), "abattement contrats courts").value;
    withholdingRate = pasBracketRate(grid.value[org.territory], Math.max(0, netTaxable - shortContractAllowance));
    withholdingSource = grid.source;
    warnings.push(`Aucun taux personnalisé n'est connu pour ${employee.displayName} : la grille de taux par défaut s'applique jusqu'au retour du taux par la DGFiP.`);
  }
  const withholdingBase = round2(Math.max(0, netTaxable - shortContractAllowance));
  const withholdingTax = round2(withholdingBase * withholdingRate);
  if (withholdingTax > netBeforeTax + 0.01) throw new Error(`Le prélèvement à la source de ${employee.displayName} dépasse le net à payer : vérifiez les retenues du mois.`);
  const netPaid = round2(netBeforeTax - withholdingTax);
  sources.add(withholdingSource);

  const employerCost = round2(grossTotal + employerContributions);
  const hoursPaid = round2(employedHours / monthScheduledHours * pay.contractMonthlyHours - valued.filter((absence) => absence.input.kind === "UNPAID_LEAVE" || absence.input.kind === "OTHER_UNPAID").reduce((total, absence) => total + absence.hours, 0) * (pay.contractMonthlyHours / monthScheduledHours) + hsFirst + hsSecond + hcTenth + hcBeyond);

  const yearToDate: YearToDate = {
    year,
    grossSubject: round2(cumGross),
    ceiling: round2(cumCeiling),
    baseT1: round2(ytd.baseT1 + baseT1),
    baseT2: round2(ytd.baseT2 + baseT2),
    baseFourCeilings: round2(ytd.baseFourCeilings + baseFour),
    baseCet: round2(ytd.baseCet + baseCet),
    csgGross: round2(csgCumGross),
    csgWithinFourCeilings: round2(csgCumWithin),
    rgduSmic: round4(cumSmic),
    rgduRemuneration: round2(cumRemuneration),
    rgduAmount: rgduCumulative,
    overtimeTaxExemptGross: round2(ytd.overtimeTaxExemptGross + overtimeTaxExempt),
    netTaxable: round2(ytd.netTaxable + netTaxable),
    withholdingTax: round2(ytd.withholdingTax + withholdingTax),
    netPaid: round2(ytd.netPaid + netPaid),
    netSocial: round2(ytd.netSocial + netSocial),
    employeeContributions: round2(ytd.employeeContributions + employeeContributions),
    employerContributions: round2(ytd.employerContributions + employerContributions),
    hoursPaid: round2(ytd.hoursPaid + hoursPaid),
    grossTotal: round2(ytd.grossTotal + grossTotal),
    employerCost: round2(ytd.employerCost + employerCost),
  };

  return {
    engineVersion: BULLETIN_ENGINE_VERSION,
    period: { year, month, first: period.first, last: period.last, paymentDate },
    employee: { id: employee.id, displayName: employee.displayName },
    lines,
    totals: {
      grossTotal,
      grossSubject: G,
      employeeContributions,
      employerContributions,
      employerReductions,
      netSocial,
      netBeforeTax,
      netTaxable,
      withholdingBase,
      withholdingRate,
      withholdingTax,
      netPaid,
      employerCost,
      hoursPaid,
    },
    ceiling: { monthly: pmss.value, prorated: ceilingProrated, reason: ceilingReasons.join(", ") || "mois complet" },
    withholding: { mode: input.withholding.mode, rate: withholdingRate, base: withholdingBase, amount: withholdingTax, shortContractAllowance, rateIdentifier, source: withholdingSource },
    yearToDate,
    paidLeave: paidLeaveOutcome,
    sickPayUsed,
    sickPayByAbsence,
    warnings,
    sources: [...sources],
  };
}

export { addDays };
