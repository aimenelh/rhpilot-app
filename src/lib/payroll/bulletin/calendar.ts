/**
 * Calendrier de paie : jours fériés, horaire hebdomadaire, heures programmées.
 *
 * Toutes les dates sont manipulées en jours civils UTC (AAAA-MM-JJ) pour que le
 * fuseau du serveur ne décale jamais un jour d'absence ou d'entrée.
 */

export type IsoDay = string;

/** Heures programmées par jour de la semaine, lundi en premier (index 0) et dimanche en dernier (index 6). */
export type WeeklySchedule = readonly [number, number, number, number, number, number, number];

export const FULL_TIME_SCHEDULE: WeeklySchedule = [7, 7, 7, 7, 7, 0, 0];

export function toIsoDay(date: Date): IsoDay {
  return date.toISOString().slice(0, 10);
}

export function fromIsoDay(day: IsoDay): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: IsoDay, count: number): IsoDay {
  const date = fromIsoDay(day);
  date.setUTCDate(date.getUTCDate() + count);
  return toIsoDay(date);
}

export function daysBetweenInclusive(from: IsoDay, to: IsoDay): number {
  return Math.round((fromIsoDay(to).getTime() - fromIsoDay(from).getTime()) / 86400000) + 1;
}

export function monthBounds(year: number, month: number): { first: IsoDay; last: IsoDay; days: number } {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { first: `${year}-${mm}-01`, last: `${year}-${mm}-${String(days).padStart(2, "0")}`, days };
}

/** Jour de la semaine au format lundi = 0 … dimanche = 6. */
export function weekdayIndex(day: IsoDay): number {
  return (fromIsoDay(day).getUTCDay() + 6) % 7;
}

/** Date de Pâques (algorithme de Meeus/Jones/Butcher). */
export function easterSunday(year: number): IsoDay {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type HolidayOptions = { alsaceMoselle?: boolean; workedSolidarityDay?: boolean };

/** Jours fériés légaux (C. trav. art. L3133-1), avec les deux jours propres à l'Alsace-Moselle. */
export function publicHolidays(year: number, options: HolidayOptions = {}): Map<IsoDay, string> {
  const easter = easterSunday(year);
  const list: Array<[IsoDay, string]> = [
    [`${year}-01-01`, "Jour de l'an"],
    [addDays(easter, 1), "Lundi de Pâques"],
    [`${year}-05-01`, "Fête du travail"],
    [`${year}-05-08`, "Victoire 1945"],
    [addDays(easter, 39), "Ascension"],
    [`${year}-07-14`, "Fête nationale"],
    [`${year}-08-15`, "Assomption"],
    [`${year}-11-01`, "Toussaint"],
    [`${year}-11-11`, "Armistice 1918"],
    [`${year}-12-25`, "Noël"],
  ];
  // Le lundi de Pentecôte sert souvent de journée de solidarité travaillée.
  if (!options.workedSolidarityDay) list.push([addDays(easter, 50), "Lundi de Pentecôte"]);
  if (options.alsaceMoselle) {
    list.push([addDays(easter, -2), "Vendredi saint"], [`${year}-12-26`, "Saint-Étienne"]);
  }
  return new Map(list);
}

export type CalendarDay = { day: IsoDay; weekday: number; holiday: string | null; scheduledHours: number };

/**
 * Jours d'un intervalle avec les heures programmées. Un jour férié chômé compte
 * zéro heure : il est payé par la mensualisation et n'est jamais retenu.
 */
export function calendarDays(from: IsoDay, to: IsoDay, schedule: WeeklySchedule, holidays: ReadonlyMap<IsoDay, string>): CalendarDay[] {
  const out: CalendarDay[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = weekdayIndex(day);
    const holiday = holidays.get(day) ?? null;
    out.push({ day, weekday, holiday, scheduledHours: holiday ? 0 : schedule[weekday] });
  }
  return out;
}

export function scheduleWeeklyHours(schedule: WeeklySchedule): number {
  return schedule.reduce((sum, hours) => sum + hours, 0);
}

export function assertSchedule(schedule: readonly number[]): asserts schedule is WeeklySchedule {
  if (schedule.length !== 7) throw new Error("L'horaire hebdomadaire doit indiquer les heures des sept jours de la semaine.");
  for (const hours of schedule) {
    if (!Number.isFinite(hours) || hours < 0 || hours > 12) throw new Error("L'horaire hebdomadaire contient une durée journalière invalide (entre 0 et 12 heures).");
  }
  if (scheduleWeeklyHours(schedule as WeeklySchedule) <= 0) throw new Error("L'horaire hebdomadaire ne prévoit aucune heure de travail.");
}

/** Jours ouvrables (lundi → samedi hors fériés) ou ouvrés (jours habituellement travaillés hors fériés) d'un intervalle. */
export function leaveDaysBetween(from: IsoDay, to: IsoDay, method: "OUVRABLES" | "OUVRES", schedule: WeeklySchedule, holidays: ReadonlyMap<IsoDay, string>): number {
  let count = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (holidays.has(day)) continue;
    const weekday = weekdayIndex(day);
    if (method === "OUVRABLES" ? weekday <= 5 : schedule[weekday] > 0) count += 1;
  }
  return count;
}

function isWorkingDay(day: IsoDay, schedule: WeeklySchedule, holidays: ReadonlyMap<IsoDay, string>): boolean {
  return !holidays.has(day) && schedule[weekdayIndex(day)] > 0;
}

/**
 * Jours de congés payés décomptés pour une absence, limitée aux bornes du mois.
 * Ouvrés : jours habituellement travaillés. Ouvrables : du premier jour où le
 * salarié aurait dû travailler jusqu'à la veille de la reprise, samedis compris
 * (une semaine du lundi au vendredi compte 6 jours ouvrables).
 */
export function paidLeaveDaysForAbsence(input: {
  absenceStart: IsoDay;
  absenceEnd: IsoDay;
  windowStart: IsoDay;
  windowEnd: IsoDay;
  method: "OUVRABLES" | "OUVRES";
  schedule: WeeklySchedule;
  holidays: ReadonlyMap<IsoDay, string>;
}): number {
  const from = input.absenceStart > input.windowStart ? input.absenceStart : input.windowStart;
  const to = input.absenceEnd < input.windowEnd ? input.absenceEnd : input.windowEnd;
  if (to < from) return 0;
  if (input.method === "OUVRES") return leaveDaysBetween(from, to, "OUVRES", input.schedule, input.holidays);
  let start = from;
  while (start <= to && !isWorkingDay(start, input.schedule, input.holidays)) start = addDays(start, 1);
  if (start > to) return 0;
  let end = to;
  if (input.absenceEnd <= input.windowEnd) {
    // Prolonge jusqu'à la veille de la reprise (dans la limite du mois).
    let next = addDays(end, 1);
    let guard = 0;
    while (next <= input.windowEnd && !isWorkingDay(next, input.schedule, input.holidays) && guard < 7) { end = next; next = addDays(next, 1); guard += 1; }
  }
  return leaveDaysBetween(start, end, "OUVRABLES", input.schedule, input.holidays);
}
