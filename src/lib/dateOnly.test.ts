import { describe, expect, it } from "vitest";
import { parseIsoDateOnly } from "@/lib/dateOnly";

describe("parseIsoDateOnly", () => {
  it("accepte une vraie date ISO", () => {
    expect(parseIsoDateOnly("2026-02-28")?.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("refuse les dates impossibles au lieu de les normaliser", () => {
    expect(parseIsoDateOnly("2026-02-31")).toBeNull();
    expect(parseIsoDateOnly("2026-13-01")).toBeNull();
  });

  it("refuse les formats ambigus", () => {
    expect(parseIsoDateOnly("31/12/2026")).toBeNull();
    expect(parseIsoDateOnly("2026-1-01")).toBeNull();
  });
});
