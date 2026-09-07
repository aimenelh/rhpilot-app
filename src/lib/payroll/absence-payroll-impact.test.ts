import { describe, expect, it } from "vitest";
import { getCalendarOverlapDays } from "./absence-payroll-impact";

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("absence payroll impact", () => {
  it("counts the full absence when it fits inside the payroll period", () => {
    expect(
      getCalendarOverlapDays(
        utcDate("2026-09-10"),
        utcDate("2026-09-12"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(3);
  });

  it("limits a cross-month absence to the payroll period", () => {
    expect(
      getCalendarOverlapDays(
        utcDate("2026-09-28"),
        utcDate("2026-10-02"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(3);
  });

  it("returns zero when there is no overlap or when the range is invalid", () => {
    expect(
      getCalendarOverlapDays(
        utcDate("2026-10-01"),
        utcDate("2026-10-02"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(0);

    expect(
      getCalendarOverlapDays(
        utcDate("2026-09-12"),
        utcDate("2026-09-10"),
        utcDate("2026-09-01"),
        utcDate("2026-09-30"),
      ),
    ).toBe(0);
  });
});
