import { identifyDsnAffiliations, normalizeDsnComplementaryAffiliations } from "../../src/lib/payroll/dsn-complementary-affiliations";
import { computePayslip } from "../../src/lib/payroll/bulletin/compute";
import { FULL_TIME_SCHEDULE, type WeeklySchedule } from "../../src/lib/payroll/bulletin/calendar";
import type { PayslipInput } from "../../src/lib/payroll/bulletin/types";
import { mapLockedContributions } from "../../src/lib/payroll/dsn-locked-contributions";
import type { DsnP26CompleteInput } from "../../src/lib/payroll/dsn-p26v01-complete";
import { mappedDsnFixture } from "./dsn-fixture";

export function computedSnapshot(input?: Partial<PayslipInput>) {
  const inputs: PayslipInput = {
    period: { year: 2026, month: 1 },
    organization: { headcount: 4, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE", healthPlan: null, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES" },
    employee: { id: "employee-test", displayName: "Maxime Dupont", contract: "CDI", executive: false, hireDate: "2024-01-01" },
    pay: { monthlyBaseSalary: 2500, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
    withholding: { mode: "PERSONALIZED", rate: 0.075, rateIdentifier: "123456789" },
    ...input,
  };
  return { inputs, bulletin: computePayslip(inputs) };
}

/** Fichier synthétique dont chaque montant financier vient effectivement du moteur. */
export function computedDsnFixture(
  gross = 2500,
  monthlyHours = 151.67,
  complementary = false,
  organizationOverrides?: Partial<PayslipInput["organization"]>,
  executive = false,
  inputOverrides?: Partial<PayslipInput>,
): DsnP26CompleteInput {
  const basePay = { monthlyBaseSalary: gross, contractMonthlyHours: monthlyHours, schedule: [monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, 0, 0] as WeeklySchedule };
  const snapshot = computedSnapshot({ ...inputOverrides, pay: { ...basePay, ...(inputOverrides?.pay ?? {}) } });
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
  const mapped = mapLockedContributions({ snapshot, employeeNir: employee.nir, urssafSiret: "75366412700077", retirementOps: "44832375800038", complementaryAffiliations: affiliations });
  const totals = snapshot.bulletin.totals;
  const employeePas = snapshot.bulletin.withholding;
  data.period = { year: 2026, month: 1, paymentDate: new Date("2026-01-31T00:00:00.000Z") };
  employee.contract.workAccidentRate = mapped.atmpRatePercent;
  employee.contract.conventionalStatusCode = executive ? "04" : "06";
  employee.contract.retirementStatusCode = executive ? "01" : "04";
  employee.contract.contractWorkQuota = snapshot.inputs.pay.contractMonthlyHours;
  employee.contract.workModalityCode = snapshot.inputs.pay.contractMonthlyHours < 151.67 ? "20" : "10";
  employee.contract.suspensions = mapped.absenceActivity.unpaidSuspensions.map((item) => ({
    reasonCode: item.reasonCode,
    startDate: new Date(item.start + "T00:00:00.000Z"),
    endDate: new Date(item.end + "T00:00:00.000Z"),
  }));
  employee.payroll = {
    baseSalary: snapshot.inputs.pay.monthlyBaseSalary, grossAmount: totals.grossTotal, grossSubject: totals.grossSubject,
    cappedContributionBase: mapped.bases.find((base) => base.code === "02")!.amount,
    unemploymentBase: mapped.unemploymentBase, paidHours: mapped.activityPaidHours,
    netBeforeTax: totals.netBeforeTax, netTaxableAmount: totals.netTaxable, netSocialAmount: totals.netSocial,
    withholdingTax: totals.withholdingTax,
    pas: { rateType: "01", ratePercent: employeePas.rate * 100, rateIdentifier: "123456789", amountSubjectToPas: employeePas.base, withholdingAmount: employeePas.amount },
    overtimeRemunerations: mapped.overtime.remunerations,
    overtimeTaxExemptNetAmount: mapped.overtime.taxExemptNetAmount,
    unpaidAbsenceHours: mapped.absenceActivity.hours,
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
