import type { NotificationFrequency } from "@prisma/client";

export type DigestType = "digest_daily" | "digest_weekly";

const PARIS_TIME_ZONE = "Europe/Paris";

function getParisDateParts(date: Date) {
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

function parisMidnightUtc(year: number, month: number, day: number) {
  const nominalUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let instant = new Date(nominalUtc);

  // Deux passes couvrent aussi les changements heure d'hiver/été :
  // on calcule l'offset à l'instant estimé puis on recale minuit Paris.
  for (let i = 0; i < 2; i++) {
    const offsetMinutes = getParisOffsetMinutes(instant);
    instant = new Date(nominalUtc - offsetMinutes * 60_000);
  }

  return instant;
}

export function notificationDayWindow(now: Date = new Date()): { start: Date; end: Date } {
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

export function scheduledDigestType(
  frequency: NotificationFrequency,
  now: Date = new Date()
): DigestType | null {
  if (frequency === "DAILY") return "digest_daily";
  if (frequency === "WEEKLY" && getParisDateParts(now).weekday === "Mon") {
    return "digest_weekly";
  }
  return null;
}

export function scheduledDigestPeriodStart(
  frequency: NotificationFrequency,
  now: Date = new Date()
): Date {
  const parts = getParisDateParts(now);

  if (frequency === "WEEKLY") {
    // Le digest hebdomadaire est envoyé le lundi : le début de période
    // est donc le lundi courant à 00:00 heure de Paris.
    return parisMidnightUtc(parts.year, parts.month, parts.day);
  }

  return parisMidnightUtc(parts.year, parts.month, parts.day);
}
