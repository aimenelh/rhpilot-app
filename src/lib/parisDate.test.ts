import { describe, expect, it } from "vitest";
import {
  getParisDateParts,
  isParisDayAfter,
  parisDaysBetween,
  parisDayWindow,
} from "@/lib/parisDate";

describe("parisDate", () => {
  it("considère 00h30 à Paris comme le nouveau jour même si UTC est encore la veille", () => {
    const now = new Date("2026-09-23T22:30:00.000Z");
    expect(getParisDateParts(now)).toMatchObject({ year: 2026, month: 9, day: 24 });
    expect(isParisDayAfter(new Date("2026-09-24T00:00:00.000Z"), now)).toBe(false);
    expect(isParisDayAfter(new Date("2026-09-25T00:00:00.000Z"), now)).toBe(true);
  });

  it("borne la journée civile de Paris", () => {
    const window = parisDayWindow(new Date("2026-09-24T12:00:00.000Z"));
    expect(window.start.toISOString()).toBe("2026-09-23T22:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-24T22:00:00.000Z");
  });

  it("compte les jours civils sans être perturbé par le passage à l'heure d'hiver", () => {
    expect(
      parisDaysBetween(
        new Date("2026-10-25T12:00:00.000Z"),
        new Date("2026-10-26T00:00:00.000Z")
      )
    ).toBe(1);
  });
});
