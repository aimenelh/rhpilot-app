/**
 * Contrôle juridique d'une règle maison, avant son activation.
 *
 * Déterministe : chaque constat renvoie à un article du Code du travail.
 * Un constat bloquant empêche l'activation ; un avertissement demande une
 * vérification ; une information rappelle une obligation qui accompagne la règle.
 * Ce contrôle ne remplace pas la lecture de la convention collective ou d'un
 * accord d'entreprise, qui priment sur une décision de l'employeur.
 */

import { isInYearlyWindow, type LeaveRuleSpec } from "./spec";

export type LegalLevel = "BLOCKING" | "WARNING" | "INFO";

export type LegalFinding = {
  code: string;
  level: LegalLevel;
  title: string;
  detail: string;
  source: { label: string; url: string };
};

export type LegalContext = {
  /** État du CSE tel que suivi dans Obligations RH. */
  cseStatus: "IN_PLACE" | "NOT_IN_PLACE" | "UNKNOWN";
  employeeCount: number;
  /** Salariés dont les enfants à charge sont renseignés (0 compris). */
  familyKnownCount: number;
  collectiveAgreementName: string | null;
};

const article = (reference: string) => ({
  label: `Code du travail, art. ${reference}`,
  url: `https://code.travail.gouv.fr/code-du-travail/${reference.toLowerCase()}`,
});

