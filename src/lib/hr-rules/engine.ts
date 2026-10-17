/**
 * Moteur des règles maison : applique une règle validée par le RH à une
 * demande de congé. Entièrement déterministe, sans IA, sans base de données :
 * on lui donne les salariés, les absences et les règles, il rend un verdict
 * expliqué. Le même calcul sert à la demande du salarié, au dossier du RH,
 * à l'aperçu de l'éditeur et au test sur le passé.
 */

import {
  isInYearlyWindow,
  type BlackoutConstraint,
  type ConstraintKind,
  type GroupKind,
  type LeaveRuleSpec,
  type MaxConcurrentConstraint,
  type PriorityCriterion,
  type RuleConstraint,
} from "./spec";

export type EngineEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  hireDate: Date;
  managerMembershipId: string | null;
  position: string | null;
  professionalCategory: string | null;
  contractType: string | null;
  dependentChildren: number | null;
};

export type EngineAbsence = {
  id: string;
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
};

export type EngineRule = { id: string; title: string; version: number; spec: LeaveRuleSpec };

export type RuleOutcome = "APPROVE" | "REFUSE" | "REVIEW";
export type VerdictOutcome = RuleOutcome | "NO_RULE";

export type CheckResult = {
  kind: ConstraintKind;
  passed: boolean;
  /** Pour le RH : peut nommer des collègues. */
  hr: string;
  /** Pour le salarié : ne nomme jamais personne d'autre que lui. */
  employee: string;
};

export type DateSuggestion = { startDate: string; endDate: string };

export type RuleEvaluation = {
  ruleId: string;
  ruleTitle: string;
  ruleVersion: number;
  outcome: RuleOutcome;
  checks: CheckResult[];
  missingData: string[];
};

export type RequestVerdict = {
  outcome: VerdictOutcome;
  evaluations: RuleEvaluation[];
  /** Explication complète pour le RH, avec la proposition en tête. */
  hrExplanation: string;
  /** Les mêmes faits, sans la proposition (quand l'interface l'affiche déjà en titre). */
  hrDetails: string;
  employeeExplanation: string;
  suggestion: DateSuggestion | null;
};

export const PENDING_STATUSES: readonly string[] = ["TO_VALIDATE", "TO_PROVIDE_JUSTIFICATION", "TO_REVIEW_JUSTIFICATION"];

const DAY_MS = 86_400_000;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const PARIS_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/* ---------- Dates ---------- */

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Le jour calendaire à Paris d'un instant (date de dépôt d'une demande). */
export function parisDayKey(date: Date): string {
  return PARIS_DAY.format(date);
}

function keyToTime(key: string): number {
  return Date.parse(`${key}T00:00:00.000Z`);
}

