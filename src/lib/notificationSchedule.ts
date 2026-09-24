import type { NotificationFrequency } from "@prisma/client";
import { getParisDateParts, parisDayWindow, parisMidnightUtc } from "@/lib/parisDate";

export type DigestType = "digest_daily" | "digest_weekly";

export function notificationDayWindow(now: Date = new Date()): { start: Date; end: Date } {
  return parisDayWindow(now);
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
