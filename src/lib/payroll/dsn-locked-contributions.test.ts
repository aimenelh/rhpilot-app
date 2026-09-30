import { describe, expect, it } from "vitest";
import { computedSnapshot, computedDsnFixture } from "../../../scripts/payroll/dsn-computed-fixture";
import { identifyDsnAffiliations, normalizeDsnComplementaryAffiliations } from "./dsn-complementary-affiliations";
import { FULL_TIME_SCHEDULE } from "./bulletin/calendar";
import { mapLockedContributions, mergeLockedAggregates, splitLockedRgdu } from "./dsn-locked-contributions";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";

const ids = { employeeNir: "1860875123456", urssafSiret: "75366412700077", retirementOps: "44832375800038" };
const cents = (amount: number) => Math.round(amount * 100);
describe("DSN construite depuis les cotisations du bulletin", () => {
  it.each([2000, 2500, 6000, 18000])("rapproche toutes les charges et la dette mensuelle pour %s EUR", (salary) => {
    const snapshot = computedSnapshot({ pay: { monthlyBaseSalary: salary, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } });
    const mapped = mapLockedContributions({ snapshot, ...ids });
    const due = mapped.liabilities.reduce((sum, item) => sum + cents(item.amount), 0);
    const deferred = mapped.deferred.reduce((sum, item) => sum + cents(item.amount), 0);
    expect(due + deferred).toBe(cents(snapshot.bulletin.totals.employeeContributions) + cents(snapshot.bulletin.totals.employerContributions));
    expect(mapped.aggregates.find((item) => item.code === "100" && item.baseQualifier === "920")!.baseAmount).toBe(salary);
    expect(mapped.aggregates.filter((item) => item.code === "635" || item.code === "430")).toHaveLength(2);
    expect(mapped.aggregates.every((item) => item.mappingVersion !== "")).toBe(true);
    expect(mapped.individual.find((item) => item.code === "131")!.opsIdentifier).toBeNull();
  });
  it("ne compte pas les données 142/146 comme une dette Urssaf", () => {
    const mapped = mapLockedContributions({ snapshot: computedSnapshot({ pay: { monthlyBaseSalary: 6000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } }), ...ids });
    expect(mapped.individual.some((item) => item.code === "142")).toBe(true);
    expect(mapped.individual.some((item) => item.code === "146")).toBe(true);
    expect(mapped.aggregates.some((item) => item.sourcePayrollCodes.includes("RETRAITE_T1"))).toBe(false);
  });
  it("rattache le chômage à l'assiette effectivement plafonnée à quatre plafonds", () => {
    const data = computedDsnFixture(18000);
    expect(data.employees[0].payroll.unemploymentBase).toBe(16020);
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.78.001,'07'");
    expect(content).toContain("S21.G00.51.013,'16020.00'");
  });
  it("reprend l'horaire payé du temps partiel et son plafond proratisé", () => {
    const data = computedDsnFixture(1800, 121.33);
    expect(data.employees[0].payroll.paidHours).toBe(121.33);
    expect(buildDsnP26V01Complete(data)).toContain("S21.G00.53.002,'121.33'");
  });
  it("conserve les arrondis en cumul sur la réduction générale", () => {
    const january = computedSnapshot();
    const february = computedSnapshot({ period: { year: 2026, month: 2 }, yearToDate: january.bulletin.yearToDate });
    const jan = splitLockedRgdu(january);
    const feb = splitLockedRgdu(february, january);
    const expectedUrssaf = -Math.round(february.bulletin.yearToDate.rgduAmount * 0.3380 / 0.3981 * 100);
    expect(cents(jan.urssaf) + cents(feb.urssaf)).toBe(expectedUrssaf);
    expect(cents(jan.urssaf + jan.retirement + feb.urssaf + feb.retirement)).toBe(-cents(february.bulletin.yearToDate.rgduAmount));
    expect(() => splitLockedRgdu(february)).toThrow(/bulletin antérieur/);
  });
  it("déclare un reversement de réduction via le CTP 669 avec une assiette", () => {
    const january = computedSnapshot({ pay: { monthlyBaseSalary: 4050, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } });
    const february = computedSnapshot({ period: { year: 2026, month: 2 }, yearToDate: january.bulletin.yearToDate, pay: { monthlyBaseSalary: 15000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } });
    const mapped = mapLockedContributions({ snapshot: february, previousSnapshot: january, ...ids });
    const reversal = mapped.aggregates.find((item) => item.code === "669")!;
    expect(reversal.baseAmount).toBeGreaterThan(0);
    expect(reversal.contributionAmount).toBeUndefined();
    expect(mapped.individual.find((item) => item.code === "018")!.contributionAmount).toBeGreaterThan(0);
  });
  it("bloque une CET déclenchée rétroactivement par une hausse du salaire", () => {
    const january = computedSnapshot();
    const february = computedSnapshot({ period: { year: 2026, month: 2 }, yearToDate: january.bulletin.yearToDate, pay: { monthlyBaseSalary: 15000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } });
    expect(() => mapLockedContributions({ snapshot: february, previousSnapshot: january, ...ids })).toThrow(/régularisation CET/);
  });
  it("bloque un cumul RGDU divergent et un changement de seuil non traité", () => {
    const january = computedSnapshot();
    const february = computedSnapshot({ period: { year: 2026, month: 2 }, yearToDate: january.bulletin.yearToDate });
    const corrupt = structuredClone(january);
    corrupt.bulletin.yearToDate.rgduAmount += 1;
    expect(() => splitLockedRgdu(february, corrupt)).toThrow(/cumul RGDU/);
    const changed = structuredClone(february);
    changed.inputs.organization.headcount = 50;
    expect(() => splitLockedRgdu(changed, january)).toThrow(/changement de seuil/i);
  });
  it("additionne une fois l'assiette CTP par salarié", () => {
    const group = mapLockedContributions({ snapshot: computedSnapshot(), ...ids }).aggregates;
    const merged = mergeLockedAggregates([group, group]);
    expect(merged.find((item) => item.code === "100" && item.baseQualifier === "920")!.baseAmount).toBe(5000);
    expect(merged.find((item) => item.code === "100" && item.baseQualifier === "920")!.payableAmount).toBe(group.find((item) => item.code === "100" && item.baseQualifier === "920")!.payableAmount * 2);
  });
  it("bloque une ligne inconnue ou des totaux altérés", () => {
    const snapshot = computedSnapshot();
    const altered = structuredClone(snapshot);
    altered.bulletin.lines[0].amount = NaN;
    altered.bulletin.totals.employeeContributions += 1;
    expect(() => mapLockedContributions({ snapshot: altered, ...ids })).toThrow(/totaux du bulletin/);
    snapshot.bulletin.lines.push({ code: "NEW_LEVY", label: "Cotisation inconnue", section: "AUTRES_EMPLOYEUR", amount: 0, employerAmount: 0, source: "Test" });
    expect(() => mapLockedContributions({ snapshot, ...ids })).toThrow(/NEW_LEVY/);
  });
  it("rattache mutuelle et prévoyance à leurs affiliations sans doubler les paiements", () => {
    const data = computedDsnFixture(6000, 151.67, true);
    expect(data.assessedBases.filter((base) => base.code === "31")).toHaveLength(2);
    const payment = data.payments.find((item) => item.opsIdentifier === "P0983")!;
    expect(payment.components).toHaveLength(2);
    expect(cents(payment.amount)).toBe(payment.components!.reduce((sum, component) => sum + cents(component.amount), 0));
    const content = buildDsnP26V01Complete(data);
    expect(content.match(/S21\.G00\.81\.001,'059'/g)).toHaveLength(2);
    expect(content).toContain("S21.G00.20.002,'DGFIP_PAS'");
    expect(content).toContain("S21.G00.55.004,'2026M01'");
    const altered = structuredClone(data);
    altered.payments.find((item) => item.opsIdentifier === "P0983")!.amount += 0.01;
    expect(() => buildDsnP26V01Complete(altered)).toThrow(/dettes/);
    const unaffiliated = structuredClone(data);
    unaffiliated.assessedBases = unaffiliated.assessedBases.filter((base) => base.code !== "31");
    expect(() => buildDsnP26V01Complete(unaffiliated)).toThrow(/affiliation complémentaire/);
    expect(content).toContain("S21.G00.70.014,'01012024'");
  });
  it("bloque une affiliation modifiée en cours de mois", () => {
    const snapshot = computedSnapshot();
    const affiliations = identifyDsnAffiliations([normalizeDsnComplementaryAffiliations([{
      coverage: "SANTE", organismCode: "P0983", contractReference: "SANTE-TEST", validFrom: "2026-01-15",
      paymentFrequency: "MONTHLY", componentCodes: ["20"], sourceReference: "FPOC test",
    }])])[0];
    expect(() => mapLockedContributions({ snapshot, ...ids, complementaryAffiliations: affiliations })).toThrow(/périodes segmentées/);
  });
  it("bloque la complémentaire sans affiliation et les exonérations spécifiques non traduites", () => {
    const ordinary = computedSnapshot();
    const health = computedSnapshot({ organization: { ...ordinary.inputs.organization, healthPlan: { monthlyAmount: 60, employerShare: 0.5 } } });
    expect(() => mapLockedContributions({ snapshot: health, ...ids })).toThrow(/SANTE/);
    const apprentice = structuredClone(ordinary);
    apprentice.inputs.employee.contract = "APPRENTISSAGE";
    expect(() => mapLockedContributions({ snapshot: apprentice, ...ids })).toThrow(/apprentis/);
  });
});
