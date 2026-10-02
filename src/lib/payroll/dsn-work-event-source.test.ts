import { describe, expect, it } from "vitest";
import { selectWorkEventEpisode, workEventEpisodes, type WorkEventSource } from "./dsn-work-event-source";

const row = (id: string, start: string, end: string, patch: Partial<WorkEventSource> = {}): WorkEventSource => ({ id, type: "SICK_LEAVE", status: "VALIDATED", startDate: new Date(start), endDate: new Date(end), lastWorkedDate: new Date("2026-01-11"), subrogationStartDate: null, subrogationEndDate: null, workAccidentDate: null, returnDate: null, returnReasonCode: null, ...patch });
describe("sources des signalements d'arrêt", () => {
  it("conserve le DJT initial et la fin prescrite des prolongations", () => {
    const episode = selectWorkEventEpisode([row("second", "2026-01-17", "2026-01-20", { returnDate: new Date("2026-01-19"), returnReasonCode: "01" }), row("first", "2026-01-12", "2026-01-16")], "second");
    expect(episode.id).toBe("first");
    expect(episode.sourceIds).toEqual(["first", "second"]);
    expect(episode.lastWorkedDate).toEqual(new Date("2026-01-11"));
    expect(episode.endDate).toEqual(new Date("2026-01-20"));
    expect(episode.returnDate).toEqual(new Date("2026-01-19"));
  });
  it("refuse un DJT renouvelé, une subrogation ou un accident contradictoires", () => {
    const initial = row("first", "2026-01-12", "2026-01-16");
    expect(() => selectWorkEventEpisode([initial, row("second", "2026-01-17", "2026-01-20", { lastWorkedDate: new Date("2026-01-16") })], "second")).toThrow(/initial/);
    expect(() => selectWorkEventEpisode([initial, row("second", "2026-01-17", "2026-01-20", { subrogationStartDate: new Date("2026-01-17") })], "second")).toThrow(/métadonnées/);
    expect(() => selectWorkEventEpisode([initial, row("second", "2026-01-17", "2026-01-20", { workAccidentDate: new Date("2026-01-17") })], "second")).toThrow(/métadonnées/);
  });
  it("sépare les risques successifs en conservant leur DJT commun", () => {
    const episodes = workEventEpisodes([row("sick", "2026-01-12", "2026-01-16"), row("maternity", "2026-01-17", "2026-02-28", { type: "MATERNITY" })]);
    expect(episodes).toHaveLength(2);
    expect(selectWorkEventEpisode(episodes.flat(), "maternity").type).toBe("MATERNITY");
  });
  it("commence un nouvel épisode après une reprise effective et ignore les demandes non validées", () => {
    const rows = [row("first", "2026-01-12", "2026-01-16", { returnDate: new Date("2026-01-17"), returnReasonCode: "01" }), row("second", "2026-01-17", "2026-01-20", { lastWorkedDate: new Date("2026-01-17") }), row("pending", "2026-01-12", "2026-01-20", { status: "TO_VALIDATE" })];
    expect(workEventEpisodes(rows)).toHaveLength(2);
    expect(() => selectWorkEventEpisode(rows, "pending")).toThrow(/introuvable/);
  });
  it("refuse les chevauchements validés et une absence inconnue", () => {
    expect(() => workEventEpisodes([row("first", "2026-01-12", "2026-01-16"), row("second", "2026-01-15", "2026-01-20")])).toThrow(/chevauchent/);
    expect(() => selectWorkEventEpisode([], "other")).toThrow(/introuvable/);
  });
});
