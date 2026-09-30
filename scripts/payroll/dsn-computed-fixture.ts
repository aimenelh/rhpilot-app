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
export function computedDsnFixture(gross = 2500, monthlyHours = 151.67): DsnP26CompleteInput {
  const snapshot = computedSnapshot({ pay: { monthlyBaseSalary: gross, contractMonthlyHours: monthlyHours, schedule: [monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, monthlyHours * 12 / 52 / 5, 0, 0] as WeeklySchedule } });
  const data = mappedDsnFixture();
  const employee = data.employees[0];
  const mapped = mapLockedContributions({ snapshot, employeeNir: employee.nir, urssafSiret: "75366412700077", retirementOps: "44832375800038" });
  const totals = snapshot.bulletin.totals;
  const employeePas = snapshot.bulletin.withholding;
  data.period = { year: 2026, month: 1, paymentDate: new Date("2026-01-31T00:00:00.000Z") };
  employee.contract.workAccidentRate = mapped.atmpRatePercent;
  employee.contract.contractWorkQuota = monthlyHours;
  employee.contract.workModalityCode = monthlyHours < 151.67 ? "20" : "10";
  employee.payroll = {
    baseSalary: gross, grossAmount: totals.grossTotal, grossSubject: totals.grossSubject,
    cappedContributionBase: mapped.bases.find((base) => base.code === "02")!.amount,
    unemploymentBase: mapped.unemploymentBase, paidHours: mapped.hoursPaid,
    netBeforeTax: totals.netBeforeTax, netTaxableAmount: totals.netTaxable, netSocialAmount: totals.netSocial,
    withholdingTax: totals.withholdingTax,
    pas: { rateType: "01", ratePercent: employeePas.rate * 100, rateIdentifier: "123456789", amountSubjectToPas: employeePas.base, withholdingAmount: employeePas.amount },
  };
  data.assessedBases = mapped.bases;
  data.contributionBordereau = {
    opsIdentifier: "75366412700077", totalAmount: mapped.liabilities.find((item) => item.opsIdentifier === "75366412700077")!.amount,
    individualContributions: mapped.individual, aggregatedContributions: mapped.aggregates,
  };
  data.payments = [...mapped.liabilities, { opsIdentifier: "DGFIP", amount: totals.withholdingTax }].map((item) => ({ ...item, paymentModeCode: "05", iban: "FR7630006000011234567890189", bic: "AGRIFRPPXXX" }));
  return data;
}
