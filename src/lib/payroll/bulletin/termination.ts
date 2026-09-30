/**
 * Solde de tout compte : indemnité compensatrice de préavis, indemnité de fin de
 * CDD, indemnité compensatrice de congés payés et indemnités de rupture avec leur
 * régime social et fiscal.
 *
 * Toutes les indemnités sont ajoutées au brut du dernier bulletin. Pour une
 * indemnité de rupture, la fraction exclue de l'assiette des cotisations reste
 * versée (brut total) mais sort du brut soumis ; les bases CSG, la fraction
 * exonérée d'impôt et la contribution patronale spécifique sont renvoyées au
 * moteur de bulletin.
 */
import { fromIsoDay, paidLeaveCompanySchedule, type IsoDay } from "./calendar";
import { assertAmount, round2 } from "./money";
import { SEVERANCE, valueAt } from "./params";
import type { PaidLeaveBalances, PaidLeaveOutcome, PayslipInput, PayslipLine, TerminationReason } from "./types";

export type SeveranceTreatment = {
  /** Fraction versée mais exclue de l'assiette des cotisations (X). */
  exemptFromContributions: number;
  /** Fraction de l'indemnité de rupture incluse dans le brut soumis (S − X), sans abattement CSG. */
  subjectToContributions: number;
  /** Base CSG/CRDS de la fraction imposable (S − T). */
  csgTaxableBase: number;
  /** Base CSG/CRDS de la fraction exonérée d'impôt mais soumise à CSG (T − C). */
  csgTaxExemptBase: number;
  /** Fraction exonérée d'impôt incluse dans le brut soumis (T − X), à retirer du net imposable. */
  taxExemptWithinSubject: number;
  /** Fraction exonérée de cotisations mais soumise à CSG (X − C), à ajouter au net social. */
  netSocialExtra: number;
  specificContributionBase: number;
  specificContributionRate: number;
  source: string;
};

export const NO_SEVERANCE: SeveranceTreatment = {
  exemptFromContributions: 0,
  subjectToContributions: 0,
  csgTaxableBase: 0,
  csgTaxExemptBase: 0,
  taxExemptWithinSubject: 0,
  netSocialExtra: 0,
  specificContributionBase: 0,
  specificContributionRate: 0,
  source: "",
};

const SEVERANCE_LABELS: Record<TerminationReason, string> = {
  LICENCIEMENT: "Indemnité de licenciement",
  RUPTURE_CONVENTIONNELLE: "Indemnité spécifique de rupture conventionnelle",
  MISE_A_LA_RETRAITE: "Indemnité de mise à la retraite",
  DEPART_RETRAITE: "Indemnité de départ volontaire à la retraite",
  DEMISSION: "Indemnité versée à l'occasion de la démission",
  FIN_CDD: "Indemnité versée à l'occasion de la fin du CDD",
  FIN_PERIODE_ESSAI: "Indemnité versée à l'occasion de la rupture de la période d'essai",
  AUTRE: "Indemnité de rupture",
};

function frDate(day: IsoDay): string {
  return day.split("-").reverse().join("/");
}

function formatDays(days: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(days);
}

