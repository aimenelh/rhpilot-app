/**
 * Passage des données saisies dans RH Pilot (variables du mois, absences
 * validées, compteurs) aux entrées typées du moteur de bulletin.
 *
 * Aucune lecture en base ici : ces fonctions sont pures et testées. Toute
 * saisie ambiguë produit une erreur explicite plutôt qu'une interprétation.
 */
import { FULL_TIME_SCHEDULE, addDays, type IsoDay, type WeeklySchedule } from "./calendar";
import { emptyYearToDate } from "./compute";
import { LEGAL_MONTHLY_HOURS } from "./params";
import type {
  AbsenceInput,
  AbsenceKind,
  BenefitInKindInput,
  BonusInput,
  ComplementaryHoursInput,
  DsnBonusType,
  ExpenseInput,
  NetAdjustmentInput,
  OvertimeInput,
  PaidLeaveBalances,
  PrevoyanceRates,
  YearToDate,
} from "./types";

import { BULLETIN_VARIABLES, ENGINE_COMPUTED_VARIABLES, getBulletinVariable, type BulletinVariableDefinition } from "./variables";

export { BULLETIN_VARIABLES, ENGINE_COMPUTED_VARIABLES, getBulletinVariable, type BulletinVariableDefinition };

const DEFINITIONS = new Map(BULLETIN_VARIABLES.map((definition) => [definition.code, definition]));

export type StoredVariable = {
  id: string; code: string; label: string; amount: number; unit: string; reference?: string | null;
  /** Primes non mensuelles : nature S21.G00.52.001 et période de rattachement. */
  dsnBonusType?: string | null; attachmentStart?: IsoDay | null; attachmentEnd?: IsoDay | null;
};

export const DSN_BONUS_TYPES: Readonly<Record<DsnBonusType, string>> = {
  "027": "Prime liée à l'activité avec période de rattachement spécifique",
  "026": "Prime exceptionnelle liée à l'activité avec période de rattachement spécifique",
  "028": "Prime non liée à l'activité",
};

/**
 * Nature et rattachement DSN d'une prime non mensuelle. Les types 026 et 027 exigent
 * leur période (Dsn-Val S21.G00.52.003/CCH-12 et .004/CCH-13) ; le 028 l'accepte sans l'exiger.
 */
export function readDsnBonusDeclaration(variable: Pick<StoredVariable, "dsnBonusType" | "attachmentStart" | "attachmentEnd">, label: string, periodLast: IsoDay): { value: NonNullable<BonusInput["dsn"]> } | { error: string } {
  const type = variable.dsnBonusType?.trim() ?? "";
  if (!(type in DSN_BONUS_TYPES)) return { error: `Précisez la nature DSN de « ${label} » et sa période de rattachement dans la saisie du mois (Primes non mensuelles).` };
  const start = variable.attachmentStart ?? null;
  const end = variable.attachmentEnd ?? null;
  if ((start === null) !== (end === null)) return { error: `La période de rattachement de « ${label} » doit comporter un début et une fin.` };
  if (type !== "028" && (start === null || end === null)) return { error: `« ${label} » est liée à l'activité : renseignez la période de travail à laquelle elle se rattache.` };
  if (start !== null && end !== null) {
    if (end < start) return { error: `La période de rattachement de « ${label} » se termine avant de commencer.` };
    if (start > periodLast) return { error: `La période de rattachement de « ${label} » ne peut pas commencer après le mois de paie.` };
  }
  return { value: { type: type as DsnBonusType, attachmentStart: start, attachmentEnd: end } };
}

export type MappedVariables = {
  overtime: OvertimeInput;
  complementaryHours: ComplementaryHoursInput;
  bonuses: BonusInput[];
  benefitsInKind: BenefitInKindInput[];
  expenses: ExpenseInput[];
  netAdjustments: NetAdjustmentInput[];
  mealVoucherCount: number;
  publicTransportCost: number;
  ijssByAbsence: Map<string, number>;
  errors: string[];
};

/**
 * Répartit les variables du mois entre les rubriques du moteur. Les IJSS sans
 * absence de rattachement sont affectées à l'unique arrêt indemnisable du mois,
 * et refusées s'il y en a plusieurs.
 */