/** Plus longue suite de jours libres (hors périodes fermées) entre le 1er mai et le 31 octobre. */
export function longestSummerOpening(spec: LeaveRuleSpec): number {
  const blackouts = spec.constraints.filter((constraint) => constraint.kind === "BLACKOUT");
  let longest = 0;
  let current = 0;
  // 2025 n'est pas bissextile : la fenêtre du 1er mai au 31 octobre y est la même chaque année.
  for (let time = Date.UTC(2025, 4, 1); time <= Date.UTC(2025, 9, 31); time += 86_400_000) {
    const key = new Date(time).toISOString().slice(0, 10);
    const closed = blackouts.some((blackout) => blackout.kind === "BLACKOUT" && isInYearlyWindow(key, blackout.from, blackout.to));
    current = closed ? 0 : current + 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

function coversSummer(spec: LeaveRuleSpec): boolean {
  if (spec.period.kind === "ALWAYS") return true;
  const period = spec.period;
  for (let time = Date.UTC(2025, 4, 1); time <= Date.UTC(2025, 9, 31); time += 86_400_000) {
    if (isInYearlyWindow(new Date(time).toISOString().slice(0, 10), period.from, period.to)) return true;
  }
  return false;
}

export function reviewLeaveRule(spec: LeaveRuleSpec, context: LegalContext): LegalFinding[] {
  const findings: LegalFinding[] = [];
  const paidLeave = spec.absenceTypes.includes("PAID_LEAVE");
  const hasConcurrency = spec.constraints.some((constraint) => constraint.kind === "MAX_CONCURRENT");
  const governsDepartures = paidLeave && (hasConcurrency || spec.period.kind === "YEARLY" || spec.constraints.some((constraint) => constraint.kind === "BLACKOUT"));

  if (paidLeave && spec.constraints.some((constraint) => constraint.kind === "MIN_SENIORITY_DAYS")) {
    findings.push({
      code: "PAID_LEAVE_FROM_HIRING",
      level: "BLOCKING",
      title: "Les congés payés se prennent dès l'embauche",
      detail: "Une ancienneté minimale ne peut pas être exigée pour poser des congés payés. Retirez cette contrainte ou limitez la règle aux RTT ou aux congés sans solde.",
      source: article("L3141-12"),
    });
  }

  if (paidLeave && coversSummer(spec) && longestSummerOpening(spec) < 14) {
    findings.push({
      code: "SUMMER_MAIN_LEAVE",
      level: "BLOCKING",
      title: "Le congé principal doit rester possible entre le 1er mai et le 31 octobre",
      detail: "Les périodes fermées ne laissent pas deux semaines d'affilée entre le 1er mai et le 31 octobre. Le salarié doit pouvoir y prendre au moins 12 jours ouvrables continus.",
      source: article("L3141-13"),
    });
  }

  const maxConsecutive = spec.constraints.find((constraint) => constraint.kind === "MAX_CONSECUTIVE_DAYS");
  if (paidLeave && maxConsecutive?.kind === "MAX_CONSECUTIVE_DAYS" && maxConsecutive.days < 14 && coversSummer(spec)) {
    findings.push({
      code: "SPLITTING_NEEDS_CONSENT",
      level: "WARNING",
      title: "Une limite sous deux semaines fractionne le congé principal",
      detail: `Avec ${maxConsecutive.days} jours d'affilée au plus, un salarié ne peut pas prendre 12 jours ouvrables continus. Fractionner le congé principal demande son accord, sauf fermeture de l'établissement. Appliquez cette limite hors de l'été, ou relevez-la à 14 jours.`,
      source: article("L3141-19"),
    });
  }

  if (paidLeave && hasConcurrency && !(spec.priority.includes("FAMILY_SITUATION") && spec.priority.includes("SENIORITY"))) {
    findings.push({
      code: "DEPARTURE_ORDER_CRITERIA",
      level: "WARNING",
      title: "L'ordre des départs doit tenir compte de critères fixés par la loi",
      detail: "Sauf accord collectif, l'employeur fixe l'ordre des départs en tenant compte de la situation de famille, de l'ancienneté et de l'activité chez un autre employeur. Ajoutez la situation de famille et l'ancienneté aux priorités.",
      source: article("L3141-16"),
    });
  }

  if (paidLeave && hasConcurrency && spec.priority.includes("FAMILY_SITUATION") && context.familyKnownCount < context.employeeCount) {
    findings.push({
      code: "FAMILY_DATA_MISSING",
      level: "INFO",
      title: context.familyKnownCount === 0 ? "Les enfants à charge ne sont renseignés pour aucun salarié" : `Enfants à charge renseignés pour ${context.familyKnownCount} salarié${context.familyKnownCount > 1 ? "s" : ""} sur ${context.employeeCount}`,
      detail: "Complétez les fiches salariés. Tant que l'information manque pour une demande en concurrence, RH Pilot ne départage pas : la décision vous revient.",
      source: article("L3141-16"),
    });
  }

  if (governsDepartures && context.cseStatus === "IN_PLACE") {
    findings.push({
      code: "CSE_OPINION",
      level: "WARNING",
      title: "Avis du CSE à recueillir",
      detail: "La période de prise des congés et l'ordre des départs sont fixés après avis du CSE. Recueillez cet avis avant d'appliquer la règle aux congés payés.",
      source: article("L3141-16"),
    });
  } else if (governsDepartures && context.cseStatus === "UNKNOWN" && context.employeeCount >= 11) {
    findings.push({
      code: "CSE_UNKNOWN",
      level: "INFO",
      title: "Si un CSE existe, son avis est requis",
      detail: "L'état du CSE n'est pas renseigné dans Obligations RH. S'il est en place, recueillez son avis avant d'appliquer la règle aux congés payés.",
      source: article("L3141-16"),
    });
  }

  if (governsDepartures) {
    findings.push({
      code: "COLLECTIVE_AGREEMENT_FIRST",
      level: "INFO",
      title: "Un accord collectif passe avant la règle",
      detail: `Si un accord d'entreprise ou, à défaut, ${context.collectiveAgreementName ? `votre convention collective (${context.collectiveAgreementName})` : "votre convention collective"} fixe la période de prise des congés ou l'ordre des départs, c'est lui qui s'applique.`,
      source: article("L3141-15"),
    });
    findings.push({
      code: "INFORM_EMPLOYEES",
      level: "INFO",
      title: "Informer les salariés à temps",
      detail: "La période de prise des congés est communiquée au moins deux mois avant son ouverture, et l'ordre des départs à chaque salarié un mois avant son départ. La règle activée est publiée dans l'espace salarié.",
      source: article("D3141-6"),
    });
  }

  if (paidLeave && hasConcurrency) {
    findings.push({
      code: "SPOUSES_TOGETHER",
      level: "INFO",
      title: "Conjoints dans l'entreprise",
      detail: "Des conjoints ou partenaires de PACS travaillant dans l'entreprise ont droit à un congé simultané. Si la règle propose de refuser l'un d'eux pour cette raison, passez outre.",
      source: article("L3141-14"),
    });
  }

  if (spec.absenceTypes.includes("RTT")) {
    findings.push({
      code: "RTT_AGREEMENT",
      level: "INFO",
      title: "Les RTT suivent votre accord de temps de travail",
      detail: "Les modalités de prise des RTT sont fixées par l'accord collectif qui les a mises en place. Vérifiez que la règle ne le contredit pas.",
      source: article("L3121-44"),
    });
  }

  if (spec.employees.contractTypes.length > 0 || spec.employees.categories.length > 0) {
    findings.push({
      code: "EQUAL_TREATMENT",
      level: "INFO",
      title: "Une règle qui vise certains salariés seulement",
      detail: "Traiter différemment des salariés doit reposer sur une raison objective liée au poste. Les CDD ont les mêmes droits que les CDI.",
      source: article("L1242-14"),
    });
  }

  return findings;
}

export function hasBlockingFinding(findings: LegalFinding[]): boolean {
  return findings.some((finding) => finding.level === "BLOCKING");
}