function addDaysToKey(key: string, amount: number): string {
  return new Date(keyToTime(key) + amount * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((keyToTime(to) - keyToTime(from)) / DAY_MS);
}

function eachDayKey(startKey: string, endKey: string): string[] {
  const days: string[] = [];
  for (let key = startKey; key <= endKey; key = addDaysToKey(key, 1)) days.push(key);
  return days;
}

function dayLabel(key: string): string {
  const day = Number(key.slice(8, 10));
  return `${day === 1 ? "1er" : day} ${MONTHS[Number(key.slice(5, 7)) - 1]}`;
}

/** « le 4 août », « du 4 au 8 août », « du 30 juillet au 2 août » */
export function formatKeyRange(startKey: string, endKey: string): string {
  if (startKey === endKey) return `le ${dayLabel(startKey)}`;
  const sameMonth = startKey.slice(0, 7) === endKey.slice(0, 7);
  const start = sameMonth ? (Number(startKey.slice(8, 10)) === 1 ? "1er" : String(Number(startKey.slice(8, 10)))) : dayLabel(startKey);
  return `du ${start} au ${dayLabel(endKey)}`;
}

/** Regroupe des jours en plages continues : « du 4 au 8 août et le 12 août ». */
function formatKeys(keys: string[]): string {
  const sorted = [...new Set(keys)].sort();
  const ranges: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const key of sorted.slice(1)) {
    if (daysBetweenKeys(previous, key) === 1) {
      previous = key;
      continue;
    }
    ranges.push(formatKeyRange(start, previous));
    start = key;
    previous = key;
  }
  if (start) ranges.push(formatKeyRange(start, previous));
  if (ranges.length <= 1) return ranges[0] ?? "";
  return `${ranges.slice(0, -1).join(", ")} et ${ranges[ranges.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function fullName(employee: Pick<EngineEmployee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function normalizeText(value: string | null): string {
  return (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/* ---------- Champ d'application ---------- */

export type RequestInput = {
  absenceId: string;
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  /** Date de dépôt de la demande. */
  createdAt: Date;
};

/** Les jours de la demande que la règle gouverne, ou null si elle ne s'applique pas. */
export function governedDays(spec: LeaveRuleSpec, request: RequestInput, employee: EngineEmployee): string[] | null {
  if (!(spec.absenceTypes as readonly string[]).includes(request.type)) return null;
  if (spec.employees.contractTypes.length > 0 && !(spec.employees.contractTypes as readonly string[]).includes(employee.contractType ?? "")) return null;
  if (spec.employees.categories.length > 0 && !(spec.employees.categories as readonly string[]).includes(employee.professionalCategory ?? "")) return null;
  const days = eachDayKey(dayKey(request.startDate), dayKey(request.endDate));
  const period = spec.period;
  const inside = period.kind === "YEARLY" ? days.filter((key) => isInYearlyWindow(key, period.from, period.to)) : days;
  return inside.length > 0 ? inside : null;
}

/* ---------- Groupes et priorités ---------- */

function groupMembers(employee: EngineEmployee, employees: EngineEmployee[], group: GroupKind): { members: EngineEmployee[]; note: string | null } {
  const others = employees.filter((candidate) => candidate.id !== employee.id);
  if (group === "COMPANY") return { members: others, note: null };
  if (group === "TEAM") {
    if (!employee.managerMembershipId) return { members: others, note: `Aucun responsable n'est renseigné pour ${fullName(employee)} : la limite d'équipe est appliquée à toute l'entreprise.` };
    return { members: others.filter((candidate) => candidate.managerMembershipId === employee.managerMembershipId), note: null };
  }
  if (group === "POSITION") {
    const position = normalizeText(employee.position);
    if (!position) return { members: others, note: `Aucun poste n'est renseigné pour ${fullName(employee)} : la limite par poste est appliquée à toute l'entreprise.` };
    return { members: others.filter((candidate) => normalizeText(candidate.position) === position), note: null };
  }
  if (!employee.professionalCategory) return { members: others, note: `Aucune catégorie n'est renseignée pour ${fullName(employee)} : la limite par catégorie est appliquée à toute l'entreprise.` };
  return { members: others.filter((candidate) => candidate.professionalCategory === employee.professionalCategory), note: null };
}

type Candidate = { absenceId: string; employee: EngineEmployee; createdAt: Date };

