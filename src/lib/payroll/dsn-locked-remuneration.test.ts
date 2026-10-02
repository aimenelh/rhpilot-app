import { describe, expect, it } from "vitest";
import { computedDsnFixture, computedSnapshot } from "../../../scripts/payroll/dsn-computed-fixture";
import { FULL_TIME_SCHEDULE } from "./bulletin/calendar";
import { readLockedRemunerationDeclaration } from "./dsn-locked-remuneration";
import { mapLockedContributions } from "./dsn-locked-contributions";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";

const ids = { employeeNir: "1860875123456", urssafSiret: "75366412700077", retirementOps: "44832375800038" };
const cp = { id: "cp", kind: "PAID_LEAVE" as const, start: "2026-01-12" as const, end: "2026-01-16" as const };
const balances = { previousAcquired: 30, previousTaken: 0, currentAcquired: 0, currentTaken: 0, referenceGross: 30000, referenceAcquiredDays: 30 };

describe("rémunérations DSN, congés payés et nouvelle embauche", () => {
  it("distingue les droits chômage non plafonnés de l'assiette de cotisation", () => {
    const snapshot = computedSnapshot({ pay: { monthlyBaseSalary: 18000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } });
    const mapped = mapLockedContributions({ snapshot, ...ids });
    expect(mapped.unemploymentBase).toBe(16020);
    expect(mapped.remuneration.unemploymentRemuneration).toBe(18000);
    expect(mapped.remuneration.restoredSalary).toBe(18000);
  });
  it("conserve une prime mensuelle dans le salaire rétabli et les droits chômage", () => {
    const snapshot = computedSnapshot({ bonuses: [{ code: "PRIME_MENSUELLE", label: "Prime mensuelle", amount: 200 }] });
    expect(readLockedRemunerationDeclaration(snapshot)).toMatchObject({ unemploymentRemuneration: 2700, restoredSalary: 2700 });
  });
  it("exclut le maintien maladie des droits chômage et évite son double rétablissement", () => {
    const base = computedSnapshot();
    const snapshot = computedSnapshot({ organization: { ...base.inputs.organization, ijssSubrogation: false },
      absences: [{ id: "sick", kind: "SICK_LEAVE", start: "2026-01-05", end: "2026-01-16", ijssGrossAmount: 100 }] });
    const maintenance = snapshot.bulletin.lines.find((line) => line.code === "SICK_MAINTENANCE")!.amount!;
    expect(maintenance).toBeGreaterThan(0);
    expect(readLockedRemunerationDeclaration(snapshot)).toMatchObject({ unemploymentRemuneration: Math.round((snapshot.bulletin.totals.grossSubject - maintenance) * 100) / 100, restoredSalary: 2500 });
  });
  it.each([12000, 60000])("déclare l'indemnité CP complète au type 046, avec une référence de %s EUR", (referenceGross) => {
    const input = { absences: [cp], paidLeave: { ...balances, referenceGross } };
    const snapshot = computedSnapshot(input);
    const indemnity = snapshot.bulletin.lines.find((line) => line.code === "CP_INDEMNITY")!.amount!;
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, input);
    const content = buildDsnP26V01Complete(data);
    expect(data.employees[0].payroll.paidLeaveIndemnities).toEqual([{ type: "046", amount: indemnity, startDate: new Date("2026-01-12"), endDate: new Date("2026-01-16") }]);
    expect(content).toContain("S21.G00.52.001,'046'\r\nS21.G00.52.002,'" + indemnity.toFixed(2) + "'");
    expect(content).toContain("S21.G00.52.006,'CONTRAT001'");
    expect(data.employees[0].payroll.unemploymentRemuneration).toBe(snapshot.bulletin.totals.grossSubject);
    expect(data.employees[0].payroll.absenceActivityHours).toBe(0);
    expect(data.employees[0].payroll.paidHours).toBe(151.67);
    expect(snapshot.bulletin.paidLeave!.indemnityMethod).toBe(referenceGross === 60000 ? "TENTH" : "SALARY_MAINTENANCE");
  });
  it("bloque le CP sans comparaison au dixième et une indemnité dupliquée", () => {
    expect(() => readLockedRemunerationDeclaration(computedSnapshot({ absences: [cp] }))).toThrow(/jours de référence/);
    const snapshot = computedSnapshot({ absences: [cp], paidLeave: balances });
    snapshot.bulletin.lines.push(snapshot.bulletin.lines.find((line) => line.code === "CP_INDEMNITY")!);
    expect(() => readLockedRemunerationDeclaration(snapshot)).toThrow(/absence unique/);
  });
  it("date une embauche au 12 janvier, rétablit le mois complet et déduit les heures hors contrat", () => {
    const base = computedSnapshot();
    const input = { employee: { ...base.inputs.employee, hireDate: "2026-01-12" } };
    const snapshot = computedSnapshot(input);
    const mapped = mapLockedContributions({ snapshot, ...ids });
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, input);
    const content = buildDsnP26V01Complete(data);
    expect(mapped.remuneration).toMatchObject({ employmentStart: "2026-01-12", employmentEnd: "2026-01-31", restoredSalary: 2500, outsideContractHours: 42 });
    expect(mapped.activityPaidHours).toBe(109.67);
    expect(mapped.activityAbsenceHours).toBe(0);
    expect(mapped.bases.every((item) => item.periodStart!.toISOString().slice(0, 10) === "2026-01-12")).toBe(true);
    expect(content).toContain("S21.G00.51.001,'12012026'");
    expect(content).toContain("S21.G00.51.011,'003'\r\nS21.G00.51.013,'2500.00'");
    expect(content).not.toContain("S21.G00.53.001,'02'");
  });
});
