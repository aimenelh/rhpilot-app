export type ObligationStatus = "TO_DO" | "UPCOMING" | "COMPLIANT" | "INFO_NEEDED" | "MONITOR";
export type ObligationScope = "ORGANIZATION" | "EMPLOYEE";

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

export type ComplianceSnapshot = {
  items: LegalObligationItem[];
  rules: LegalRuleReference[];
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
  now?: Date;
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

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function daysBetween(from: Date, to: Date) {
  const day = 86_400_000;
  return Math.ceil((to.getTime() - from.getTime()) / day);
}

function careerInterviewItem(employee: EmployeeInput, now: Date): LegalObligationItem {
  const subjectLabel = `${employee.firstName} ${employee.lastName}`.trim();
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
      summary: "Échéance théorique atteinte — réalisation à confirmer",
      why:
        "La première échéance calculée à partir de la date d'embauche est atteinte. RH Pilot ne la classe pas comme manquement tant que la date d'un éventuel entretien déjà réalisé n'est pas renseignée.",
      missingData: ["Confirmer si l'entretien a été réalisé", "Date du dernier entretien si déjà réalisé"],
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

function duerpItem(organizationId: string, employeeCount: number): LegalObligationItem {
  if (employeeCount >= 11) {
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
        `RH Pilot compte actuellement ${employeeCount} salariés actifs. À partir de 11 salariés, une mise à jour au moins annuelle s'ajoute aux mises à jour déclenchées par certains changements ou nouvelles informations sur les risques.`,
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
    summary: "Suivi continu",
    why:
      `RH Pilot compte actuellement ${employeeCount} salarié${employeeCount > 1 ? "s" : ""} actif${employeeCount > 1 ? "s" : ""}. L'actualisation annuelle n'est pas déclenchée par ce seul effectif, mais certains changements importants ou nouvelles informations sur les risques peuvent imposer une mise à jour.`,
    missingData: [],
    source: SOURCES.duerp,
  };
}

function cseItem(organizationId: string, employeeCount: number): LegalObligationItem {
  if (employeeCount >= 11) {
    return {
      id: "cse-organization",
      ruleKey: "FR.CSE.ELECTION",
      ruleVersion: 1,
      title: "CSE — seuil et élections",
      category: "Dialogue social",
      scope: "ORGANIZATION",
      subjectId: organizationId,
      subjectLabel: "Entreprise",
      status: "INFO_NEEDED",
      dueDate: null,
      summary: "Historique du seuil d'effectif à préciser",
      why:
        `L'effectif actif enregistré dans RH Pilot est actuellement de ${employeeCount}. Le seul effectif du jour ne permet pas de conclure : l'obligation de mise en place du CSE suppose que le seuil de 11 salariés ait été atteint pendant 12 mois consécutifs.`,
      missingData: ["Date depuis laquelle l'effectif est au moins égal à 11", "Situation actuelle du CSE"],
      source: SOURCES.cse,
    };
  }

  return {
    id: "cse-organization",
    ruleKey: "FR.CSE.ELECTION",
    ruleVersion: 1,
    title: "CSE — suivi du seuil",
    category: "Dialogue social",
    scope: "ORGANIZATION",
    subjectId: organizationId,
    subjectLabel: "Entreprise",
    status: "MONITOR",
    dueDate: null,
    summary: "Seuil actuel inférieur à 11 salariés",
    why:
      "Le seuil de 11 salariés n'est pas atteint dans les données actives enregistrées. RH Pilot conserve toutefois cette obligation en surveillance et ne déduit pas la situation d'un éventuel CSE déjà existant.",
    missingData: [],
    source: SOURCES.cse,
  };
}

export function buildComplianceSnapshot({ organizationId, employees, now = new Date() }: SnapshotInput): ComplianceSnapshot {
  const activeEmployees = employees;
  const items: LegalObligationItem[] = [
    duerpItem(organizationId, activeEmployees.length),
    cseItem(organizationId, activeEmployees.length),
    ...activeEmployees.map((employee) => careerInterviewItem(employee, now)),
  ];

  const stats = {
    toDo: items.filter((item) => item.status === "TO_DO").length,
    upcoming: items.filter((item) => item.status === "UPCOMING" || item.status === "MONITOR").length,
    compliant: items.filter((item) => item.status === "COMPLIANT").length,
    infoNeeded: items.filter((item) => item.status === "INFO_NEEDED").length,
  };

  return { items, rules: LEGAL_RULES, stats };
}
