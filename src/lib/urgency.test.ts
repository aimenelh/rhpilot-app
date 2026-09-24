import { describe, expect, it } from "vitest";
import { daysUntil, formatRelativeDueDate } from "@/lib/urgency";

describe("urgency Europe/Paris", () => {
  it("classe une échéance du jour comme aujourd'hui juste après minuit à Paris", () => {
    const now = new Date("2026-09-23T22:30:00.000Z");
    const dueToday = new Date("2026-09-24T00:00:00.000Z");
    const dueTomorrow = new Date("2026-09-25T00:00:00.000Z");

    expect(daysUntil(dueToday, now)).toBe(0);
    expect(formatRelativeDueDate(dueToday, now)).toBe("Échéance aujourd'hui");
    expect(daysUntil(dueTomorrow, now)).toBe(1);
    expect(formatRelativeDueDate(dueTomorrow, now)).toBe("Échéance demain");
  });
});
