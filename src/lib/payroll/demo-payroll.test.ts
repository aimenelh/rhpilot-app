import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DEMO_EMPLOYEES } from "@/lib/demo-employees";
import { FULL_TIME_SCHEDULE, daysBetweenInclusive } from "./bulletin/calendar";
import { computePayslip, BULLETIN_ENGINE_VERSION } from "./bulletin/compute";
import { BULLETIN_SNAPSHOT_ENGINE, assertPriorPayrollCoverage, resolvePriorState } from "./bulletin/prior-state";
import type { PayslipInput } from "./bulletin/types";
import { encryptDsnSensitiveValue } from "./dsn-pii";
import { rgduUrssafFraction, splitLockedRgdu } from "./dsn-locked-contributions";
import {
  DEMO_DSN_SETTINGS, DEMO_HEADCOUNT, DEMO_PAYROLL_EMPLOYEES, DEMO_PREVOYANCE_RATES, DEMO_SIRET, computeDemoOpening, demoContractEndDate, demoDsnProfileFields,
  demoNir, demoOpeningMonths, demoPaidLeaveOpening, demoPasRateIdentifier, demoPaymentDate, demoPayrollEmployee,
} from "./demo-payroll-data";

const mock = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    payrollPeriod: { findFirst: async () => mock.state.period },
    payrollCalculation: { findMany: async (args: { where: Record<string, unknown> }) => ("payroll_periods" in args.where ? [] : mock.state.calculations) },
    employee: { findMany: async () => mock.state.employees },
    collectiveAgreement: { findUnique: async () => ({ idcc: "1486" }) },
    $queryRaw: async (strings: TemplateStringsArray) => (strings.join("?").includes("dsn_employee_profiles") ? mock.state.profiles : [mock.state.organization]),
  },
}));

const SYNTEC_MINIMA: Record<string, number> = {
  "ETAM_1.1": 1815, "ETAM_1.2": 1845, "ETAM_2.1": 1875, "ETAM_2.2": 1905, "ETAM_2.3": 2045, "ETAM_3.1": 2185, "ETAM_3.2": 2340, "ETAM_3.3": 2490,
  "IC_1.1": 2135, "IC_1.2": 2240, "IC_2.2": 2850, "IC_2.3": 3275, "IC_3.1": 3650,
};
const SMIC_2026 = 1823.03;
const today = new Date("2026-10-07T10:00:00.000Z");
const iso = (date: Date) => date.toISOString().slice(0, 10);

