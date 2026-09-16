export type ObligationStatus = "TO_DO" | "UPCOMING" | "COMPLIANT" | "INFO_NEEDED" | "MONITOR";
export type ObligationScope = "ORGANIZATION" | "EMPLOYEE";
export type CseTrackingStatus = "UNKNOWN" | "IN_PLACE" | "NOT_IN_PLACE";

export type ObligationSource = {
  name: string;
  url: string;
  reference: string;
  checkedAt: string;
};

export type LegalObligationItem = {
  id: string;
  ruleKey: string;
  ruleVersion: number;
  title: string;
  category: string;
  scope: ObligationScope;
  subjectId: string;
  subjectLabel: string;
  status: ObligationStatus;
  dueDate: string | null;
  summary: string;
  why: string;
  missingData: string[];
  source: ObligationSource;
};

export type LegalRuleReference = {
  key: string;
  version: number;
  title: string;
  category: string;
  scope: ObligationScope;
  effectiveFrom: string;
  description: string;
  source: ObligationSource;
};

export type ComplianceTracking = {
  organization: {
    duerpLastUpdatedAt: string | null;
    cseThresholdReachedAt: string | null;
    cseStatus: CseTrackingStatus;
    cseLastElectionAt: string | null;
  };
  employees: Record<string, { lastCareerInterviewAt: string | null }>;
};

export type ComplianceSnapshot = {
  items: LegalObligationItem[];
  rules: LegalRuleReference[];
  tracking: ComplianceTracking;
  stats: {
    toDo: number;
    upcoming: number;
    compliant: number;
    infoNeeded: number;
  };
};

type EmployeeInput = {
  id: string;
  firstName: string;
  lastName: string;
  hireDate: Date;
};

type SnapshotInput = {
  organizationId: string;
  employees: EmployeeInput[];
  tracking?: ComplianceTracking;
  now?: Date;
};

type ComplianceAuditInput = {
  entityId: string;
  metadata: unknown;
};

const CHECKED_AT = "2026-09-16";
const CAREER_INTERVIEW_EFFECTIVE_FROM = new Date("2025-10-26T00:00:00.000Z");

const SOURCES = {
  careerInterview: {
    name: "Ministère du Travail",
    url: "https://travail-emploi.gouv.fr/lentretien-de-parcours-professionnel",
    reference: "Code du travail, art. L6315-1",
    checkedAt: CHECKED_AT,
  },
  duerp: {
    name: "Ministère du Travail",
    url: "https://travail-emploi.gouv.fr/le-document-unique-devaluation-des-risques-professionnels-duerp",
    reference: "Code du travail, art. R4121-2",
    checkedAt: CHECKED_AT,
  },
  cse: {
    name: "Entreprendre.Service-Public.fr",
    url: "https://entreprendre.service-public.fr/vosdroits/F23513",
    reference: "Code du travail, art. L2311-2",
    checkedAt: CHECKED_AT,
  },
} satisfies Record<string, ObligationSource>;

export const LEGAL_RULES: LegalRuleReference[] = [
  {
    key: "FR.CAREER_INTERVIEW",
    version: 1,
    title: "Entretien de parcours professionnel",
    category: "Parcours professionnel",
    scope: "EMPLOYEE",
    effectiveFrom: "2025-10-26",
    description:
      "Le salarié est informé à l'embauche et bénéficie d'un entretien de parcours professionnel au cours de la première année, puis tous les quatre ans. RH Pilot ne déduit jamais qu'un entretien a été réalisé sans trace connue.",
    source: SOURCES.careerInterview,
  },
  {
    key: "FR.DUERP.UPDATE",
    version: 1,
    title: "Mise à jour du DUERP",
    category: "Santé & sécurité",
    scope: "ORGANIZATION",
    effectiveFrom: "2022-03-31",
    description:
      "Le DUERP est mis à jour au moins chaque année à partir de 11 salariés et également lorsqu'un aménagement important ou une nouvelle information modifie l'évaluation des risques.",
    source: SOURCES.duerp,
  },
  {
    key: "FR.CSE.ELECTION",
    version: 1,
    title: "Mise en place et renouvellement du CSE",
    category: "Dialogue social",
    scope: "ORGANIZATION",
    effectiveFrom: "2018-01-01",
    description:
      "Le CSE doit être mis en place lorsque l'effectif d'au moins 11 salariés est atteint pendant 12 mois consécutifs. Les élections ont en principe lieu tous les quatre ans.",
    source: SOURCES.cse,
  },
];