function compareBy(criterion: PriorityCriterion, a: Candidate, b: Candidate): number {
  if (criterion === "FAMILY_SITUATION") return (b.employee.dependentChildren ?? 0) - (a.employee.dependentChildren ?? 0);
  if (criterion === "SENIORITY") return a.employee.hireDate.getTime() - b.employee.hireDate.getTime();
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/** Classe les demandes concurrentes ; la première demande arrivée départage toujours en dernier. */
export function rankCandidates(candidates: Candidate[], priority: PriorityCriterion[]): Candidate[] {
  const order: PriorityCriterion[] = [...priority, ...(priority.includes("REQUEST_DATE") ? [] : ["REQUEST_DATE" as const])];
  return [...candidates].sort((a, b) => {
    for (const criterion of order) {
      const difference = compareBy(criterion, a, b);
      if (difference !== 0) return difference;
    }
    return a.absenceId.localeCompare(b.absenceId);
  });
}

const DECIDING_REASON: Record<PriorityCriterion, string> = {
  FAMILY_SITUATION: "enfants à charge",
  SENIORITY: "ancienneté",
  REQUEST_DATE: "demande arrivée avant",
};

function decidingCriterion(winner: Candidate, loser: Candidate, priority: PriorityCriterion[]): PriorityCriterion {
  const order: PriorityCriterion[] = [...priority, ...(priority.includes("REQUEST_DATE") ? [] : ["REQUEST_DATE" as const])];
  return order.find((criterion) => compareBy(criterion, winner, loser) !== 0) ?? "REQUEST_DATE";
}

/* ---------- Contraintes ---------- */

type Context = {
  spec: LeaveRuleSpec;
  request: RequestInput;
  employee: EngineEmployee;
  employees: EngineEmployee[];
  absences: EngineAbsence[];
  days: string[];
  missingData: string[];
  /** Une donnée manquante a pesé sur le départage : le RH doit trancher. */
  uncertain: boolean;
};

function checkMaxConcurrent(constraint: MaxConcurrentConstraint, context: Context): CheckResult {
  const { members, note } = groupMembers(context.employee, context.employees, constraint.group);
  if (note) context.missingData.push(note);
  const byId = new Map(members.map((member) => [member.id, member]));
  const relevant = context.absences.filter((absence) => byId.has(absence.employeeId) && absence.id !== context.request.absenceId && (context.spec.absenceTypes as readonly string[]).includes(absence.type) && absence.status !== "REJECTED");
  const groupLabel = constraint.group === "TEAM" ? "l'équipe" : constraint.group === "POSITION" ? "le même poste" : constraint.group === "CATEGORY" ? "la même catégorie" : "l'entreprise";
  const ownGroupLabel = constraint.group === "TEAM" ? "votre équipe" : constraint.group === "POSITION" ? "votre poste" : constraint.group === "CATEGORY" ? "votre catégorie" : "l'entreprise";

  const fullDays: string[] = [];
  const lostDays: string[] = [];
  const blockers = new Set<string>();
  const winners = new Map<string, PriorityCriterion>();
  const overtaken = new Set<string>();
  let peak = 0;
  let familyUnknown = false;
  const self: Candidate = { absenceId: context.request.absenceId, employee: context.employee, createdAt: context.request.createdAt };

  for (const day of context.days) {
    const covering = relevant.filter((absence) => dayKey(absence.startDate) <= day && day <= dayKey(absence.endDate));
    peak = Math.max(peak, covering.length);
    const validated = covering.filter((absence) => absence.status === "VALIDATED");
    const pending = covering.filter((absence) => PENDING_STATUSES.includes(absence.status));
    const slots = constraint.max - validated.length;
    if (slots <= 0) {
      fullDays.push(day);
      validated.forEach((absence) => blockers.add(fullName(byId.get(absence.employeeId)!)));
      continue;
    }
    if (pending.length + 1 <= slots) continue;

    const candidates: Candidate[] = [self, ...pending.map((absence) => ({ absenceId: absence.id, employee: byId.get(absence.employeeId)!, createdAt: absence.createdAt }))];
    if (context.spec.priority.includes("FAMILY_SITUATION") && candidates.some((candidate) => candidate.employee.dependentChildren === null)) familyUnknown = true;
    const ranked = rankCandidates(candidates, context.spec.priority);
    const index = ranked.findIndex((candidate) => candidate.absenceId === self.absenceId);
    if (index < slots) {
      ranked.slice(slots).forEach((candidate) => overtaken.add(fullName(candidate.employee)));
      continue;
    }
    lostDays.push(day);
    ranked.slice(0, index).forEach((candidate) => winners.set(fullName(candidate.employee), decidingCriterion(candidate, self, context.spec.priority)));
  }

  if (familyUnknown) {
    context.uncertain = true;
    context.missingData.push("Les enfants à charge ne sont pas renseignés pour tous les salariés en concurrence sur ces dates : le départage par la situation de famille est incertain.");
  }
  const limit = `la règle en permet ${constraint.max}`;

  if (fullDays.length === 0 && lostDays.length === 0) {
    const others = peak === 0 ? `Personne d'autre n'est absent dans ${groupLabel} sur ces dates` : `Au plus ${plural(peak, "autre absence", "autres absences")} dans ${groupLabel} sur ces dates`;
    const overtakeNote = overtaken.size > 0 ? ` Prioritaire sur ${[...overtaken].join(", ")}.` : "";
    return {
      kind: "MAX_CONCURRENT",
      passed: true,
      hr: `${others} ; ${limit}.${overtakeNote}`,
      employee: `Sur ces dates, ${ownGroupLabel} reste sous la limite de ${plural(constraint.max, "absent")} en même temps.`,
    };
  }

  const parts: string[] = [];
  if (fullDays.length > 0) parts.push(`${capitalize(formatKeys(fullDays))} : déjà ${plural(constraint.max, "absence accordée", "absences accordées")} dans ${groupLabel}${blockers.size ? ` (${[...blockers].join(", ")})` : ""} ; ${limit}.`);
  if (lostDays.length > 0) {
    const reasons = [...winners.entries()].map(([name, criterion]) => `${name} (${DECIDING_REASON[criterion]})`);
    parts.push(`${capitalize(formatKeys(lostDays))} : ${reasons.length > 1 ? "passent en priorité" : "passe en priorité"} ${reasons.join(", ")} ; ${limit}.`);
  }
  return {
    kind: "MAX_CONCURRENT",
    passed: false,
    hr: parts.join(" "),
    employee: `${capitalize(formatKeys([...fullDays, ...lostDays]))}, le nombre maximal de personnes absentes en même temps dans ${ownGroupLabel} est atteint.`,
  };
}

function checkBlackout(constraint: BlackoutConstraint, context: Context): CheckResult {
  const closed = context.days.filter((day) => isInYearlyWindow(day, constraint.from, constraint.to));
  const label = constraint.label ? ` (${constraint.label})` : "";
  if (closed.length === 0) return { kind: "BLACKOUT", passed: true, hr: `En dehors de la période fermée${label}.`, employee: `En dehors de la période fermée${label}.` };
  const text = `${capitalize(formatKeys(closed))} : période fermée${label}.`;
  return { kind: "BLACKOUT", passed: false, hr: text, employee: text };
}

function checkConstraint(constraint: RuleConstraint, context: Context): CheckResult {
  const startKey = dayKey(context.request.startDate);
  switch (constraint.kind) {
    case "MAX_CONCURRENT":
      return checkMaxConcurrent(constraint, context);
    case "BLACKOUT":
      return checkBlackout(constraint, context);
    case "MIN_NOTICE_DAYS": {
      const notice = daysBetweenKeys(parisDayKey(context.request.createdAt), startKey);
      const passed = notice >= constraint.days;
      return {
        kind: "MIN_NOTICE_DAYS",
        passed,
        hr: passed ? `Demande faite ${plural(notice, "jour")} avant le départ ; la règle en demande ${constraint.days}.` : `Demande faite ${plural(Math.max(notice, 0), "jour")} avant le départ ; la règle en demande ${constraint.days}.`,
        employee: passed ? `Demande faite assez tôt (${plural(constraint.days, "jour")} minimum).` : `La demande devait être faite au moins ${plural(constraint.days, "jour")} avant le départ.`,
      };
    }
    case "MAX_CONSECUTIVE_DAYS": {
      const length = daysBetweenKeys(startKey, dayKey(context.request.endDate)) + 1;
      const passed = length <= constraint.days;
      return {
        kind: "MAX_CONSECUTIVE_DAYS",
        passed,
        hr: `Absence de ${plural(length, "jour")} d'affilée ; la règle en permet ${constraint.days}.`,
        employee: passed ? `Durée conforme (${plural(constraint.days, "jour")} d'affilée au plus).` : `Une absence ne peut pas dépasser ${plural(constraint.days, "jour")} d'affilée, week-ends compris.`,
      };
    }
    case "MIN_SENIORITY_DAYS": {
      const seniority = daysBetweenKeys(dayKey(context.employee.hireDate), startKey);
      const passed = seniority >= constraint.days;
      return {
        kind: "MIN_SENIORITY_DAYS",
        passed,
        hr: `${plural(Math.max(seniority, 0), "jour")} d'ancienneté au départ ; la règle en demande ${constraint.days}.`,
        employee: passed ? "Ancienneté suffisante." : `Ce type d'absence est ouvert après ${plural(constraint.days, "jour")} dans l'entreprise.`,
      };
    }
  }
}

/* ---------- Évaluation ---------- */

export type EvaluationInput = {
  request: RequestInput;
  rules: EngineRule[];
  employees: EngineEmployee[];
  /** Les autres absences de l'entreprise ; la demande elle-même est ignorée si elle y figure. */
  absences: EngineAbsence[];
};

export function evaluateRule(rule: EngineRule, input: Omit<EvaluationInput, "rules">): RuleEvaluation | null {
  const employee = input.employees.find((candidate) => candidate.id === input.request.employeeId);
  if (!employee) return null;
  const days = governedDays(rule.spec, input.request, employee);
  if (!days) return null;
  const context: Context = { spec: rule.spec, request: input.request, employee, employees: input.employees, absences: input.absences, days, missingData: [], uncertain: false };
  const checks = rule.spec.constraints.map((constraint) => checkConstraint(constraint, context));
  const failed = checks.some((check) => !check.passed);
  const outcome: RuleOutcome = failed ? rule.spec.onViolation : context.uncertain ? "REVIEW" : "APPROVE";
  return { ruleId: rule.id, ruleTitle: rule.title, ruleVersion: rule.version, outcome, checks, missingData: [...new Set(context.missingData)] };
}

const SEVERITY: Record<RuleOutcome, number> = { APPROVE: 0, REVIEW: 1, REFUSE: 2 };

function combine(evaluations: RuleEvaluation[]): VerdictOutcome {
  if (evaluations.length === 0) return "NO_RULE";
  return evaluations.reduce<RuleOutcome>((worst, evaluation) => (SEVERITY[evaluation.outcome] > SEVERITY[worst] ? evaluation.outcome : worst), "APPROVE");
}

function evaluateAll(input: EvaluationInput): RuleEvaluation[] {
  return input.rules.map((rule) => evaluateRule(rule, input)).filter((evaluation): evaluation is RuleEvaluation => evaluation !== null);
}

/** Cherche les premières dates de même durée qui passeraient toutes les règles, dans les 90 jours. */
export function suggestDates(input: EvaluationInput, today: Date): DateSuggestion | null {
  const startKey = dayKey(input.request.startDate);
  const length = daysBetweenKeys(startKey, dayKey(input.request.endDate));
  const todayKey = parisDayKey(today);
  for (let shift = 1; shift <= 90; shift += 1) {
    const candidateStart = addDaysToKey(startKey, shift);
    if (candidateStart <= todayKey) continue;
    const candidateEnd = addDaysToKey(candidateStart, length);
    const request: RequestInput = { ...input.request, startDate: new Date(keyToTime(candidateStart)), endDate: new Date(keyToTime(candidateEnd)), createdAt: today };
    const outcome = combine(evaluateAll({ ...input, request }));
    if (outcome === "APPROVE" || outcome === "NO_RULE") return { startDate: candidateStart, endDate: candidateEnd };
  }
  return null;
}

function quoteTitle(evaluation: RuleEvaluation) {
  return `«\u00a0${evaluation.ruleTitle}\u00a0»`;
}

/** Le verdict complet d'une demande : toutes les règles applicables, expliqué au RH et au salarié. */
export function evaluateRequest(input: EvaluationInput, options: { today?: Date; suggest?: boolean } = {}): RequestVerdict {
  const evaluations = evaluateAll(input);
  const outcome = combine(evaluations);
  if (outcome === "NO_RULE") return { outcome, evaluations, hrExplanation: "Aucune règle maison ne s'applique à cette demande.", hrDetails: "", employeeExplanation: "", suggestion: null };

  const failing = evaluations.filter((evaluation) => evaluation.outcome !== "APPROVE");
  const dateBound = failing.some((evaluation) => evaluation.checks.some((check) => !check.passed && (check.kind === "MAX_CONCURRENT" || check.kind === "BLACKOUT")));
  const suggestion = outcome !== "APPROVE" && dateBound && options.suggest !== false ? suggestDates(input, options.today ?? new Date()) : null;
  const suggestionText = suggestion ? ` Dates possibles : ${formatKeyRange(suggestion.startDate, suggestion.endDate)}.` : "";

  if (outcome === "APPROVE") {
    const titles = evaluations.map(quoteTitle).join(", ");
    const details = evaluations.flatMap((evaluation) => [...evaluation.checks.map((check) => check.hr), ...evaluation.missingData]).join(" ");
    return {
      outcome,
      evaluations,
      hrExplanation: `Conforme ${evaluations.length > 1 ? "aux règles" : "à la règle"} ${titles}. ${details}`.trim(),
      hrDetails: details,
      employeeExplanation: `Accordée selon ${evaluations.length > 1 ? "les règles" : "la règle"} ${titles} de l'entreprise.`,
      suggestion: null,
    };
  }

  const hrLines = failing.flatMap((evaluation) => [
    ...evaluation.checks.filter((check) => !check.passed).map((check) => check.hr),
    ...evaluation.missingData,
  ]);
  const employeeLines = failing.flatMap((evaluation) => evaluation.checks.filter((check) => !check.passed).map((check) => check.employee));
  const titles = failing.map(quoteTitle).join(", ");
  const lead = outcome === "REFUSE" ? "Proposition : refuser." : "À arbitrer par vous.";
  const details = `${hrLines.join(" ")}${suggestionText}`.trim();
  return {
    outcome,
    evaluations,
    hrExplanation: `${lead} ${details}`.trim(),
    hrDetails: details,
    employeeExplanation: employeeLines.length > 0
      ? `Votre demande ne respecte pas ${failing.length > 1 ? "les règles" : "la règle"} ${titles} : ${employeeLines.map((line) => line.charAt(0).toLowerCase() + line.slice(1)).join(" ")}${suggestionText}`
      : "",
    suggestion,
  };
}
