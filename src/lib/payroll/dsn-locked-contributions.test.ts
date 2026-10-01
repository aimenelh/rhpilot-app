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
  it("raccorde un contrat 39 h en rémunération 018 et ses deux réductions", () => {
    const snapshot = computedSnapshot({
      pay: { monthlyBaseSalary: 3000, contractMonthlyHours: 169, structuralOvertimeMonthlyHours: 17.33, structuralOvertimeRate: 0.25, schedule: [7.8, 7.8, 7.8, 7.8, 7.8, 0, 0] },
    });
    const mapped = mapLockedContributions({ snapshot, ...ids });
    expect(mapped.overtime.remunerations).toHaveLength(1);
    expect(mapped.overtime.remunerations[0]).toMatchObject({ type: "018", hours: 17.33 });
    expect(mapped.individual.find((item) => item.code === "114")).toMatchObject({ baseCode: "03", baseAmount: mapped.overtime.totalAmount });
    expect(mapped.individual.find((item) => item.code === "021")).toMatchObject({ baseCode: "03", baseAmount: mapped.overtime.totalAmount });
    expect(mapped.aggregates.find((item) => item.code === "003")).toMatchObject({ baseQualifier: "921" });
    expect(mapped.aggregates.find((item) => item.code === "004")).toMatchObject({ baseQualifier: "921" });
    const csgBase = mapped.bases.find((base) => base.code === "04")!.amount;
    expect(csgBase).toBe(snapshot.bulletin.lines.find((line) => line.code === "CSG_CRDS_NON_DEDUCTIBLE")!.detail!.crdsBase);
    const due = mapped.liabilities.reduce((sum, item) => sum + cents(item.amount), 0);
    const deferred = mapped.deferred.reduce((sum, item) => sum + cents(item.amount), 0);
    expect(due + deferred).toBe(cents(snapshot.bulletin.totals.employeeContributions) + cents(snapshot.bulletin.totals.employerContributions));

    const data = computedDsnFixture(3000, 169, false, undefined, false, {
      pay: { monthlyBaseSalary: 3000, contractMonthlyHours: 169, structuralOvertimeMonthlyHours: 17.33, structuralOvertimeRate: 0.25, schedule: [7.8, 7.8, 7.8, 7.8, 7.8, 0, 0] },
    });
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.51.011,'018'");
    expect(content).toContain("S21.G00.51.012,'17.33'");
    expect(content).toContain("S21.G00.58.003,'01'");
    expect(content).toContain("S21.G00.81.001,'114'");
    expect(content).toContain("S21.G00.81.001,'021'");
    expect(() => buildDsnP26V01Complete(data)).not.toThrow();
  });

  it("raccorde les heures supplémentaires aléatoires en 017", () => {
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, { overtime: { hoursFirstBand: 5 } });
    const content = buildDsnP26V01Complete(data);
    expect(data.employees[0].payroll.overtimeRemunerations).toEqual([
      expect.objectContaining({ type: "017", hours: 5 }),
    ]);
    expect(content).toContain("S21.G00.51.011,'017'");
    expect(content).toContain("S21.G00.51.012,'5.00'");
    expect(data.contributionBordereau.aggregatedContributions.some((item) => item.code === "003")).toBe(true);
    expect(data.contributionBordereau.aggregatedContributions.some((item) => item.code === "004")).toBe(true);
  });

  it("raccorde les heures complémentaires en 017 sans déduction patronale", () => {
    const data = computedDsnFixture(1800, 121.33, false, undefined, false, { complementaryHours: { hoursWithinTenth: 4 } });
    const content = buildDsnP26V01Complete(data);
    expect(data.employees[0].payroll.overtimeRemunerations).toEqual([
      expect.objectContaining({ type: "017", hours: 4 }),
    ]);
    expect(content).toContain("S21.G00.51.011,'017'");
    expect(data.contributionBordereau.individualContributions.some((item) => item.code === "114")).toBe(true);
    expect(data.contributionBordereau.individualContributions.some((item) => item.code === "021")).toBe(false);
    expect(data.contributionBordereau.aggregatedContributions.some((item) => item.code === "003")).toBe(true);
    expect(data.contributionBordereau.aggregatedContributions.some((item) => item.code === "004")).toBe(false);
  });

  it("raccorde une absence sans solde en activité 02 et suspension 501", () => {
    const absence = { id: "unpaid-1", kind: "UNPAID_LEAVE" as const, start: "2026-01-12" as const, end: "2026-01-16" as const };
    const snapshot = computedSnapshot({ absences: [absence] });
    const mapped = mapLockedContributions({ snapshot, ...ids });
    expect(mapped.unpaidAbsence.hours).toBe(35);
    expect(mapped.unpaidAbsence.suspensions).toEqual([{ reasonCode: "501", start: "2026-01-12", end: "2026-01-16" }]);
    const due = mapped.liabilities.reduce((sum, item) => sum + cents(item.amount), 0);
    const deferred = mapped.deferred.reduce((sum, item) => sum + cents(item.amount), 0);
    expect(due + deferred).toBe(cents(snapshot.bulletin.totals.employeeContributions) + cents(snapshot.bulletin.totals.employerContributions));

    const data = computedDsnFixture(2500, 151.67, false, undefined, false, { absences: [absence] });
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.65.001,'501'");
    expect(content).toContain("S21.G00.65.002,'12012026'");
    expect(content).toContain("S21.G00.65.003,'16012026'");
    expect(content).toContain("S21.G00.53.001,'02'");
    expect(content).toContain("S21.G00.53.002,'35.00'");
    expect(() => buildDsnP26V01Complete(data)).not.toThrow();
  });

  it("continue de bloquer les absences nécessitant un signalement métier", () => {
    const snapshot = computedSnapshot({ absences: [{ id: "rtt-1", kind: "RTT", start: "2026-01-12", end: "2026-01-12" }] });
    expect(() => mapLockedContributions({ snapshot, ...ids })).toThrow(/absences autres que sans solde|blocs déclaratifs propres/i);
  });

  it.each([
    ["RTT", "rtt-1"],
    ["FAMILY_EVENT", "family-1"],
  ] as const)("conserve %s dans le travail rémunéré type 01", (kind, id) => {
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, {
      absences: [{ id, kind, start: "2026-01-12", end: "2026-01-12" }],
    });
    const content = buildDsnP26V01Complete(data);
    expect(data.employees[0].payroll.paidHours).toBe(151.67);
    expect(data.employees[0].payroll.unpaidAbsenceHours).toBe(0);
    expect(content).toContain("S21.G00.53.001,'01'");
    expect(content).toContain("S21.G00.53.002,'151.67'");
    expect(content).not.toContain("S21.G00.53.001,'02'");
    expect(content).not.toContain("S21.G00.65.");
  });

  it("laisse passer une prime mensuelle ordinaire dans les rémunérations et assiettes sans inventer un bloc 52", () => {
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, {
      bonuses: [{ code: "ACTIVITY_BONUS", label: "Prime d'activité", amount: 250 }],
    });
    expect(data.employees[0].payroll.grossAmount).toBe(2750);
    expect(data.employees[0].payroll.unemploymentBase).toBe(2750);
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.51.011,'001'");
    expect(content).toContain("S21.G00.51.013,'2750.00'");
    expect(content).not.toContain("S21.G00.52.");
  });

  it("bloque une prime annuelle ou exceptionnelle sans type et période S21.G00.52 explicites", () => {
    const snapshot = computedSnapshot({
      bonuses: [{ code: "YEAR_END_BONUS", label: "13e mois", amount: 1000, excludedFromPaidLeaveBase: true }],
    });
    expect(() => mapLockedContributions({ snapshot, ...ids })).toThrow(/S21\.G00\.52.*période de rattachement/i);
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
    expect(content.indexOf("S21.G00.70.012")).toBeLessThan(content.indexOf("S21.G00.71.002"));
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
  it("déclare le forfait social et les trois composantes mobilité sans changer la dette verrouillée", () => {
    const data = computedDsnFixture(2500, 151.67, true, { headcount: 15, mobilityRatePercent: 1.85,
      mobilityDsn: { source: "URSSAF", communeCode: "75101", validFrom: "2026-01-01", validUntil: null, components: { vm: 1.2, vma: 0.5, vmr: 0.15 } } });
    expect(data.assessedBases.some((base) => base.code === "13")).toBe(true);
    expect(data.assessedBases.filter((base) => base.code === "57")).toHaveLength(1);
    const contributions = data.contributionBordereau.individualContributions.filter((item) => ["081", "082", "918"].includes(item.code));
    expect(contributions).toHaveLength(3);
    expect(contributions.every((item) => item.inseeCommuneCode === "75101")).toBe(true);
    expect(contributions.reduce((sum, item) => sum + cents(item.contributionAmount!), 0)).toBe(cents(2500 * 1.85 / 100));
    expect(data.contributionBordereau.aggregatedContributions.filter((item) => ["479", "900", "901", "820"].includes(item.code))).toHaveLength(4);
    expect(() => buildDsnP26V01Complete(data)).not.toThrow();
  });
  it("déclare un cadre et le FNAL déplafonné au seuil de 50 salariés", () => {
    const data = computedDsnFixture(3000, 151.67, true, { headcount: 50 }, true);
    expect(data.employees[0].contract.retirementStatusCode).toBe("01");
    const individual = data.contributionBordereau.individualContributions;
    expect(individual.find((item) => item.code === "132")!.contributionAmount).toBe(1.8);
    expect(individual.find((item) => item.code === "049")).toMatchObject({ baseCode: "03", baseAmount: 3000, contributionAmount: 15 });
    const aggregate = data.contributionBordereau.aggregatedContributions;
    expect(aggregate.some((item) => item.code === "236")).toBe(true);
    expect(aggregate.some((item) => item.code === "332")).toBe(false);
    expect(() => buildDsnP26V01Complete(data)).not.toThrow();
  });
  it("conserve le centime d'arrondi mobilité et refuse une provenance incomplète", () => {
    const ordinary = computedSnapshot();
    const organization = { ...ordinary.inputs.organization, headcount: 15, mobilityRatePercent: 1.85,
      mobilityDsn: { source: "URSSAF" as const, communeCode: "75101", validFrom: "2026-01-01", validUntil: null, components: { vm: 1.2, vma: 0.5, vmr: 0.15 } } };
    const snapshot = computedSnapshot({ organization, pay: { ...ordinary.inputs.pay, monthlyBaseSalary: 2500.13 } });
    const mapped = mapLockedContributions({ snapshot, ...ids });
    const mobility = mapped.individual.filter((item) => ["081", "082", "918"].includes(item.code));
    const line = snapshot.bulletin.lines.find((item) => item.code === "VERSEMENT_MOBILITE")!;
    expect(mobility.reduce((sum, item) => sum + cents(item.contributionAmount!), 0)).toBe(cents(line.employerAmount!));
    const incomplete = computedSnapshot({ organization: { ...organization, mobilityDsn: null } });
    expect(() => mapLockedContributions({ snapshot: incomplete, ...ids })).toThrow(/taux manuel ou historique/);
    const changed = structuredClone(snapshot);
    changed.inputs.organization.mobilityDsn!.components.vmr = 0.2;
    expect(() => mapLockedContributions({ snapshot: changed, ...ids })).toThrow(/ventilation mobilité/);
    changed.inputs.organization.mobilityDsn!.components.vmr = 0.15;
    changed.inputs.organization.mobilityDsn!.validUntil = "2026-01-15";
    expect(() => mapLockedContributions({ snapshot: changed, ...ids })).toThrow(/validité/);
    changed.inputs.organization.mobilityDsn!.validUntil = null;
    changed.inputs.organization.mobilityDsn!.communeCode = "75056";
    expect(() => mapLockedContributions({ snapshot: changed, ...ids })).toThrow(/arrondissement de travail/);
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
