/**
 * Règles maison : la forme structurée d'une règle de congés écrite par le RH.
 *
 * L'IA ne fait que proposer cette structure à partir du texte ; le RH la relit
 * et la valide. Ensuite, seul le code de ce dossier l'applique : aucune
 * décision n'est jamais prise par un modèle de langage.
 *
 * Module pur : partagé par le serveur, l'éditeur (aperçu en direct) et les tests.
 */

export const RULE_SPEC_VERSION = 1 as const;

/** Les seules absences qu'une règle maison peut encadrer. */
export const GOVERNED_ABSENCE_TYPES = ["PAID_LEAVE", "RTT", "UNPAID_LEAVE"] as const;
export type GovernedAbsenceType = (typeof GOVERNED_ABSENCE_TYPES)[number];

/**
 * Jamais encadrées : ce sont des droits (arrêt de travail, maternité,
 * paternité, événements familiaux), pas des demandes à arbitrer.
 */
export const PROTECTED_ABSENCE_TYPES = ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY", "FAMILY_EVENT"] as const;

export const CONTRACT_TYPES = ["CDI", "CDD", "APPRENTISSAGE", "PROFESSIONNALISATION"] as const;
export type RuleContractType = (typeof CONTRACT_TYPES)[number];
export const CATEGORIES = ["CADRE", "AGENT_DE_MAITRISE", "EMPLOYE", "OUVRIER", "AUTRE"] as const;
export type RuleCategory = (typeof CATEGORIES)[number];

/** « MM-JJ », une date qui revient chaque année. */
export type MonthDay = string;

export type RulePeriod = { kind: "ALWAYS" } | { kind: "YEARLY"; from: MonthDay; to: MonthDay };

export const GROUP_KINDS = ["TEAM", "POSITION", "CATEGORY", "COMPANY"] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

export type MaxConcurrentConstraint = { kind: "MAX_CONCURRENT"; max: number; group: GroupKind };
export type MinNoticeConstraint = { kind: "MIN_NOTICE_DAYS"; days: number };
export type MaxConsecutiveConstraint = { kind: "MAX_CONSECUTIVE_DAYS"; days: number };
export type BlackoutConstraint = { kind: "BLACKOUT"; from: MonthDay; to: MonthDay; label?: string };
export type MinSeniorityConstraint = { kind: "MIN_SENIORITY_DAYS"; days: number };

export type RuleConstraint =
  | MaxConcurrentConstraint
  | MinNoticeConstraint
  | MaxConsecutiveConstraint
  | BlackoutConstraint
  | MinSeniorityConstraint;
export type ConstraintKind = RuleConstraint["kind"];
export const CONSTRAINT_KINDS: readonly ConstraintKind[] = ["MAX_CONCURRENT", "MIN_NOTICE_DAYS", "MAX_CONSECUTIVE_DAYS", "BLACKOUT", "MIN_SENIORITY_DAYS"];

export const PRIORITY_CRITERIA = ["FAMILY_SITUATION", "SENIORITY", "REQUEST_DATE"] as const;
export type PriorityCriterion = (typeof PRIORITY_CRITERIA)[number];

export type ViolationOutcome = "REFUSE" | "REVIEW";

export type LeaveRuleSpec = {
  version: typeof RULE_SPEC_VERSION;
  absenceTypes: GovernedAbsenceType[];
  period: RulePeriod;
  /** Listes vides : tous les salariés. */
  employees: { contractTypes: RuleContractType[]; categories: RuleCategory[] };
  constraints: RuleConstraint[];
  /** Ordre de départage quand plusieurs demandes se disputent les mêmes dates. */
  priority: PriorityCriterion[];
  onViolation: ViolationOutcome;
};

export const MAX_CONSTRAINTS = 8;

export const ABSENCE_TYPE_LABELS: Record<GovernedAbsenceType, string> = {
  PAID_LEAVE: "congés payés",
  RTT: "RTT",
  UNPAID_LEAVE: "congés sans solde",
};

export const CONTRACT_LABELS: Record<RuleContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  APPRENTISSAGE: "apprentissage",
  PROFESSIONNALISATION: "professionnalisation",
};

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  CADRE: "cadres",
  AGENT_DE_MAITRISE: "agents de maîtrise",
  EMPLOYE: "employés",
  OUVRIER: "ouvriers",
  AUTRE: "autres catégories",
};

export const GROUP_LABELS: Record<GroupKind, string> = {
  TEAM: "la même équipe (même responsable)",
  POSITION: "le même poste",
  CATEGORY: "la même catégorie professionnelle",
  COMPANY: "toute l'entreprise",
};

