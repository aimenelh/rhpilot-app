export const PARIS_TIME_ZONE = "Europe/Paris";
const DAY_MS = 86_400_000;

export type ParisDateParts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
};

export function getParisDateParts(date: Date): ParisDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

function getParisOffsetMinutes(date: Date) {
  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = zone?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

export function parisMidnightUtc(year: number, month: number, day: number): Date {
  const nominalUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let instant = new Date(nominalUtc);

  for (let i = 0; i < 2; i++) {
    const offsetMinutes = getParisOffsetMinutes(instant);
    instant = new Date(nominalUtc - offsetMinutes * 60_000);
  }

  return instant;
}

export function parisDayWindow(now: Date = new Date()): { start: Date; end: Date } {
  const parts = getParisDateParts(now);
  const start = parisMidnightUtc(parts.year, parts.month, parts.day);
  const nextCalendarDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const end = parisMidnightUtc(
    nextCalendarDay.getUTCFullYear(),
    nextCalendarDay.getUTCMonth() + 1,
    nextCalendarDay.getUTCDate()
  );
  return { start, end };
}

export function parisCalendarDayNumber(date: Date): number {
  const parts = getParisDateParts(date);
  return Math.trunc(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
}

export function parisDaysBetween(from: Date, to: Date): number {
  return parisCalendarDayNumber(to) - parisCalendarDayNumber(from);
}

export function isParisDayAfter(date: Date, reference: Date = new Date()): boolean {
  return parisCalendarDayNumber(date) > parisCalendarDayNumber(reference);
}

export function isParisDayBefore(date: Date, reference: Date = new Date()): boolean {
  return parisCalendarDayNumber(date) < parisCalendarDayNumber(reference);
}
