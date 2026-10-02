import { describe, expect, it } from "vitest";
import { computedSnapshot, computedDsnFixture } from "../../../scripts/payroll/dsn-computed-fixture";
import { mapAbsences } from "./bulletin/inputs";
import { effectiveAbsenceEnd, freezeWorkStoppages } from "./work-stoppage";
import { readLockedWorkStoppageDeclaration, mapLockedContributions } from "./dsn-locked-contributions";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";

const date = (value: string) => new Date(value + "T00:00:00.000Z");
const ids = { employeeNir: "1860875123456", urssafSiret: "75366412700077", retirementOps: "44832375800038" };
const absence = { id: "sick", kind: "SICK_LEAVE" as const, start: "2026-01-12" as const, end: "2026-01-16" as const, ijssGrossAmount: 100 };
const metadata = { subrogationStartDate: "2026-01-12", subrogationEndDate: "2026-01-16" };
const stored = { absenceId: "sick", type: "SICK_LEAVE", startDate: date("2026-01-12"), endDate: date("2026-01-16"), lastWorkedDate: date("2026-01-11"), subrogationStartDate: null, subrogationEndDate: null, workAccidentDate: null, returnDate: null, returnReasonCode: null };

describe("arrêts figés, subrogation et reprise réelle", () => {
  it("déclare la période et le compte IJSS ainsi que les IJSS nettes en 58 type 10", () => {
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, { absences: [absence] }, { sick: metadata });
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.60.004,'01'");
    expect(content).toContain("S21.G00.60.005,'12012026'");
    expect(content).toContain("S21.G00.60.006,'16012026'");
    expect(content).toContain("S21.G00.60.007,'FR7630006000011234567890189'");
    expect(content).toContain("S21.G00.60.008,'AGRIFRPPXXX'");
    expect(content).toContain("S21.G00.58.003,'10'\r\nS21.G00.58.004,'93.30'");
  });

  it("raccorde l'AT en motif 06 sans accident .012 réservé au signalement", () => {
    const data = computedDsnFixture(2500, 151.67, false, { ijssSubrogation: false }, false,
      { absences: [{ ...absence, kind: "WORK_ACCIDENT" }] }, { sick: { workAccidentDate: "2026-01-12" } });
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.60.001,'06'");
    expect(content).toContain("S21.G00.60.002,'12012026'");
    expect(content).not.toContain("S21.G00.60.012,");
    expect(data.employees[0].payroll.absenceActivityHours).toBeGreaterThan(0);
  });

  it("arrête la retenue avant la reprise et conserve la fin prescrite en DSN", () => {
    const row = { ...stored, returnDate: date("2026-01-15"), returnReasonCode: "01" };
    expect(effectiveAbsenceEnd(row)).toEqual(date("2026-01-14"));
    const mapped = mapAbsences([{ id: row.absenceId, type: row.type, startDate: "2026-01-12", endDate: "2026-01-14" }]);
    const base = computedSnapshot();
    const snapshot = { ...computedSnapshot({ organization: { ...base.inputs.organization, ijssSubrogation: false }, absences: mapped.absences }), dsnWorkStoppages: freezeWorkStoppages(mapped, [row]) };
    const declaration = readLockedWorkStoppageDeclaration(snapshot);
    expect(declaration.hours).toBe(21);
    expect(declaration.stoppages[0]).toMatchObject({ expectedEnd: "2026-01-16", recoveryDate: "2026-01-15", recoveryReasonCode: "01" });
  });

  it("consolide les prolongations et conserve leurs dates déclaratives initiales", () => {
    const rows = [stored, { ...stored, absenceId: "prolongation", startDate: date("2026-01-17"), endDate: date("2026-01-23") }];
    const mapped = mapAbsences(rows.map((row) => ({ id: row.absenceId, type: row.type, startDate: row.startDate.toISOString().slice(0, 10), endDate: row.endDate.toISOString().slice(0, 10) })));
    const result = freezeWorkStoppages(mapped, rows);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ startDate: "2026-01-12", endDate: "2026-01-23", expectedEndDate: "2026-01-23", lastWorkedDate: "2026-01-11" });
    const base = computedSnapshot();
    expect(() => readLockedWorkStoppageDeclaration({ ...computedSnapshot({ organization: { ...base.inputs.organization, ijssSubrogation: false }, absences: mapped.absences.map((absence) => ({ ...absence, ijssGrossAmount: 0 })) }), dsnWorkStoppages: result })).not.toThrow();
  });

  it("refuse les DJT contradictoires d'une prolongation", () => {
    const mapped = mapAbsences([{ id: "sick", type: "SICK_LEAVE", startDate: "2026-01-12", endDate: "2026-01-16" }, { id: "next", type: "SICK_LEAVE", startDate: "2026-01-17", endDate: "2026-01-23" }]);
    expect(() => freezeWorkStoppages(mapped, [stored, { ...stored, absenceId: "next", startDate: date("2026-01-17"), endDate: date("2026-01-23"), lastWorkedDate: date("2026-01-16") }])).toThrow(/dernier jour travaillé initial/);
  });

  it.each(["2026-02-30", "2026-01-17", "2023-12-31"])("refuse le DJT invalide %s", (lastWorkedDate) => {
    expect(() => readLockedWorkStoppageDeclaration(computedSnapshot({ absences: [absence] }, { sick: { ...metadata, lastWorkedDate } }))).toThrow(/invalide|incohérent/);
  });

  it("refuse un snapshot dupliquant un arrêt", () => {
    const snapshot = computedSnapshot({ absences: [absence] }, { sick: metadata });
    snapshot.validatedAbsences.push(snapshot.validatedAbsences[0]);
    expect(() => readLockedWorkStoppageDeclaration(snapshot)).toThrow(/dupliquées/);
  });

  it("refuse les IJSS estimées et la subrogation partielle sans ventilation", () => {
    const estimated = computedSnapshot({ absences: [{ ...absence, ijssGrossAmount: undefined }], previousGrossSalaries: [2500, 2500, 2500] }, { sick: metadata });
    expect(() => mapLockedContributions({ snapshot: estimated, ...ids })).toThrow(/IJSS estimées/);
    const partial = computedSnapshot({ absences: [absence] }, { sick: { ...metadata, subrogationStartDate: "2026-01-15" } });
    expect(() => mapLockedContributions({ snapshot: partial, ...ids })).toThrow(/subrogation partielle/);
  });

  it("refuse une reprise qui n'a pas été appliquée au calcul", () => {
    const snapshot = computedSnapshot({ absences: [absence] }, { sick: { ...metadata, returnDate: "2026-01-15", returnReasonCode: "01" } });
    expect(() => readLockedWorkStoppageDeclaration(snapshot)).toThrow(/après la date de reprise/);
  });

  it("refuse le temps partiel thérapeutique sans son planning spécifique", () => {
    expect(() => effectiveAbsenceEnd({ ...stored, returnDate: date("2026-01-15"), returnReasonCode: "02" })).toThrow(/temps partiel thérapeutique/);
  });
});
