import { describe, expect, it } from "vitest";
import { buildDsnP26WorkEvent } from "./dsn-work-event";
import { workEventFixture } from "../../../scripts/payroll/dsn-work-event-fixture";

describe("signalements P26V01 d'arrêt et de reprise", () => {
  it("réserve le signalement 05 à une reprise anticipée effective", () => {
    const event = workEventFixture("01", false, "05");
    expect(buildDsnP26WorkEvent(event)).toContain("S20.G00.05.001,'05'");
    event.stoppage.recoveryDate = new Date("2026-09-01");
    expect(() => buildDsnP26WorkEvent(event)).toThrow(/reprises anticipées/);
    event.stoppage.recoveryDate = new Date("2026-10-01");
    expect(() => buildDsnP26WorkEvent(event)).toThrow(/survenue/);
  });
  it("déclare l'accident dans le signalement et conserve le DJT réel", () => {
    const event = workEventFixture("06");
    const file = buildDsnP26WorkEvent(event);
    expect(file).toContain("S21.G00.60.012,'10082026'");
    expect(file).toContain("S21.G00.60.002,'10082026'");
    delete event.stoppage.accidentDate;
    expect(() => buildDsnP26WorkEvent(event)).toThrow(/accident/);
  });
  it("garde la subrogation et le compte dans le 04, sans les émettre dans le 05", () => {
    const stop = buildDsnP26WorkEvent(workEventFixture("01", true));
    expect(stop).toContain("S21.G00.60.006,'30092026'");
    expect(stop).toContain("S21.G00.60.007,'FR7630006000011234567890189'");
    const resume = buildDsnP26WorkEvent(workEventFixture("01", true, "05"));
    expect(resume).not.toMatch(/S21\.G00\.60\.00[4-8]/);
    expect(resume).toContain("S21.G00.60.010,'20082026'");
  });
  it("omet les rubriques mensuelles et compte les lignes physiques exactes", () => {
    const file = buildDsnP26WorkEvent(workEventFixture());
    expect(file).not.toMatch(/S20\.G00\.05\.(005|008|010)|S21\.G00\.(50|51|52|53|58|71|78|81|86)/);
    const count = file.match(/S90.G00.90.001,'(\d+)'/)![1];
    expect(Number(count)).toBe(file.trim().split("\r\n").length);
  });
  it("refuse une date factuelle future et un DJT antérieur au contrat", () => {
    const event = workEventFixture();
    event.fileDate = new Date("2026-08-01");
    expect(() => buildDsnP26WorkEvent(event)).toThrow(/déjà survenus/);
    event.fileDate = new Date("2026-09-15");
    event.stoppage.lastDayWorked = new Date("2023-12-31");
    expect(() => buildDsnP26WorkEvent(event)).toThrow(/dates/);
  });
  it("bloque le réel, le thérapeutique, un NIR incohérent et un autre lieu de travail", () => {
    expect(() => buildDsnP26WorkEvent({ ...workEventFixture(), testMode: false })).toThrow(/réel/);
    const therapeutic = workEventFixture("01", false, "05");
    therapeutic.stoppage.recoveryReasonCode = "02";
    expect(() => buildDsnP26WorkEvent(therapeutic)).toThrow(/thérapeutique/);
    const identity = workEventFixture();
    identity.employee.birthDate = new Date("1991-08-10");
    expect(() => buildDsnP26WorkEvent(identity)).toThrow(/NIR/);
    const workplace = workEventFixture();
    workplace.employee.workLocationId = "12345678200028";
    expect(() => buildDsnP26WorkEvent(workplace)).toThrow(/lieu de travail/);
  });
  it("refuse une subrogation incomplète et des caractères qui corrompraient le fichier", () => {
    const event = workEventFixture("01", true);
    delete event.stoppage.subrogationEndDate;
    expect(() => buildDsnP26WorkEvent(event)).toThrow(/subrogation/);
    const corrupt = workEventFixture();
    corrupt.employee.firstName = "Maxime\nS90.G00.90.002,'1'";
    expect(() => buildDsnP26WorkEvent(corrupt)).toThrow(/contrôle/);
  });
  it("accepte une séquence de 15 chiffres et interdit d'utiliser le NIR comme identifiant métier", () => {
    const event = workEventFixture();
    event.declarationOrder = 999999999999999;
    expect(buildDsnP26WorkEvent(event)).toContain("S20.G00.05.004,'999999999999999'");
    event.businessId = event.employee.nir;
    expect(() => buildDsnP26WorkEvent(event)).toThrow(/distinct du NIR/);
  });
});
