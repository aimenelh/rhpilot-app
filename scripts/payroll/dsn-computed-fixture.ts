import { identifyDsnAffiliations, normalizeDsnComplementaryAffiliations } from "../../src/lib/payroll/dsn-complementary-affiliations";
import { computePayslip } from "../../src/lib/payroll/bulletin/compute";
import { FULL_TIME_SCHEDULE, type WeeklySchedule } from "../../src/lib/payroll/bulletin/calendar";
import type { PayslipInput } from "../../src/lib/payroll/bulletin/types";
import { mapLockedContributions } from "../../src/lib/payroll/dsn-locked-contributions";
import type { DsnP26CompleteInput } from "../../src/lib/payroll/dsn-p26v01-complete";
import { mappedDsnFixture } from "./dsn-fixture";
import { dsnPasFromLockedBulletin } from "../../src/lib/payroll/dsn-locked-pas";

type FixtureStoppageMetadata = {
  absenceId: string; type: string; startDate: string; endDate: string;
  lastWorkedDate: string | null; subrogationStartDate: string | null; subrogationEndDate: string | null;
  workAccidentDate: string | null; returnDate: string | null; returnReasonCode: string | null;
};

export function computedSnapshot(input?: Partial<PayslipInput>, metadata: Record<string, Partial<FixtureStoppageMetadata>> = {}) {
  const inputs: PayslipInput = {
    period: { year: 2026, month: 1 },
    organization: { headcount: 4, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE", healthPlan: null, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES" },
    employee: { id: "employee-test", displayName: "Maxime Dupont", contract: "CDI", executive: false, hireDate: "2024-01-01" },
    pay: { monthlyBaseSalary: 2500, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
    withholding: { mode: "PERSONALIZED", rate: 0.075, rateIdentifier: "123456789" },
    ...input,
  };
  const validatedAbsences: FixtureStoppageMetadata[] = (inputs.absences ?? []).map((absence) => {
    const day = new Date(absence.start + "T00:00:00.000Z");
    if (absence.kind !== "WORK_ACCIDENT") day.setUTCDate(day.getUTCDate() - 1);
    return { absenceId: absence.id, type: absence.kind, startDate: absence.start, endDate: absence.end,
      lastWorkedDate: day.toISOString().slice(0, 10), subrogationStartDate: null, subrogationEndDate: null,
      workAccidentDate: null, returnDate: null, returnReasonCode: null, ...metadata[absence.id] };
  });
  return { inputs, bulletin: computePayslip(inputs), validatedAbsences };
}

/** Fichier synthétique dont chaque montant financier vient effectivement du moteur. */
export function computedDsnFixture(
  gross = 2500,
  monthlyHours = 151.67,
  complementary = false,
  organizationOverrides?: Partial<PayslipInput["organization"]>,
  executive = false,
  inputOverrides?: Partial<PayslipInput>,
  metadata?: Record<string, Partial<FixtureStoppageMetadata>>,
): DsnP26CompleteInput {
  const basePay = { monthlyBaseSalary: gross, contractMonthlyHours: monthlyHours, schedule: [monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, 0, 0] as WeeklySchedule };
  const snapshot = computedSnapshot({ ...inputOverrides, pay: { ...basePay, ...(inputOverrides?.pay ?? {}) } }, metadata);
  if (organizationOverrides) Object.assign(snapshot.inputs.organization, organizationOverrides);
  snapshot.inputs.employee.executive = executive;
  if (complementary) {
    snapshot.inputs.organization.healthPlan = { monthlyAmount: 60, employerShare: 0.5 };
    snapshot.inputs.organization.prevoyance = {
      nonCadre: { employeeT1: 0.002, employerT1: 0.003, employeeT2: 0.002, employerT2: 0.003 },
      cadre: { employeeT1: 0, employerT1: 0.015, employeeT2: 0, employerT2: 0.015 },
    };
  }
  if (complementary || organizationOverrides || executive || inputOverrides) snapshot.bulletin = computePayslip(snapshot.inputs);
  const affiliations = complementary ? identifyDsnAffiliations([normalizeDsnComplementaryAffiliations([
    { coverage: "SANTE", organismCode: "P0983", contractReference: "SANTE-TEST", delegateCode: null, populationCode: null, optionCode: null, validFrom: "2024-01-01", validUntil: null, paymentFrequency: "MONTHLY", componentCodes: ["20"], sourceReference: "FPOC synthétique santé" },
    { coverage: "PREVOYANCE", organismCode: "P0983", contractReference: "PREVO-TEST", delegateCode: null, populationCode: null, optionCode: null, validFrom: "2024-01-01", validUntil: null, paymentFrequency: "MONTHLY", componentCodes: ["11", "24"], sourceReference: "FPOC synthétique prévoyance" },
  ])])[0] : [];
  const data = mappedDsnFixture();
  const employee = data.employees[0];
  // Apprentis : dispositif 64 sous 11 salariés, 65 au-delà (cas synthétiques hors entreprises artisanales).
  const apprenticePolicy = snapshot.inputs.employee.contract === "APPRENTISSAGE" ? (snapshot.inputs.organization.headcount >= 11 ? "65" : "64") : null;
  const mapped = mapLockedContributions({ snapshot, employeeNir: employee.nir, urssafSiret: "75366412700077", retirementOps: "44832375800038", complementaryAffiliations: affiliations, apprenticePublicPolicyCode: apprenticePolicy });
  const totals = snapshot.bulletin.totals;
  const employeePas = snapshot.bulletin.withholding;
  data.period = { ...snapshot.inputs.period, paymentDate: new Date(snapshot.inputs.paymentDate ?? new Date(Date.UTC(snapshot.inputs.period.year, snapshot.inputs.period.month, 0)).toISOString().slice(0, 10)) };
  employee.contract.startDate = new Date(snapshot.inputs.employee.hireDate + "T00:00:00.000Z");
  employee.contract.contractNatureCode = snapshot.inputs.employee.contract === "CDD" || (apprenticePolicy && snapshot.inputs.employee.contractEndDate) ? "02" : "01";
  if (apprenticePolicy) employee.contract.publicPolicyCode = apprenticePolicy;
  employee.contract.endDate = snapshot.inputs.employee.contractEndDate ? new Date(snapshot.inputs.employee.contractEndDate + "T00:00:00.000Z") : null;
  employee.contract.workAccidentRate = mapped.atmpRatePercent;
  employee.contract.conventionalStatusCode = executive ? "04" : "06";
  employee.contract.retirementStatusCode = executive ? "01" : "04";
  employee.contract.contractWorkQuota = snapshot.inputs.pay.contractMonthlyHours;
  employee.contract.workModalityCode = snapshot.inputs.pay.contractMonthlyHours < 151.67 ? "20" : "10";
  employee.contract.workStoppages = mapped.workStoppages.stoppages.map((item) => ({
    reasonCode: item.reasonCode,
    lastDayWorked: new Date(item.lastDayWorked + "T00:00:00.000Z"),
    expectedEndDate: new Date(item.expectedEnd + "T00:00:00.000Z"),
    subrogationCode: item.subrogationCode,
    ...(item.subrogationCode === "01" ? { subrogationStartDate: new Date(item.subrogationStart! + "T00:00:00.000Z"), subrogationEndDate: new Date(item.subrogationEnd! + "T00:00:00.000Z"), subrogationIban: "FR7630006000011234567890189", subrogationBic: "AGRIFRPPXXX" } : {}),
    ...(item.recoveryDate ? { recoveryDate: new Date(item.recoveryDate + "T00:00:00.000Z"), recoveryReasonCode: item.recoveryReasonCode } : {}),
    ...(item.accidentDate ? { accidentDate: new Date(item.accidentDate + "T00:00:00.000Z") } : {}),
  }));
  employee.contract.suspensions = mapped.unpaidAbsence.suspensions.map((item) => ({
    reasonCode: item.reasonCode,
    startDate: new Date(item.start + "T00:00:00.000Z"),
    endDate: new Date(item.end + "T00:00:00.000Z"),
  }));
  employee.payroll = {
    baseSalary: snapshot.inputs.pay.monthlyBaseSalary, grossAmount: totals.grossTotal, grossSubject: totals.grossSubject,
    cappedContributionBase: mapped.bases.find((base) => base.code === "02")!.amount,
    unemploymentBase: mapped.unemploymentBase, paidHours: mapped.activityPaidHours,
    unemploymentRemuneration: mapped.remuneration.unemploymentRemuneration,
    restoredSalary: mapped.remuneration.restoredSalary,
    paidLeaveIndemnities: mapped.remuneration.paidLeaveIndemnities.map((item) => ({ type: item.type, amount: item.amount, startDate: new Date(item.start + "T00:00:00.000Z"), endDate: new Date(item.end + "T00:00:00.000Z") })),
    otherRevenues: mapped.remuneration.otherRevenues,
    bonuses: mapped.remuneration.bonuses.map((item) => ({ type: item.type, amount: item.amount, startDate: item.start ? new Date(item.start + "T00:00:00.000Z") : null, endDate: item.end ? new Date(item.end + "T00:00:00.000Z") : null })),
    netBeforeTax: totals.netBeforeTax, netTaxableAmount: employeePas.fiscalNetBeforeExemption ?? totals.netTaxable, netSocialAmount: totals.netSocial,
    withholdingTax: totals.withholdingTax,
    pas: dsnPasFromLockedBulletin({ withholding: employeePas, profile: { rate: employeePas.rate, validFrom: new Date("2026-01-01"), validUntil: null, source: snapshot.inputs.withholding.mode === "PERSONALIZED" ? "DGFIP" : "NON_PERSONNALISE", sourceReference: employeePas.rateIdentifier },
      payrollDepartment: "34", contractType: snapshot.inputs.employee.contract, netTaxableAmount: totals.netTaxable, withholdingAmount: employeePas.amount }).pas,
    overtimeRemunerations: mapped.overtime.remunerations,
    overtimeTaxExemptNetAmount: mapped.overtime.taxExemptNetAmount,
    absenceActivityHours: mapped.activityAbsenceHours,
    subrogatedIjssNetAmount: snapshot.bulletin.lines.filter((line) => line.code === "IJSS_SUBROGATION").reduce((sum, line) => sum + (line.amount ?? 0), 0),
  };
  data.assessedBases = mapped.bases;
  data.contributionBordereau = {
    opsIdentifier: "75366412700077", totalAmount: mapped.liabilities.find((item) => item.opsIdentifier === "75366412700077")!.amount,
    individualContributions: mapped.individual, aggregatedContributions: mapped.aggregates,
  };
  data.payments = [...mapped.liabilities, { opsIdentifier: "DGFIP", amount: totals.withholdingTax }].map((item) => ({ ...item, paymentModeCode: "05", iban: "FR7630006000011234567890189", bic: "AGRIFRPPXXX" }));
  if (complementary) {
    data.complementaryAdhesions = mapped.complementaryAdhesions;
    data.complementaryAffiliations = mapped.complementaryAffiliations;
    for (const payment of data.payments) if (payment.opsIdentifier === "P0983") payment.components = mapped.complementaryPayments.map(({ amount, contractReference, period }) => ({ amount, contractReference, period }));
  }
  data.expectedLiabilities = [...mapped.liabilities, { opsIdentifier: "DGFIP", amount: totals.withholdingTax }];
  return data;
}