export function mapPayrollVariables(variables: readonly StoredVariable[], absences: readonly AbsenceInput[], periodLast?: IsoDay): MappedVariables {
  const out: MappedVariables = {
    overtime: {},
    complementaryHours: {},
    bonuses: [],
    benefitsInKind: [],
    expenses: [],
    netAdjustments: [],
    mealVoucherCount: 0,
    publicTransportCost: 0,
    ijssByAbsence: new Map(),
    errors: [],
  };
  const ijssAbsences = absences.filter((absence) => absence.kind === "SICK_LEAVE" || absence.kind === "WORK_ACCIDENT" || absence.kind === "MATERNITY" || absence.kind === "PATERNITY");
  const ijssIds = new Set(ijssAbsences.map((absence) => absence.id));
  const add = (value: number | undefined, amount: number) => (value ?? 0) + amount;

  for (const variable of variables) {
    const code = variable.code.trim().toUpperCase();
    const legacy = ENGINE_COMPUTED_VARIABLES[code];
    if (legacy) { out.errors.push(`La variable « ${variable.label} » n'est plus saisie à la main : ${legacy}.`); continue; }
    const definition = DEFINITIONS.get(code);
    if (!definition) { out.errors.push(`La variable « ${variable.label} » (${code}) n'est pas prise en charge par le moteur de bulletin.`); continue; }
    if (!Number.isFinite(variable.amount) || variable.amount < 0) { out.errors.push(`La valeur de « ${definition.label} » est invalide.`); continue; }
    if (variable.unit !== definition.unit) { out.errors.push(`« ${definition.label} » se saisit en ${definition.unit === "HOURS" ? "heures" : definition.unit === "UNITS" ? "nombre de titres" : "euros"}.`); continue; }
    const amount = variable.amount;
    switch (definition.kind) {
      case "OVERTIME_FIRST": out.overtime.hoursFirstBand = add(out.overtime.hoursFirstBand, amount); break;
      case "OVERTIME_SECOND": out.overtime.hoursSecondBand = add(out.overtime.hoursSecondBand, amount); break;
      case "COMPLEMENTARY_TENTH": out.complementaryHours.hoursWithinTenth = add(out.complementaryHours.hoursWithinTenth, amount); break;
      case "COMPLEMENTARY_BEYOND": out.complementaryHours.hoursBeyondTenth = add(out.complementaryHours.hoursBeyondTenth, amount); break;
      case "BONUS": out.bonuses.push({ code, label: definition.label, amount }); break;
      case "BONUS_ANNUAL": {
        if (amount === 0) break;
        // Sans mois de paie connu (aperçus), la nature DSN n'est pas encore exigée.
        if (!periodLast) { out.bonuses.push({ code, label: definition.label, amount, excludedFromPaidLeaveBase: true }); break; }
        const declaration = readDsnBonusDeclaration(variable, definition.label, periodLast);
        if ("error" in declaration) { out.errors.push(declaration.error); break; }
        out.bonuses.push({ code, label: definition.label, amount, excludedFromPaidLeaveBase: true, dsn: declaration.value });
        break;
      }
      case "BENEFIT": out.benefitsInKind.push({ code: code as BenefitInKindInput["code"], label: definition.label, amount }); break;
      case "EXPENSE": out.expenses.push({ code, label: definition.label, amount }); break;
      case "PUBLIC_TRANSPORT": out.publicTransportCost += amount; break;
      case "MEAL_VOUCHERS":
        if (!Number.isInteger(amount)) { out.errors.push("Le nombre de titres-restaurant doit être un entier."); break; }
        out.mealVoucherCount += amount;
        break;
      case "NET_DEDUCTION": out.netAdjustments.push({ code, label: definition.label, amount: -amount }); break;
      case "IJSS_GROSS": {
        let target = variable.reference?.trim() || null;
        if (target && !ijssIds.has(target)) { out.errors.push("Les IJSS saisies sont rattachées à une absence qui n'est pas un arrêt indemnisable validé sur la période."); break; }
        if (!target) {
          if (ijssAbsences.length === 1) target = ijssAbsences[0].id;
          else if (ijssAbsences.length === 0) { out.errors.push("Des IJSS sont saisies alors qu'aucun arrêt maladie, accident du travail, maternité ou paternité n'est validé sur la période."); break; }
          else { out.errors.push("Plusieurs arrêts sont validés sur la période : rattachez chaque montant d'IJSS à son arrêt."); break; }
        }
        out.ijssByAbsence.set(target, (out.ijssByAbsence.get(target) ?? 0) + amount);
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Absences
// ---------------------------------------------------------------------------

export type StoredAbsence = { id: string; type: string; startDate: IsoDay; endDate: IsoDay };

const ABSENCE_KIND_BY_TYPE: Readonly<Record<string, AbsenceKind>> = {
  PAID_LEAVE: "PAID_LEAVE",
  RTT: "RTT",
  SICK_LEAVE: "SICK_LEAVE",
  WORK_ACCIDENT: "WORK_ACCIDENT",
  UNPAID_LEAVE: "UNPAID_LEAVE",
  FAMILY_EVENT: "FAMILY_EVENT",
  MATERNITY: "MATERNITY",
  PATERNITY: "PATERNITY",
  OTHER: "OTHER_PAID",
};

/**
 * Convertit les absences validées. Les arrêts contigus de même nature (arrêt
 * initial puis prolongations) sont fusionnés : la carence ne court qu'une fois
 * et les 60 jours d'IJSS imposables se comptent depuis le premier jour.
 */
export function mapAbsences(periodAbsences: readonly StoredAbsence[], earlierAbsences: readonly StoredAbsence[] = []): { absences: AbsenceInput[]; chainIds: Map<string, string[]>; warnings: string[] } {
  const warnings: string[] = [];
  const chainIds = new Map<string, string[]>();
  const absences: AbsenceInput[] = [];
  const all = [...earlierAbsences, ...periodAbsences].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const periodIds = new Set(periodAbsences.map((absence) => absence.id));
  const consumed = new Set<string>();

  for (const absence of [...periodAbsences].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    if (consumed.has(absence.id)) continue;
    const kind = ABSENCE_KIND_BY_TYPE[absence.type];
    if (!kind) throw new Error(`Le type d'absence ${absence.type} n'est pas pris en charge par le moteur de bulletin.`);
    if (absence.endDate < absence.startDate) throw new Error("Une absence validée se termine avant de commencer : corrigez ses dates.");
    if (kind === "OTHER_PAID") warnings.push("Une absence « Autre » est traitée comme une absence autorisée et rémunérée : utilisez « Absence sans solde » si elle doit être retenue sur le salaire.");
    let start = absence.startDate;
    let end = absence.endDate;
    const ids = [absence.id];
    if (kind === "SICK_LEAVE" || kind === "WORK_ACCIDENT") {
      // Remonte les arrêts qui se terminent la veille du début de la chaîne.
      let extended = true;
      while (extended) {
        extended = false;
        for (const other of all) {
          if (ids.includes(other.id) || ABSENCE_KIND_BY_TYPE[other.type] !== kind) continue;
          if (addDays(other.endDate, 1) === start) { start = other.startDate; ids.push(other.id); extended = true; }
          else if (addDays(end, 1) === other.startDate && periodIds.has(other.id)) { end = other.endDate; ids.push(other.id); consumed.add(other.id); extended = true; }
        }
      }
    }
    absences.push({ id: absence.id, kind, start, end });
    chainIds.set(absence.id, ids);
  }
  return { absences, chainIds, warnings };
}

// ---------------------------------------------------------------------------
// Horaire, prévoyance, cumuls
// ---------------------------------------------------------------------------

export function resolveWeeklySchedule(stored: unknown, contractMonthlyHours: number): { schedule: WeeklySchedule; derived: boolean } {
  if (stored !== null && stored !== undefined && (!Array.isArray(stored) || stored.length !== 7 || !stored.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 12))) {
    throw new Error("L'horaire hebdomadaire enregistré est invalide : renseignez sept valeurs numériques entre 0 et 12 heures.");
  }
  if (Array.isArray(stored) && stored.length === 7 && stored.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 12)) {
    const schedule = stored as unknown as WeeklySchedule;
    const weekly = schedule.reduce((total, hours) => total + hours, 0);
    if (weekly <= 0) throw new Error("L'horaire hebdomadaire enregistré ne prévoit aucune heure de travail.");
    return { schedule, derived: false };
  }
  if (Math.abs(contractMonthlyHours - LEGAL_MONTHLY_HOURS) < 0.01) return { schedule: FULL_TIME_SCHEDULE, derived: false };
  const weekly = (contractMonthlyHours * 12) / 52;
  const daily = Math.round((weekly / 5) * 100) / 100;
  return { schedule: [daily, daily, daily, daily, daily, 0, 0], derived: true };
}

export function parsePrevoyanceRates(stored: unknown): { cadre?: PrevoyanceRates; nonCadre?: PrevoyanceRates } | undefined {
  if (!stored || typeof stored !== "object") return undefined;
  const parse = (value: unknown): PrevoyanceRates | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    const rate = (key: string) => {
      const number = Number(record[key] ?? 0);
      if (!Number.isFinite(number) || number < 0 || number > 0.2) throw new Error("Un taux de prévoyance enregistré est invalide (attendu entre 0 et 20 %).");
      return number;
    };
    return { employeeT1: rate("employeeT1"), employerT1: rate("employerT1"), employeeT2: rate("employeeT2"), employerT2: rate("employerT2") };
  };
  const record = stored as Record<string, unknown>;
  return { cadre: parse(record.cadre), nonCadre: parse(record.nonCadre) };
}

const YTD_KEYS = Object.keys(emptyYearToDate(2026)).filter((key) => key !== "year") as Array<Exclude<keyof YearToDate, "year">>;

export function parseYearToDate(stored: unknown, year: number): YearToDate {
  if (!stored || typeof stored !== "object") throw new Error("Les cumuls de reprise enregistrés sont illisibles.");
  const record = stored as Record<string, unknown>;
  const result = emptyYearToDate(year);
  // Une reprise historique ne doit pas inventer un cumul fiscal nul.
  if (record.apprenticeFiscalIncome === undefined || record.apprenticeFiscalIncome === null) delete result.apprenticeFiscalIncome;
  for (const key of YTD_KEYS) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`Le cumul de reprise « ${key} » est invalide.`);
    result[key] = number;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Congés payés : bascule de la période d'acquisition au 1er juin
// ---------------------------------------------------------------------------

/** Année de début de la période d'acquisition (1er juin → 31 mai) contenant le mois. */
export function paidLeaveReferenceYear(year: number, month: number): number {
  return month >= 6 ? year : year - 1;
}

/**
 * Fait passer des compteurs connus au début d'un mois donné jusqu'au début du
 * mois cible, en basculant N en N-1 à chaque 1er juin traversé. Le reliquat de
 * N-1 non pris est reporté et signalé : sa perte éventuelle relève de l'accord
 * applicable et des reports légaux (maladie, maternité).
 */
export function rollPaidLeaveBalances(balances: PaidLeaveBalances, from: { year: number; month: number }, to: { year: number; month: number }): { balances: PaidLeaveBalances; carriedOver: number; rolled: number } {
  let current = { ...balances };
  let carriedOver = 0;
  let rolled = 0;
  const fromRef = paidLeaveReferenceYear(from.year, from.month);
  const toRef = paidLeaveReferenceYear(to.year, to.month);
  for (let ref = fromRef; ref < toRef; ref += 1) {
    const remainingPrevious = Math.max(0, current.previousAcquired - current.previousTaken);
    carriedOver += remainingPrevious;
    current = {
      previousAcquired: Math.round((current.currentAcquired + remainingPrevious) * 100) / 100,
      previousTaken: current.currentTaken,
      currentAcquired: 0,
      currentTaken: 0,
      referenceGross: current.currentReferenceGross ?? null,
      referenceAcquiredDays: current.currentAcquired,
      currentReferenceGross: 0,
    };
    rolled += 1;
  }
  return { balances: current, carriedOver: Math.round(carriedOver * 100) / 100, rolled };
}
