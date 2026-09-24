import { describe, expect, it } from "vitest";
import {
  notificationDayWindow,
  scheduledDigestPeriodStart,
  scheduledDigestType,
} from "@/lib/notificationSchedule";

describe("notificationSchedule", () => {
  it("programme les résumés quotidiens chaque jour", () => {
    expect(scheduledDigestType("DAILY", new Date("2026-09-24T07:00:00.000Z"))).toBe("digest_daily");
  });

  it("programme les résumés hebdomadaires le lundi seulement", () => {
    expect(scheduledDigestType("WEEKLY", new Date("2026-09-21T07:00:00.000Z"))).toBe("digest_weekly");
    expect(scheduledDigestType("WEEKLY", new Date("2026-09-22T07:00:00.000Z"))).toBeNull();
  });

  it("calcule le début du jour selon Europe/Paris", () => {
    expect(scheduledDigestPeriodStart("DAILY", new Date("2026-09-24T07:00:00.000Z")).toISOString())
      .toBe("2026-09-23T22:00:00.000Z");
  });

  it("borne la journée de notification selon Europe/Paris", () => {
    const window = notificationDayWindow(new Date("2026-09-24T07:00:00.000Z"));
    expect(window.start.toISOString()).toBe("2026-09-23T22:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-24T22:00:00.000Z");
  });

  it("respecte le changement d'heure d'hiver dans la fenêtre quotidienne", () => {
    const window = notificationDayWindow(new Date("2026-10-25T12:00:00.000Z"));
    expect(window.start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});