export const EMPTY_COMPLIANCE_TRACKING: ComplianceTracking = {
  organization: {
    duerpLastUpdatedAt: null,
    cseThresholdReachedAt: null,
    cseStatus: "UNKNOWN",
    cseLastElectionAt: null,
  },
  employees: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function buildComplianceTrackingFromAuditLogs(logs: ComplianceAuditInput[]): ComplianceTracking {
  const tracking: ComplianceTracking = {
    organization: { ...EMPTY_COMPLIANCE_TRACKING.organization },
    employees: {},
  };
  const applied = new Set<string>();

  for (const log of logs) {
    if (!isRecord(log.metadata)) continue;
    const ruleKey = typeof log.metadata.ruleKey === "string" ? log.metadata.ruleKey : null;
    const data = isRecord(log.metadata.data) ? log.metadata.data : null;
    if (!ruleKey || !data) continue;

    const uniqueKey = `${ruleKey}:${log.entityId}`;
    if (applied.has(uniqueKey)) continue;
    applied.add(uniqueKey);

    if (ruleKey === "FR.DUERP.UPDATE") {
      tracking.organization.duerpLastUpdatedAt = nullableString(data.duerpLastUpdatedAt);
      continue;
    }

    if (ruleKey === "FR.CSE.ELECTION") {
      tracking.organization.cseThresholdReachedAt = nullableString(data.cseThresholdReachedAt);
      tracking.organization.cseLastElectionAt = nullableString(data.cseLastElectionAt);
      tracking.organization.cseStatus = ["UNKNOWN", "IN_PLACE", "NOT_IN_PLACE"].includes(String(data.cseStatus))
        ? (String(data.cseStatus) as CseTrackingStatus)
        : "UNKNOWN";
      continue;
    }

    if (ruleKey === "FR.CAREER_INTERVIEW") {
      tracking.employees[log.entityId] = {
        lastCareerInterviewAt: nullableString(data.lastCareerInterviewAt),
      };
    }
  }

  return tracking;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseTrackedDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function daysBetween(from: Date, to: Date) {
  const day = 86_400_000;
  return Math.ceil((to.getTime() - from.getTime()) / day);
}

function careerInterviewItem(
  employee: EmployeeInput,
  now: Date,
  lastCareerInterviewAt: string | null,
): LegalObligationItem {
  const subjectLabel = `${employee.firstName} ${employee.lastName}`.trim();
  const lastInterview = parseTrackedDate(lastCareerInterviewAt);

  if (lastInterview) {
    if (lastInterview.getTime() < CAREER_INTERVIEW_EFFECTIVE_FROM.getTime()) {
      return {
        id: `career-${employee.id}`,
        ruleKey: "FR.CAREER_INTERVIEW",
        ruleVersion: 1,
        title: "Entretien de parcours professionnel",
        category: "Parcours professionnel",
        scope: "EMPLOYEE",
        subjectId: employee.id,
        subjectLabel,
        status: "INFO_NEEDED",
        dueDate: null,
        summary: "Dernier entretien enregistré avant le régime actuel",
        why:
          "Une date d'entretien est enregistrée, mais elle est antérieure à l'entrée en vigueur du rythme actuel. RH Pilot conserve l'information sans calculer automatiquement une échéance transitoire qui pourrait être inexacte.",
        missingData: ["Vérifier s'il existe un entretien plus récent"],
        source: SOURCES.careerInterview,
      };
    }

    const due = addYears(lastInterview, 4);
    const remainingDays = daysBetween(now, due);
    const overdue = due.getTime() < now.getTime();

    return {
      id: `career-${employee.id}`,
      ruleKey: "FR.CAREER_INTERVIEW",
      ruleVersion: 1,
      title: "Entretien de parcours professionnel",
      category: "Parcours professionnel",
      scope: "EMPLOYEE",
      subjectId: employee.id,
      subjectLabel,
      status: overdue ? "TO_DO" : remainingDays <= 90 ? "UPCOMING" : "COMPLIANT",
      dueDate: toDateOnly(due),
      summary: overdue
        ? "Nouvelle échéance périodique atteinte"
        : remainingDays <= 90
          ? "À programmer prochainement"
          : "Rythme périodique suivi",
      why:
        "La prochaine échéance périodique est calculée à partir du dernier entretien enregistré. Les situations particulières qui peuvent déclencher un entretien restent à examiner lorsqu'elles surviennent.",
      missingData: [],
      source: SOURCES.careerInterview,
    };
  }

  const hiredUnderCurrentRule = employee.hireDate.getTime() >= CAREER_INTERVIEW_EFFECTIVE_FROM.getTime();
  if (!hiredUnderCurrentRule) {
    return {
      id: `career-${employee.id}`,
      ruleKey: "FR.CAREER_INTERVIEW",
      ruleVersion: 1,
      title: "Entretien de parcours professionnel",
      category: "Parcours professionnel",
      scope: "EMPLOYEE",
      subjectId: employee.id,
      subjectLabel,
      status: "INFO_NEEDED",
      dueDate: null,
      summary: "Historique d'entretien à renseigner",
      why:
        "Ce salarié était déjà dans l'entreprise avant l'entrée en vigueur du rythme actuel. La prochaine échéance dépend notamment du dernier entretien réalisé et des règles transitoires.",
      missingData: ["Date du dernier entretien de parcours professionnel"],
      source: SOURCES.careerInterview,
    };
  }

  const due = addYears(employee.hireDate, 1);
  const remainingDays = daysBetween(now, due);

  if (due.getTime() < now.getTime()) {
    return {
      id: `career-${employee.id}`,
      ruleKey: "FR.CAREER_INTERVIEW",
      ruleVersion: 1,
      title: "Entretien de parcours professionnel",
      category: "Parcours professionnel",
      scope: "EMPLOYEE",
      subjectId: employee.id,
      subjectLabel,
      status: "INFO_NEEDED",
      dueDate: toDateOnly(due),
      summary: "Échéance théorique atteinte, réalisation à confirmer",
      why:
        "La première échéance calculée à partir de la date d'embauche est atteinte. RH Pilot ne la classe pas comme manquement tant que la date d'un éventuel entretien déjà réalisé n'est pas renseignée.",
      missingData: ["Date du dernier entretien si déjà réalisé"],
      source: SOURCES.careerInterview,
    };
  }

  return {
    id: `career-${employee.id}`,
    ruleKey: "FR.CAREER_INTERVIEW",
    ruleVersion: 1,
    title: "Entretien de parcours professionnel",
    category: "Parcours professionnel",
    scope: "EMPLOYEE",
    subjectId: employee.id,
    subjectLabel,
    status: "UPCOMING",
    dueDate: toDateOnly(due),
    summary: remainingDays <= 90 ? "À programmer prochainement" : "Échéance planifiée",
    why:
      "Pour un salarié embauché sous le régime actuel, le premier entretien doit intervenir au cours de la première année suivant l'embauche.",
    missingData: [],
    source: SOURCES.careerInterview,
  };
}

function duerpItem(
  organizationId: string,
  employeeCount: number,
  now: Date,
  lastUpdatedAt: string | null,
  thresholdAtLeast11Declared: boolean,
): LegalObligationItem {
  const lastUpdate = parseTrackedDate(lastUpdatedAt);
  const annualUpdateApplies = employeeCount >= 11 || thresholdAtLeast11Declared;

  if (annualUpdateApplies && lastUpdate) {
    const due = addYears(lastUpdate, 1);
    const remainingDays = daysBetween(now, due);
    const overdue = due.getTime() < now.getTime();

    return {
      id: "duerp-organization",
      ruleKey: "FR.DUERP.UPDATE",
      ruleVersion: 1,
      title: "Mise à jour du DUERP",
      category: "Santé & sécurité",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: overdue ? "TO_DO" : remainingDays <= 90 ? "UPCOMING" : "COMPLIANT",
      dueDate: toDateOnly(due),
      summary: overdue
        ? "Mise à jour annuelle à traiter"
        : remainingDays <= 90
          ? "Prochaine mise à jour annuelle à anticiper"
          : "Dernière mise à jour enregistrée",
      why:
        thresholdAtLeast11Declared && employeeCount < 11
          ? "Le suivi d'effectif renseigne un seuil d'au moins 11 salariés atteint sans interruption, même si tous les salariés ne sont pas encore enregistrés dans RH Pilot. L'échéance annuelle du DUERP est donc suivie à partir de la date renseignée."
          : `RH Pilot compte actuellement ${employeeCount} salariés actifs. À partir de 11 salariés, la date renseignée permet de suivre l'échéance annuelle, sans exclure les mises à jour qui peuvent être déclenchées plus tôt par un changement important ou une nouvelle information sur les risques.`,
      missingData: [],
      source: SOURCES.duerp,
    };
  }

  if (annualUpdateApplies) {
    return {
      id: "duerp-organization",
      ruleKey: "FR.DUERP.UPDATE",
      ruleVersion: 1,
      title: "Mise à jour du DUERP",
      category: "Santé & sécurité",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: "INFO_NEEDED",
      dueDate: null,
      summary: "Dernière mise à jour à renseigner",
      why:
        thresholdAtLeast11Declared && employeeCount < 11
          ? "Le suivi d'effectif renseigne un seuil d'au moins 11 salariés atteint sans interruption. La date de la dernière mise à jour du DUERP est nécessaire pour suivre l'échéance annuelle."
          : `RH Pilot compte actuellement ${employeeCount} salariés actifs. À partir de 11 salariés, une mise à jour au moins annuelle s'ajoute aux mises à jour déclenchées par certains changements ou nouvelles informations sur les risques.`,
      missingData: ["Date de la dernière mise à jour du DUERP"],
      source: SOURCES.duerp,
    };
  }

  return {
    id: "duerp-organization",
    ruleKey: "FR.DUERP.UPDATE",
    ruleVersion: 1,
    title: "Suivi du DUERP",
    category: "Santé & sécurité",
    scope: "ORGANIZATION",
    subjectId: organizationId,
    subjectLabel: "Entreprise",
    status: "MONITOR",
    dueDate: null,
    summary: lastUpdate ? `Dernière mise à jour enregistrée : ${toDateOnly(lastUpdate)}` : "Suivi continu",
    why:
      `RH Pilot compte actuellement ${employeeCount} salarié${employeeCount > 1 ? "s" : ""} actif${employeeCount > 1 ? "s" : ""}. L'actualisation annuelle n'est pas déclenchée par ce seul effectif, mais certains changements importants ou nouvelles informations sur les risques peuvent imposer une mise à jour.`,
    missingData: [],
    source: SOURCES.duerp,
  };
}

function cseItem(
  organizationId: string,
  employeeCount: number,
  now: Date,
  tracking: ComplianceTracking["organization"],
): LegalObligationItem {
  const thresholdReachedAt = parseTrackedDate(tracking.cseThresholdReachedAt);
  const lastElectionAt = parseTrackedDate(tracking.cseLastElectionAt);

  if (employeeCount < 11 && !thresholdReachedAt) {
    return {
      id: "cse-organization",
      ruleKey: "FR.CSE.ELECTION",
      ruleVersion: 1,
      title: "Suivi du seuil CSE",
      category: "Dialogue social",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: "MONITOR",
      dueDate: null,
      summary: tracking.cseStatus === "IN_PLACE" ? "CSE déclaré en place, seuil actuel inférieur à 11" : "Seuil actuel inférieur à 11 salariés",
      why:
        "Le seuil de 11 salariés n'est pas atteint dans les données actives enregistrées et aucune date de seuil continu n'est renseignée. RH Pilot conserve cette obligation en surveillance.",
      missingData: [],
      source: SOURCES.cse,
    };
  }

  if (tracking.cseStatus === "IN_PLACE") {
    if (!lastElectionAt) {
      return {
        id: "cse-organization",
        ruleKey: "FR.CSE.ELECTION",
        ruleVersion: 1,
        title: "Suivi des élections CSE",
        category: "Dialogue social",
        scope: "ORGANIZATION",
        subjectId: organizationId,
        subjectLabel: "Entreprise",
        status: "INFO_NEEDED",
        dueDate: null,
        summary: "Date de la dernière élection à renseigner",
        why:
          "Le CSE est déclaré en place. La date de la dernière élection est nécessaire pour suivre le renouvellement périodique sans inventer une échéance.",
        missingData: ["Date de la dernière élection CSE"],
        source: SOURCES.cse,
      };
    }

    const due = addYears(lastElectionAt, 4);
    const remainingDays = daysBetween(now, due);
    const overdue = due.getTime() < now.getTime();

    return {
      id: "cse-organization",
      ruleKey: "FR.CSE.ELECTION",
      ruleVersion: 1,
      title: "Renouvellement du CSE",
      category: "Dialogue social",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: overdue ? "TO_DO" : remainingDays <= 180 ? "UPCOMING" : "COMPLIANT",
      dueDate: toDateOnly(due),
      summary: overdue ? "Échéance de renouvellement atteinte" : remainingDays <= 180 ? "Renouvellement à anticiper" : "Élection enregistrée",
      why:
        "La prochaine échéance indicative est calculée à partir de la dernière élection renseignée, sur la durée de principe de quatre ans. Les éventuels accords modifiant la durée du mandat restent à vérifier séparément.",
      missingData: [],
      source: SOURCES.cse,
    };
  }

  if (!thresholdReachedAt) {
    return {
      id: "cse-organization",
      ruleKey: "FR.CSE.ELECTION",
      ruleVersion: 1,
      title: "Suivi du seuil CSE",
      category: "Dialogue social",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: "INFO_NEEDED",
      dueDate: null,
      summary: "Historique du seuil d'effectif à préciser",
      why:
        `L'effectif actif enregistré dans RH Pilot est actuellement de ${employeeCount}. Le seul effectif du jour ne permet pas de conclure : la mise en place du CSE suppose que le seuil de 11 salariés ait été atteint pendant 12 mois consécutifs.`,
      missingData: ["Date depuis laquelle l'effectif est au moins égal à 11", "Situation actuelle du CSE"],
      source: SOURCES.cse,
    };
  }

  const thresholdDue = addMonths(thresholdReachedAt, 12);
  if (thresholdDue.getTime() > now.getTime()) {
    return {
      id: "cse-organization",
      ruleKey: "FR.CSE.ELECTION",
      ruleVersion: 1,
      title: "Suivi du seuil CSE",
      category: "Dialogue social",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: "UPCOMING",
      dueDate: toDateOnly(thresholdDue),
      summary: "Seuil de 11 salariés en cours de suivi",
      why:
        employeeCount < 11
          ? "La date renseignée indique que le seuil d'au moins 11 salariés est atteint sans interruption depuis cette date. RH Pilot utilise cette déclaration même si tous les salariés ne sont pas encore enregistrés dans le module Salariés."
          : "La date de franchissement du seuil est renseignée. RH Pilot suit l'atteinte des 12 mois consécutifs avant de conclure qu'une action de mise en place doit être engagée.",
      missingData: [],
      source: SOURCES.cse,
    };
  }

  if (tracking.cseStatus === "NOT_IN_PLACE") {
    return {
      id: "cse-organization",
      ruleKey: "FR.CSE.ELECTION",
      ruleVersion: 1,
      title: "Mise en place du CSE",
      category: "Dialogue social",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: "TO_DO",
      dueDate: toDateOnly(thresholdDue),
      summary: "Seuil de 12 mois atteint, CSE déclaré non mis en place",
      why:
        employeeCount < 11
          ? "La date saisie déclare un effectif d'au moins 11 salariés atteint sans interruption depuis au moins 12 mois, tandis que le CSE est déclaré non mis en place. RH Pilot traite cette déclaration comme la donnée de référence même si tous les salariés ne sont pas encore enregistrés dans le logiciel."
          : "La date de franchissement renseignée indique que le seuil de 11 salariés est atteint depuis au moins 12 mois consécutifs et le CSE est déclaré non mis en place dans RH Pilot.",
      missingData: [],
      source: SOURCES.cse,
    };
  }

  return {
    id: "cse-organization",
    ruleKey: "FR.CSE.ELECTION",
    ruleVersion: 1,
    title: "Situation du CSE à confirmer",
    category: "Dialogue social",
    scope: "ORGANIZATION",
    subjectId: organizationId,
    subjectLabel: "Entreprise",
    status: "INFO_NEEDED",
    dueDate: toDateOnly(thresholdDue),
    summary: "Le seuil de 12 mois est atteint",
    why:
      "La durée de franchissement du seuil est maintenant calculable, mais RH Pilot ne sait pas encore si un CSE est déjà en place. Cette information est nécessaire avant d'afficher une action ou une conformité.",
    missingData: ["Situation actuelle du CSE"],
    source: SOURCES.cse,
  };
}

export function buildComplianceSnapshot({
  organizationId,
  employees,
  tracking = EMPTY_COMPLIANCE_TRACKING,
  now = new Date(),
}: SnapshotInput): ComplianceSnapshot {
  const activeEmployees = employees;
  const thresholdAtLeast11Declared = Boolean(parseTrackedDate(tracking.organization.cseThresholdReachedAt));
  const items: LegalObligationItem[] = [
    duerpItem(
      organizationId,
      activeEmployees.length,
      now,
      tracking.organization.duerpLastUpdatedAt,
      thresholdAtLeast11Declared,
    ),
    cseItem(organizationId, activeEmployees.length, now, tracking.organization),
    ...activeEmployees.map((employee) =>
      careerInterviewItem(employee, now, tracking.employees[employee.id]?.lastCareerInterviewAt ?? null),
    ),
  ];

  const stats = {
    toDo: items.filter((item) => item.status === "TO_DO").length,
    upcoming: items.filter((item) => item.status === "UPCOMING" || item.status === "MONITOR").length,
    compliant: items.filter((item) => item.status === "COMPLIANT").length,
    infoNeeded: items.filter((item) => item.status === "INFO_NEEDED").length,
  };

  return { items, rules: LEGAL_RULES, tracking, stats };
}