export function addTerminationLines(context: {
  input: PayslipInput;
  lines: readonly PayslipLine[];
  grossLine: (line: Omit<PayslipLine, "section">) => void;
  paidLeaveOutcome: PaidLeaveOutcome | null;
  balances: PaidLeaveBalances;
  warnings: string[];
  sources: Set<string>;
  pmss: number;
  periodFirst: IsoDay;
  periodLast: IsoDay;
}): SeveranceTreatment {
  const { input, grossLine, warnings, sources } = context;
  const termination = input.termination;
  if (!termination) return NO_SEVERANCE;
  const { employee, organization: org, pay } = input;
  const endDate = employee.contractEndDate;
  if (!endDate || endDate < context.periodFirst || endDate > context.periodLast) {
    throw new Error(`Le solde de tout compte de ${employee.displayName} exige une date de fin de contrat comprise dans la période de paie.`);
  }
  const grossLines = context.lines.filter((line) => line.section === "GROSS");
  // Indemnité de fin de CDD : rémunération totale brute, primes annuelles comprises.
  const grossBeforeTermination = grossLines.reduce((total, line) => total + (line.amount ?? 0), 0);
  // Dixième des congés : hors primes annuelles non affectées par la prise des congés.
  const leaveBaseBeforeTermination = grossLines.filter((line) => line.detail?.excludedFromPaidLeaveBase !== true).reduce((total, line) => total + (line.amount ?? 0), 0);

  // Indemnité compensatrice de préavis : un salaire comme un autre.
  const notice = termination.noticeCompensation ?? 0;
  assertAmount(notice, "L'indemnité compensatrice de préavis");
  if (notice > 0) grossLine({ code: "NOTICE_COMPENSATION", label: "Indemnité compensatrice de préavis", amount: notice, source: "C. trav. art. L1234-5 : soumise à cotisations et à l'impôt comme un salaire" });

  // Indemnité de fin de contrat (précarité) : 10 % de la rémunération totale brute du contrat, hors indemnité compensatrice de congés payés.
  let cddAllowance = 0;
  const cdd = termination.cddEndAllowance;
  if (cdd) {
    let rate: number | null = null;
    if (cdd.amount !== null && cdd.amount !== undefined) {
      cddAllowance = round2(assertAmount(cdd.amount, "L'indemnité de fin de contrat"));
    } else {
      if (cdd.contractTotalGross === null || cdd.contractTotalGross === undefined) throw new Error("L'indemnité de fin de contrat exige son montant ou le brut total versé au titre du contrat avant ce bulletin.");
      assertAmount(cdd.contractTotalGross, "Le brut total du contrat");
      rate = cdd.rate ?? 0.1;
      if (!Number.isFinite(rate) || rate < 0.06 || rate > 0.5) throw new Error("Le taux de l'indemnité de fin de contrat doit être de 10 % (6 % si un accord le prévoit en contrepartie d'un accès à la formation).");
      cddAllowance = round2((cdd.contractTotalGross + grossBeforeTermination + notice) * rate);
    }
    if (cddAllowance > 0) {
      grossLine({
        code: "CDD_END_ALLOWANCE",
        label: rate !== null ? `Indemnité de fin de contrat (${formatDays(rate * 100)} %)` : "Indemnité de fin de contrat",
        amount: cddAllowance,
        source: "C. trav. art. L1243-8 : 10 % de la rémunération totale brute du contrat, soumise à cotisations et imposable",
        detail: rate !== null ? { rate, contractTotalGross: round2((cdd.contractTotalGross ?? 0) + grossBeforeTermination + notice) } : undefined,
      });
    }
    if (cddAllowance > 0 && employee.contract !== "CDD") warnings.push("Une indemnité de fin de contrat est versée alors que le contrat n'est pas un CDD : vérifiez la saisie.");
  } else if (termination.reason === "FIN_CDD" && employee.contract === "CDD") {
    warnings.push(`Aucune indemnité de fin de contrat n'est saisie pour ${employee.displayName} : vérifiez qu'un cas d'exclusion s'applique (CDD saisonnier ou d'usage, refus d'un CDI équivalent, rupture anticipée à l'initiative du salarié, faute grave).`);
  }

  // Indemnité compensatrice de congés payés.
  const outcome = context.paidLeaveOutcome;
  const manualAmount = termination.paidLeaveCompensation?.amount;
  let iccp = 0;
  if (manualAmount !== null && manualAmount !== undefined) {
    iccp = round2(assertAmount(manualAmount, "L'indemnité compensatrice de congés payés"));
    if (iccp > 0) grossLine({ code: "PAID_LEAVE_COMPENSATION", label: "Indemnité compensatrice de congés payés", amount: iccp, source: "C. trav. art. L3141-28 : montant saisi", detail: { method: "SAISIE" } });
    if (outcome) settleBalances(outcome, iccp);
  } else {
    if (!outcome) throw new Error(`Les compteurs de congés payés de ${employee.displayName} sont nécessaires pour calculer l'indemnité compensatrice de fin de contrat (ou saisissez son montant).`);
    const after = outcome.balancesAfter;
    const previousRemaining = Math.max(0, after.previousAcquired - after.previousTaken);
    const currentRemaining = Math.max(0, after.currentAcquired - after.currentTaken);
    // Maintien : valeur d'une journée selon le mode de décompte (26 jours ouvrables, ou jours ouvrés de l'horaire × 52 / 12).
    const workedDaysPerWeek = org.paidLeaveMethod === "OUVRES" ? paidLeaveCompanySchedule(org.paidLeaveWorkingDays).filter((day) => day > 0).length : 6;
    const daysPerMonth = org.paidLeaveMethod === "OUVRABLES" ? 26 : (workedDaysPerWeek * 52) / 12;
    const dailyValue = pay.monthlyBaseSalary / daysPerMonth;
    const bucket = (days: number, referenceGross: number | null, referenceDays: number) => {
      const maintenance = dailyValue * days;
      const tenth = referenceGross !== null && referenceDays > 0 ? (referenceGross / 10) * (days / referenceDays) : null;
      return tenth !== null && tenth > maintenance ? { amount: tenth, method: "TENTH" as const } : { amount: maintenance, method: "SALARY_MAINTENANCE" as const };
    };
    const balances = context.balances;
    const previous = bucket(previousRemaining, balances.referenceGross ?? null, balances.referenceAcquiredDays ?? 0);
    // Base du dixième de la période en cours : brut déjà acquis + brut du mois, préavis et indemnité de fin de contrat compris.
    const currentReferenceGross = balances.currentReferenceGross !== null && balances.currentReferenceGross !== undefined
      ? balances.currentReferenceGross + leaveBaseBeforeTermination + notice + cddAllowance
      : null;
    const current = bucket(currentRemaining, currentReferenceGross, after.currentAcquired);
    if (previousRemaining > 0 && (balances.referenceGross === null || balances.referenceGross === undefined)) warnings.push("Indemnité compensatrice des congés de la période précédente calculée au maintien de salaire : renseignez le brut de référence pour la comparer au dixième.");
    if (currentRemaining > 0 && currentReferenceGross === null) warnings.push("Indemnité compensatrice des congés de la période en cours calculée au maintien de salaire : renseignez le brut de la période d'acquisition pour la comparer au dixième.");
    if (notice > 0) warnings.push("Les congés acquis pendant le préavis non effectué doivent figurer dans les compteurs pour être indemnisés.");
    iccp = round2(previous.amount + current.amount);
    const days = round2(previousRemaining + currentRemaining);
    if (iccp > 0) {
      grossLine({
        code: "PAID_LEAVE_COMPENSATION",
        label: `Indemnité compensatrice de congés payés (${formatDays(days)} jour${days > 1 ? "s" : ""} ${org.paidLeaveMethod === "OUVRABLES" ? "ouvrables" : "ouvrés"})`,
        quantity: days,
        unit: "DAYS",
        amount: iccp,
        source: "C. trav. art. L3141-28 et L3141-24 : la plus favorable du maintien de salaire et du dixième, par période d'acquisition",
        detail: { previousDays: round2(previousRemaining), previousMethod: previous.method, previousAmount: round2(previous.amount), currentDays: round2(currentRemaining), currentMethod: current.method, currentAmount: round2(current.amount) },
      });
    }
    settleBalances(outcome, iccp);
  }

  // Indemnité de rupture.
  const severance = termination.severance;
  if (!severance || severance.amount <= 0) return NO_SEVERANCE;
  const params = valueAt(SEVERANCE, fromIsoDay(endDate), "indemnités de rupture");
  sources.add(params.source);
  const p = params.value;
  const pass = 12 * context.pmss;
  const total = round2(assertAmount(severance.amount, "L'indemnité de rupture"));
  const minimum = Math.min(total, round2(assertAmount(severance.legalOrConventionalMinimum, "L'indemnité légale ou conventionnelle")));
  const reason = termination.reason;
  const previousYearGross = severance.previousYearGross ?? null;
  if (previousYearGross !== null) assertAmount(previousYearGross, "La rémunération brute de l'année précédente");

  let taxExempt = 0;
  let socialExempt = 0;
  let csgExempt = 0;
  let specific = false;
  const exemptRegime = reason === "LICENCIEMENT" || reason === "MISE_A_LA_RETRAITE" || (reason === "RUPTURE_CONVENTIONNELLE" && !severance.eligibleForFullPension);
  if (exemptRegime) {
    const cap = (reason === "MISE_A_LA_RETRAITE" ? p.retirementTaxExemptPassCap : p.taxExemptPassCap) * pass;
    const alternative = Math.max(0.5 * total, 2 * (previousYearGross ?? 0));
    taxExempt = Math.min(total, Math.max(minimum, Math.min(cap, alternative)));
    const fullySubject = total > p.fullySubjectPassMultiple * pass;
    socialExempt = fullySubject ? 0 : Math.min(taxExempt, p.socialExemptPassMultiple * pass);
    csgExempt = fullySubject ? 0 : Math.min(minimum, socialExempt);
    specific = reason !== "LICENCIEMENT" && socialExempt > 0;
    if (fullySubject) warnings.push("L'indemnité de rupture dépasse 10 fois le plafond annuel de la sécurité sociale : elle est soumise à cotisations et à CSG dès le premier euro.");
    if (previousYearGross === null && taxExempt < total) warnings.push("La rémunération brute de l'année précédente n'est pas renseignée : le plafond fiscal de deux fois la rémunération n'a pas été testé et la fraction imposable peut être surévaluée.");
  } else if (reason === "RUPTURE_CONVENTIONNELLE") {
    warnings.push("Rupture conventionnelle d'un salarié en droit de liquider une retraite à taux plein : l'indemnité est entièrement soumise à cotisations, à CSG et à l'impôt.");
  } else if (reason !== "DEPART_RETRAITE") {
    warnings.push(`Aucun régime d'exonération ne s'applique à une indemnité versée pour ce motif de rupture : elle est entièrement soumise et imposable.`);
  }
  taxExempt = round2(taxExempt);
  socialExempt = round2(socialExempt);
  csgExempt = round2(csgExempt);

  grossLine({
    code: "SEVERANCE",
    label: SEVERANCE_LABELS[reason],
    amount: total,
    source: params.source,
    detail: {
      reason,
      contractEnd: frDate(endDate),
      legalOrConventionalMinimum: round2(minimum),
      exemptFromContributions: socialExempt,
      subjectToContributions: round2(total - socialExempt),
      taxExempt,
      csgExempt,
    },
  });

  return {
    exemptFromContributions: socialExempt,
    subjectToContributions: round2(total - socialExempt),
    csgTaxableBase: round2(total - taxExempt),
    csgTaxExemptBase: round2(taxExempt - csgExempt),
    taxExemptWithinSubject: round2(taxExempt - socialExempt),
    netSocialExtra: round2(socialExempt - csgExempt),
    specificContributionBase: specific ? socialExempt : 0,
    specificContributionRate: specific ? p.employerSpecificContribution : 0,
    source: params.source,
  };
}

/** Solde les compteurs après versement de l'indemnité compensatrice. */
function settleBalances(outcome: PaidLeaveOutcome, amount: number): void {
  const after = outcome.balancesAfter;
  const compensated = Math.max(0, after.previousAcquired - after.previousTaken) + Math.max(0, after.currentAcquired - after.currentTaken);
  outcome.compensatedDays = round2(compensated);
  outcome.compensationAmount = amount;
  outcome.balancesAfter = { ...after, previousTaken: after.previousAcquired, currentTaken: after.currentAcquired };
}