let priorKey: string | undefined;
beforeAll(() => { priorKey = process.env.DSN_PII_ENCRYPTION_KEY; process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64"); });
afterAll(() => { if (priorKey === undefined) delete process.env.DSN_PII_ENCRYPTION_KEY; else process.env.DSN_PII_ENCRYPTION_KEY = priorKey; });

describe("données de la paie de démonstration", () => {
  it("couvre chaque salarié fictif avec un salaire au moins égal au minimum applicable", () => {
    for (const template of DEMO_EMPLOYEES) {
      const data = demoPayrollEmployee(template.firstName);
      expect(data, template.firstName).not.toBeNull();
      expect(SYNTEC_MINIMA[data!.classificationCode], data!.classificationCode).toBeDefined();
      if (!data!.alternance) expect(data!.salary).toBeGreaterThanOrEqual(Math.max(SMIC_2026, SYNTEC_MINIMA[data!.classificationCode]));
      expect(data!.conventionalStatus === "04").toBe(data!.category === "CADRE");
      expect(/^[3-6]\d\d[a-z]$/.test(data!.pcsEse)).toBe(true);
    }
  });

  it("produit des NIR fictifs cohérents avec la naissance et un SIRET à clé valide", () => {
    DEMO_PAYROLL_EMPLOYEES.forEach((employee, index) => {
      const nir = demoNir(employee, index);
      expect(nir).toMatch(/^[12]\d{12}$/);
      expect(nir.slice(1, 3)).toBe(employee.birthDate.slice(2, 4));
      expect(nir.slice(5, 7)).toBe(employee.birthDepartment);
    });
    expect(new Set(DEMO_PAYROLL_EMPLOYEES.map((employee, index) => demoNir(employee, index))).size).toBe(DEMO_PAYROLL_EMPLOYEES.length);
    expect(demoPasRateIdentifier(0)).toMatch(/^[1-9]\d{0,17}$/);
  });

  it("fixe des fins de contrat après le mois suivant et un paiement le dernier jour ouvré", () => {
    expect(demoContractEndDate("CDI", "2024-01-11", 2026, 10)).toBeNull();
    expect(iso(demoContractEndDate("CDD", "2026-08-08", 2026, 10)!)).toBe("2027-08-07");
    expect(iso(demoContractEndDate("APPRENTISSAGE", "2026-09-17", 2026, 10)!)).toBe("2028-09-16");
    expect(iso(demoContractEndDate("CDD", "2025-03-01", 2026, 10)!)).toBe("2026-11-30");
    expect(iso(demoPaymentDate(2026, 10))).toBe("2026-10-30");
    expect(iso(demoPaymentDate(2026, 11))).toBe("2026-11-30");
    expect(demoOpeningMonths("2024-01-11", 2026, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(demoOpeningMonths("2026-09-17", 2026, 10)).toEqual([9]);
    expect(demoOpeningMonths("2026-10-02", 2026, 10)).toEqual([]);
  });

  it("calcule les cumuls de reprise avec le moteur, mois après mois", () => {
    const employee = demoPayrollEmployee("Léa")!;
    const organization = { atmpRatePercent: 1, healthPlan: { monthlyAmount: 30, employerShare: 0.5 }, prevoyance: DEMO_PREVOYANCE_RATES, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES" as const, workedSolidarityDay: false };
    const opening = computeDemoOpening({ employee, employeeId: "lea", displayName: "Léa Fontaine", hireDate: "2025-09-02", contractEndDate: null, year: 2026, month: 10, organization, headcount: DEMO_HEADCOUNT, rateIdentifier: "900000000007" })!;
    expect(opening.throughMonth).toBe(9);
    expect(opening.bulletins).toHaveLength(9);
    expect(opening.cumuls.grossSubject).toBeCloseTo(employee.salary * 9, 2);
    expect(opening.cumuls.rgduAmount).toBeGreaterThan(0);
    expect(opening.cumuls.rgduUrssafAmount).toBe(Math.round(opening.cumuls.rgduAmount * rgduUrssafFraction(DEMO_HEADCOUNT) * 100) / 100);
    const balances = demoPaidLeaveOpening(employee, "2025-09-02", 2026, 10)!;
    expect(balances.currentAcquired).toBe(10);
    expect(balances.previousAcquired).toBe(23);
  });
});

/** Reproduit le calcul du mois tel que le fait la période de paie, à partir des reprises de démonstration. */
function demoMonth() {
  const year = 2026;
  const month = 10;
  const employees = DEMO_EMPLOYEES.map((template, position) => {
    const data = demoPayrollEmployee(template.firstName)!;
    const hire = new Date(today);
    hire.setUTCDate(hire.getUTCDate() + template.hireOffset);
    const hireDate = iso(hire);
    const contractEndDate = demoContractEndDate(data.contract, hireDate, year, month);
    return { id: `employee-${position}`, firstName: template.firstName, lastName: template.lastName, position: template.position, hireDate: new Date(`${hireDate}T00:00:00.000Z`), contractEndDate, contractType: data.contract, data, index: DEMO_PAYROLL_EMPLOYEES.indexOf(data) };
  });
  const organization = { atmpRatePercent: 1, healthPlan: { monthlyAmount: 30, employerShare: 0.5 }, prevoyance: DEMO_PREVOYANCE_RATES, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES" as const, workedSolidarityDay: false };
  const calculations = employees.map((employee) => {
    const hireDate = iso(employee.hireDate);
    const contractEndDate = employee.contractEndDate ? iso(employee.contractEndDate) : null;
    const displayName = `${employee.firstName} ${employee.lastName}`;
    const rateIdentifier = demoPasRateIdentifier(employee.index);
    const opening = computeDemoOpening({ employee: employee.data, employeeId: employee.id, displayName, hireDate, contractEndDate, year, month, organization, headcount: DEMO_HEADCOUNT, rateIdentifier });
    const leave = demoPaidLeaveOpening(employee.data, hireDate, year, month);
    // Stockage JSON des reprises, comme en base.
    const payrollOpening = opening ? JSON.parse(JSON.stringify({ year, throughMonth: opening.throughMonth, cumuls: opening.cumuls })) : null;
    assertPriorPayrollCoverage({ year, month, displayName, hireDate, calculations: [], payrollOpening });
    const prior = resolvePriorState({ year, month, displayName, hireDate, calculations: [], paidLeaveOpening: leave ? { asOf: "2026-10-01", balances: leave } : null, payrollOpening });
    const inputs: PayslipInput = {
      period: { year, month }, paymentDate: iso(demoPaymentDate(year, month)),
      organization: { ...organization, headcount: DEMO_HEADCOUNT, mobilityRatePercent: 0, mobilityDsn: null, territory: "METROPOLE", alsaceMoselle: false, paidLeaveWorkingDays: null },
      employee: { id: employee.id, displayName, contract: employee.data.contract, executive: employee.data.category === "CADRE", hireDate, contractEndDate, seniorityDate: null,
        plannedContractDays: employee.data.contract === "CDD" && contractEndDate ? daysBetweenInclusive(hireDate, contractEndDate) : null },
      pay: { monthlyBaseSalary: employee.data.salary, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
      absences: [], overtime: {}, complementaryHours: {}, bonuses: [], benefitsInKind: [], expenses: [], mealVouchers: null, publicTransport: null, netAdjustments: [],
      paidLeave: prior.paidLeave, priorPaidLeaveIndemnities: prior.paidLeaveIndemnities, yearToDate: prior.yearToDate, sickPayHistory: prior.sickPayHistory,
      previousGrossSalaries: prior.previousGrossSalaries, grossSalaryHistory: prior.grossSalaryHistory,
      withholding: { mode: "PERSONALIZED", rate: employee.data.pasRate, rateIdentifier }, termination: null,
    };
    const result = computePayslip(inputs);
    const totals = result.totals;
    const snapshot = JSON.parse(JSON.stringify({
      profile: { id: `profile-${employee.id}`, baseSalaryCents: Math.round(employee.data.salary * 100), monthlyHours: "151.67", collectiveAgreementId: "ccn-1486-syntec" },
      variables: [], validatedAbsences: [], dsnWorkStoppages: [],
      withholdingTax: { status: "RATE_PROVIDED", rate: employee.data.pasRate, amount: totals.withholdingTax, validFrom: "2026-01-01T00:00:00.000Z", validUntil: null, source: "DGFIP", sourceReference: rateIdentifier },
      calculationSource: { engine: BULLETIN_SNAPSHOT_ENGINE, engineVersion: BULLETIN_ENGINE_VERSION, socialTotalsAuthoritative: true },
      socialEngine: { employerCost: totals.employerCost },
      bulletin: result, inputs,
    }));
    return { employeeId: employee.id, grossAmount: totals.grossTotal, employeeContributions: totals.employeeContributions, employerContributions: totals.employerContributions,
      netBeforeTax: totals.netBeforeTax, withholdingTax: totals.withholdingTax, netPaid: totals.netPaid, netTaxableAmount: totals.netTaxable, netSocialAmount: totals.netSocial, calculationSnapshot: snapshot };
  });
  const profiles = employees.map((employee) => ({
    employeeId: employee.id, nirCiphertext: encryptDsnSensitiveValue(demoNir(employee.data, employee.index)),
    ...demoDsnProfileFields({ employee: employee.data, index: employee.index, hireDate: iso(employee.hireDate), contractEndDate: employee.contractEndDate, siret: DEMO_SIRET, year, headcount: DEMO_HEADCOUNT }),
  }));
  mock.state = {
    period: { id: "period", year, month, status: "LOCKED", paymentDate: demoPaymentDate(year, month) },
    calculations, employees, profiles,
    organization: {
      id: "org", name: "RH PILOT", siret: DEMO_SIRET, payrollAddress: "10 rue de la Démonstration", payrollPostalCode: "30000", payrollCity: "Nîmes", payrollNafCode: "6201Z", payrollDepartment: "30", atmpRate: 1,
      mainCollectiveAgreementCode: "1486", ijssSubrogation: true, contactName: DEMO_DSN_SETTINGS.contactName, contactEmail: DEMO_DSN_SETTINGS.contactEmail, contactPhone: DEMO_DSN_SETTINGS.contactPhone,
      declaredContactType: DEMO_DSN_SETTINGS.declaredContactType, enterpriseApenCode: "6201Z", defaultTestMode: true, urssafSiret: DEMO_DSN_SETTINGS.urssafSiret, retirementSiret: DEMO_DSN_SETTINGS.retirementSiret,
      paymentIbanCiphertext: encryptDsnSensitiveValue(DEMO_DSN_SETTINGS.iban), paymentBic: DEMO_DSN_SETTINGS.bic, subrogationIbanCiphertext: encryptDsnSensitiveValue(DEMO_DSN_SETTINGS.iban), subrogationBic: DEMO_DSN_SETTINGS.bic, sepaMandatesConfirmed: true,
    },
  };
  return { calculations };
}

describe("DSN du premier mois de démonstration", () => {
  it("ventile la RGDU depuis la reprise et refuse une reprise sans part Urssaf", () => {
    const { calculations } = demoMonth();
    const lea = calculations.find((calculation) => (calculation.calculationSnapshot.inputs.employee.displayName as string).startsWith("Léa"))!;
    const split = splitLockedRgdu(lea.calculationSnapshot);
    const ytd = lea.calculationSnapshot.inputs.yearToDate;
    const cumulative = lea.calculationSnapshot.bulletin.yearToDate.rgduAmount;
    expect(split.urssaf).toBeCloseTo(-(Math.round(cumulative * rgduUrssafFraction(DEMO_HEADCOUNT) * 100) / 100 - ytd.rgduUrssafAmount), 2);
    const withoutShare = JSON.parse(JSON.stringify(lea.calculationSnapshot));
    delete withoutShare.inputs.yearToDate.rgduUrssafAmount;
    expect(() => splitLockedRgdu(withoutShare)).toThrow(/part Urssaf du cumul RGDU/);
  });

  it("produit une DSN complète pour les quinze salariés fictifs", async () => {
    demoMonth();
    const { prepareDsnP26V01 } = await import("./dsn-preparation");
    const dsn = await prepareDsnP26V01({ organizationId: "org", periodId: "period", testMode: true, fileDate: new Date("2026-11-03T10:00:00.000Z") });
    expect(dsn.employeeCount).toBe(15);
    expect(dsn.content).toContain("S21.G00.40.008,'61'");
    expect(dsn.content).toContain("S21.G00.40.008,'64'");
    expect(dsn.content).toContain("S21.G00.30.025,'05'");
    expect(dsn.content).toContain("S21.G00.23.001,'668'");
    expect(dsn.content).toContain("S21.G00.23.001,'726'");
    expect(dsn.content.match(/^S21\.G00\.30\.001,/gm)).toHaveLength(15);
  });
});