export const PRIORITY_LABELS: Record<PriorityCriterion, string> = {
  FAMILY_SITUATION: "aux salariés ayant des enfants à charge",
  SENIORITY: "à l'ancienneté",
  REQUEST_DATE: "à la première demande arrivée",
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isMonthDay(value: unknown): value is MonthDay {
  if (typeof value !== "string" || !/^\d{2}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(0, 2));
  const day = Number(value.slice(3, 5));
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

/** « 06-01 » → « 1er juin » */
export function formatMonthDay(value: MonthDay): string {
  const month = Number(value.slice(0, 2));
  const day = Number(value.slice(3, 5));
  return `${day === 1 ? "1er" : day} ${MONTHS[month - 1] ?? ""}`.trim();
}

/** « du 26 au 31 décembre », « du 1er juin au 31 août », « du 15 décembre au 5 janvier » */
export function formatMonthDayRange(from: MonthDay, to: MonthDay): string {
  if (from.slice(0, 2) === to.slice(0, 2) && from <= to) {
    const day = Number(from.slice(3, 5));
    return `du ${day === 1 ? "1er" : day} au ${formatMonthDay(to)}`;
  }
  return `du ${formatMonthDay(from)} au ${formatMonthDay(to)}`;
}

/** Vrai si le jour (AAAA-MM-JJ) tombe dans la fenêtre annuelle, y compris quand elle chevauche le 1er janvier. */
export function isInYearlyWindow(dayKey: string, from: MonthDay, to: MonthDay): boolean {
  const monthDay = dayKey.slice(5, 10);
  return from <= to ? monthDay >= from && monthDay <= to : monthDay >= from || monthDay <= to;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function joinList(items: string[], last = "et") {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

/* ---------- Lecture et validation ---------- */

export type SpecParseResult = { ok: true; spec: LeaveRuleSpec } | { ok: false; errors: string[] };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asInteger(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isInteger(number) ? number : null;
}

function uniqueSubset<T extends string>(value: unknown, allowed: readonly T[]): T[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const result: T[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !(allowed as readonly string[]).includes(entry)) return null;
    if (!result.includes(entry as T)) result.push(entry as T);
  }
  return result;
}

function parseConstraint(value: unknown, index: number, errors: string[]): RuleConstraint | null {
  const record = asRecord(value);
  const position = `Contrainte ${index + 1}`;
  if (!record || typeof record.kind !== "string") {
    errors.push(`${position} : type inconnu.`);
    return null;
  }
  switch (record.kind) {
    case "MAX_CONCURRENT": {
      const max = asInteger(record.max);
      const group = record.group;
      if (max === null || max < 1 || max > 500) errors.push(`${position} : le nombre maximal d'absents doit être compris entre 1 et 500.`);
      if (typeof group !== "string" || !(GROUP_KINDS as readonly string[]).includes(group)) errors.push(`${position} : le groupe de salariés est inconnu.`);
      return max !== null && max >= 1 && max <= 500 && (GROUP_KINDS as readonly string[]).includes(String(group)) ? { kind: "MAX_CONCURRENT", max, group: group as GroupKind } : null;
    }
    case "MIN_NOTICE_DAYS":
    case "MAX_CONSECUTIVE_DAYS":
    case "MIN_SENIORITY_DAYS": {
      const days = asInteger(record.days);
      if (days === null || days < 1 || days > 730) {
        errors.push(`${position} : le nombre de jours doit être compris entre 1 et 730.`);
        return null;
      }
      return { kind: record.kind, days };
    }
    case "BLACKOUT": {
      if (!isMonthDay(record.from) || !isMonthDay(record.to)) {
        errors.push(`${position} : les dates de la période fermée sont invalides.`);
        return null;
      }
      const label = typeof record.label === "string" ? record.label.trim().slice(0, 80) : "";
      return { kind: "BLACKOUT", from: record.from, to: record.to, ...(label ? { label } : {}) };
    }
    default:
      errors.push(`${position} : type inconnu.`);
      return null;
  }
}

/** Valide une règle venue de l'éditeur, de la base ou de l'IA. Ne fait jamais confiance à l'entrée. */
export function parseLeaveRuleSpec(input: unknown): SpecParseResult {
  const errors: string[] = [];
  const record = asRecord(input);
  if (!record) return { ok: false, errors: ["La règle est illisible."] };

  const absenceTypes = uniqueSubset(record.absenceTypes, GOVERNED_ABSENCE_TYPES);
  if (!absenceTypes || absenceTypes.length === 0) errors.push("Choisissez au moins un type d'absence : congés payés, RTT ou congés sans solde.");

  let period: RulePeriod = { kind: "ALWAYS" };
  const periodRecord = asRecord(record.period);
  if (periodRecord?.kind === "YEARLY") {
    if (!isMonthDay(periodRecord.from) || !isMonthDay(periodRecord.to)) errors.push("Les dates de la période sont invalides.");
    else period = { kind: "YEARLY", from: periodRecord.from, to: periodRecord.to };
  } else if (periodRecord && periodRecord.kind !== "ALWAYS") {
    errors.push("La période est invalide.");
  }

  const employeesRecord = asRecord(record.employees) ?? {};
  const contractTypes = uniqueSubset(employeesRecord.contractTypes, CONTRACT_TYPES);
  const categories = uniqueSubset(employeesRecord.categories, CATEGORIES);
  if (!contractTypes) errors.push("Un type de contrat est inconnu.");
  if (!categories) errors.push("Une catégorie professionnelle est inconnue.");

  const rawConstraints = Array.isArray(record.constraints) ? record.constraints : [];
  if (rawConstraints.length === 0) errors.push("Ajoutez au moins une contrainte.");
  if (rawConstraints.length > MAX_CONSTRAINTS) errors.push(`Une règle compte au plus ${MAX_CONSTRAINTS} contraintes.`);
  const constraints = rawConstraints.slice(0, MAX_CONSTRAINTS).map((entry, index) => parseConstraint(entry, index, errors)).filter((entry): entry is RuleConstraint => entry !== null);

  const priority = uniqueSubset(record.priority, PRIORITY_CRITERIA);
  if (!priority) errors.push("Un critère de priorité est inconnu.");

  const onViolation = record.onViolation === "REFUSE" || record.onViolation === "REVIEW" ? record.onViolation : null;
  if (!onViolation) errors.push("Indiquez ce qui se passe quand une demande ne respecte pas la règle.");

  if (errors.length > 0 || !absenceTypes || !contractTypes || !categories || !priority || !onViolation) return { ok: false, errors };
  return {
    ok: true,
    spec: { version: RULE_SPEC_VERSION, absenceTypes, period, employees: { contractTypes, categories }, constraints, priority, onViolation },
  };
}

/* ---------- La règle dite en français ---------- */

export function describeConstraint(constraint: RuleConstraint): string {
  switch (constraint.kind) {
    case "MAX_CONCURRENT":
      return constraint.group === "COMPANY"
        ? `Pas plus de ${plural(constraint.max, "personne")} absente${constraint.max > 1 ? "s" : ""} en même temps dans toute l'entreprise.`
        : `Pas plus de ${plural(constraint.max, "personne")} absente${constraint.max > 1 ? "s" : ""} en même temps dans ${GROUP_LABELS[constraint.group]}.`;
    case "MIN_NOTICE_DAYS":
      return `La demande est faite au moins ${plural(constraint.days, "jour")} avant le départ.`;
    case "MAX_CONSECUTIVE_DAYS":
      return `Pas plus de ${plural(constraint.days, "jour")} d'affilée, week-ends compris.`;
    case "BLACKOUT":
      return `Pas d'absence ${formatMonthDayRange(constraint.from, constraint.to)}${constraint.label ? ` (${constraint.label})` : ""}.`;
    case "MIN_SENIORITY_DAYS":
      return `Réservé aux salariés présents depuis au moins ${plural(constraint.days, "jour")}.`;
  }
}

export function describeScope(spec: LeaveRuleSpec): string {
  const types = joinList(spec.absenceTypes.map((type) => ABSENCE_TYPE_LABELS[type]));
  const when = spec.period.kind === "YEARLY" ? `${formatMonthDayRange(spec.period.from, spec.period.to)}, chaque année` : "toute l'année";
  const who: string[] = [];
  if (spec.employees.contractTypes.length > 0) who.push(`en ${joinList(spec.employees.contractTypes.map((type) => CONTRACT_LABELS[type]), "ou")}`);
  if (spec.employees.categories.length > 0) who.push(`parmi les ${joinList(spec.employees.categories.map((category) => CATEGORY_LABELS[category]), "ou")}`);
  const whom = who.length > 0 ? `pour les salariés ${who.join(" ")}` : "pour tous les salariés";
  const capitalized = types.charAt(0).toUpperCase() + types.slice(1);
  return `${capitalized}, ${when}, ${whom}.`;
}

export function describePriority(spec: LeaveRuleSpec): string | null {
  if (spec.priority.length === 0) return null;
  const [first, ...rest] = spec.priority;
  const tail = rest.map((criterion) => `puis ${PRIORITY_LABELS[criterion]}`);
  return `Quand plusieurs demandes se disputent les mêmes dates : priorité ${PRIORITY_LABELS[first]}${tail.length ? `, ${tail.join(", ")}` : ""}.`;
}

export function describeViolation(spec: LeaveRuleSpec): string {
  return spec.onViolation === "REFUSE"
    ? "Une demande qui ne respecte pas la règle vous est proposée au refus, avec des dates possibles."
    : "Une demande qui ne respecte pas la règle vous est transmise pour arbitrage.";
}

/** La règle entière, phrase par phrase, telle qu'un salarié la lira. */
export function describeRule(spec: LeaveRuleSpec): string[] {
  const lines = [describeScope(spec), ...spec.constraints.map(describeConstraint)];
  const priority = describePriority(spec);
  if (priority) lines.push(priority);
  return lines;
}

/** Une règle vide, point de départ de l'éditeur sans IA. */
export function emptyLeaveRuleSpec(): LeaveRuleSpec {
  return {
    version: RULE_SPEC_VERSION,
    absenceTypes: ["PAID_LEAVE"],
    period: { kind: "ALWAYS" },
    employees: { contractTypes: [], categories: [] },
    constraints: [{ kind: "MAX_CONCURRENT", max: 2, group: "TEAM" }],
    priority: ["FAMILY_SITUATION", "SENIORITY"],
    onViolation: "REFUSE",
  };
}
