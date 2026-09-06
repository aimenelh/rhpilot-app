export const PAYROLL_PERIOD_STATUSES = [
  "DRAFT",
  "CALCULATED",
  "REVIEW",
  "VALIDATED",
  "LOCKED",
] as const;

export type PayrollPeriodStatus = (typeof PAYROLL_PERIOD_STATUSES)[number];

export const PAY_FREQUENCIES = ["MONTHLY"] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export type PayrollVariableUnit = "EUR" | "DAYS" | "HOURS" | "PERCENT";
export type PayrollVariableSource = "MANUAL" | "IMPORT" | "SYSTEM";

export interface PayrollProfileInput {
  employeeId: string;
  effectiveFrom: Date;
  baseSalaryCents?: number;
  monthlyHours?: number;
  collectiveAgreementId?: string;
}

export interface PayrollVariableInput {
  code: string;
  label: string;
  amount: number;
  unit: PayrollVariableUnit;
  source: PayrollVariableSource;
}

export interface PayrollContributionRule {
  code: string;
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  rate: number;
  base: "GROSS";
  ruleVersionId: string;
}

export interface PayrollRuleSet {
  version: string;
  rules: PayrollContributionRule[];
}

export interface PayrollCalculationInput {
  grossAmount: number;
  variables?: PayrollVariableInput[];
  ruleSet: PayrollRuleSet;
  withholdingTaxRate?: number;
}

export interface PayrollContributionResult {
  code: string;
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  baseAmount: number;
  rate: number;
  amount: number;
  ruleVersionId: string;
}

export interface PayrollCalculationResult {
  ruleSetVersion: string;
  grossAmount: number;
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;
  withholdingTax: number;
  netPaid: number;
  contributions: PayrollContributionResult[];
  variables: PayrollVariableInput[];
}

export function assertPayrollPeriodStatus(status: string): asserts status is PayrollPeriodStatus {
  if (!PAYROLL_PERIOD_STATUSES.includes(status as PayrollPeriodStatus)) {
    throw new Error(`Statut de période de paie invalide : ${status}`);
  }
}

export function assertPayrollPeriodMutable(status: PayrollPeriodStatus): void {
  if (status === "LOCKED") {
    throw new Error("Une période de paie verrouillée ne peut plus être modifiée.");
  }
}
