import {
  createPayrollLedgerEntry,
  type PayrollLedgerEntry,
  type PayrollLedgerSide,
} from "./payroll-ledger";
import type { SocialPayrollResult } from "./social-engine";
import type { MinimumSalaryControlSnapshot } from "./minimum-salary-control";

export { persistPayrollLedger } from "./payroll-ledger";

export type PayrollLedgerVariable = {
  code: string;
  label: string;
  amount: number;
  grossDelta: number;
  kind: PayrollLedgerEntry["kind"];
  ruleVersionId: string;
};

export type PayrollLedgerAbsence = {
  absenceId: string;
  absenceType: string;
  label: string;
  grossDelta: number;
  kind: "ADD_TO_GROSS" | "DEDUCT_FROM_GROSS";
  ruleVersionId: string;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function contributionKind(side: "EMPLOYEE" | "EMPLOYER"): PayrollLedgerSide {
  return side === "EMPLOYER" ? "EMPLOYER" : "EMPLOYEE";
}

/**
 * Construit les lignes du bulletin à partir de données déjà résolues.
 *
 * Les éléments de brut ne reçoivent volontairement aucun effet fiscal/social
 * implicite : ces effets doivent être fournis par une future règle versionnée.
 * Les cotisations, elles, reprennent directement les montants du moteur social.
 */
export function buildPayrollLedger(input: {
  baseSalaryAmount: number;
  ruleVersionId: string;
  sourceName: string;
  sourceUrl?: string | null;
  variables: readonly PayrollLedgerVariable[];
  absences: readonly PayrollLedgerAbsence[];
  socialResult: SocialPayrollResult;
  withholdingTax: number;
  withholdingTaxRateProvided: boolean;
  minimumSalaryControl?: MinimumSalaryControlSnapshot;
}): PayrollLedgerEntry[] {
  const entries: PayrollLedgerEntry[] = [];

  entries.push(
    createPayrollLedgerEntry({
      code: "BASE_SALARY",
      label: "Salaire de base",
      category: "BASE_PAY",
      kind: "ADD_TO_GROSS",
      side: "EMPLOYEE",
      amount: roundMoney(Math.abs(input.baseSalaryAmount)),
      grossDelta: roundMoney(input.baseSalaryAmount),
      taxableDelta: 0,
      socialDelta: 0,
      netDelta: 0,
      cashImpact: 0,
      ruleVersionId: input.ruleVersionId,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
    }),
  );

  for (const variable of input.variables) {
    entries.push(
      createPayrollLedgerEntry({
        code: variable.code,
        label: variable.label,
        category: "BONUS_AND_ALLOWANCES",
        kind: variable.kind,
        side: "EMPLOYEE",
        amount: Math.abs(variable.amount),
        grossDelta: variable.grossDelta,
        taxableDelta: 0,
        socialDelta: 0,
        netDelta: 0,
        cashImpact: 0,
        ruleVersionId: variable.ruleVersionId,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
      }),
    );
  }

  for (const absence of input.absences) {
    entries.push(
      createPayrollLedgerEntry({
        code: absence.absenceId,
        label: absence.label,
        category: "PAID_LEAVE_AND_ABSENCE",
        kind: absence.kind,
        side: "EMPLOYEE",
        amount: Math.abs(absence.grossDelta),
        grossDelta: absence.grossDelta,
        taxableDelta: 0,
        socialDelta: 0,
        netDelta: 0,
        cashImpact: 0,
        ruleVersionId: absence.ruleVersionId,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        metadata: { absenceId: absence.absenceId, absenceType: absence.absenceType },
      }),
    );
  }

  if (input.minimumSalaryControl?.status === "APPLICABLE") {
    const minimumRuleVersionId =
      input.minimumSalaryControl.source === "COLLECTIVE_AGREEMENT"
        ? input.minimumSalaryControl.collectiveRuleVersionId
        : input.minimumSalaryControl.smicRuleVersionId;

    if (minimumRuleVersionId) {
      entries.push(
        createPayrollLedgerEntry({
          code: "MINIMUM_SALARY_CONTROL",
          label: "Contrôle du salaire minimum applicable",
          category: "SALARY_COMPLIANCE",
          kind: "INFORMATIONAL",
          side: "NEUTRAL",
          amount: roundMoney((input.minimumSalaryControl.appliedMonthlyMinimumCents ?? 0) / 100),
          grossDelta: 0,
          taxableDelta: 0,
          socialDelta: 0,
          netDelta: 0,
          cashImpact: 0,
          ruleVersionId: minimumRuleVersionId,
          sourceName:
            input.minimumSalaryControl.source === "COLLECTIVE_AGREEMENT"
              ? "Convention collective"
              : "SMIC",
          sourceUrl: null,
          metadata: {
            authoritativeControl: true,
            source: input.minimumSalaryControl.source,
            appliedMonthlyMinimumCents: input.minimumSalaryControl.appliedMonthlyMinimumCents,
            smicMonthlyMinimumCents: input.minimumSalaryControl.smicMonthlyMinimumCents,
            collectiveMonthlyMinimumCents:
              input.minimumSalaryControl.collectiveMonthlyMinimumCents,
            compliant: input.minimumSalaryControl.compliant,
            differenceCents: input.minimumSalaryControl.differenceCents,
            explanation: input.minimumSalaryControl.explanation,
          },
        }),
      );
    }
  }

  for (const contribution of input.socialResult.contributionDetails) {
    const isEmployee = contribution.side === "EMPLOYEE";
    const amount = Math.abs(contribution.amount);

    entries.push(
      createPayrollLedgerEntry({
        code: contribution.code,
        label: contribution.label,
        category: "SOCIAL_PROTECTION",
        kind: isEmployee ? "DEDUCT_FROM_NET" : "INFORMATIONAL",
        side: contributionKind(contribution.side),
        amount,
        grossDelta: 0,
        taxableDelta: 0,
        socialDelta: roundMoney(isEmployee ? -amount : amount),
        netDelta: roundMoney(isEmployee ? -amount : 0),
        cashImpact: roundMoney(isEmployee ? 0 : amount),
        ruleVersionId: input.ruleVersionId,
        sourceName: "Urssaf / Mon-entreprise",
        sourceUrl: "https://mon-entreprise.urssaf.fr/documentation/salari%C3%A9/cotisations",
        sourceReference: contribution.sourceRule,
        metadata: {
          socialEngine: true,
          modelVersion: input.socialResult.modelVersion,
        },
      }),
    );
  }

  entries.push(
    createPayrollLedgerEntry({
      code: "NET_BEFORE_TAX_TOTAL",
      label: "Net à payer avant impôt",
      category: "TAX_AND_WITHHOLDING",
      kind: "INFORMATIONAL",
      side: "NEUTRAL",
      amount: input.socialResult.netBeforeTax,
      grossDelta: 0,
      taxableDelta: 0,
      socialDelta: 0,
      netDelta: 0,
      cashImpact: 0,
      ruleVersionId: input.ruleVersionId,
      sourceName: "Urssaf / Mon-entreprise",
      sourceUrl: "https://mon-entreprise.urssaf.fr/documentation/salari%C3%A9/cotisations",
      sourceReference: "salarié . rémunération . net . à payer avant impôt",
      metadata: {
        authoritativeAmount: true,
        value: input.socialResult.netBeforeTax,
      },
    }),
  );

  entries.push(
    createPayrollLedgerEntry({
      code: "NET_SOCIAL_TOTAL",
      label: "Montant net social",
      category: "SOCIAL_PROTECTION",
      kind: "INFORMATIONAL",
      side: "NEUTRAL",
      amount: input.socialResult.netSocialAmount,
      grossDelta: 0,
      taxableDelta: 0,
      socialDelta: 0,
      netDelta: 0,
      cashImpact: 0,
      ruleVersionId: input.ruleVersionId,
      sourceName: "Urssaf / Mon-entreprise",
      sourceUrl: "https://mon-entreprise.urssaf.fr/documentation/salari%C3%A9/cotisations",
      sourceReference: "salarié . rémunération . montant net social",
      metadata: {
        authoritativeAmount: true,
        value: input.socialResult.netSocialAmount,
      },
    }),
  );

  entries.push(
    createPayrollLedgerEntry({
      code: "PAS",
      label: "Prélèvement à la source",
      category: "TAX_AND_WITHHOLDING",
      kind: input.withholdingTaxRateProvided ? "DEDUCT_FROM_NET" : "INFORMATIONAL",
      side: "EMPLOYEE",
      amount: Math.abs(input.withholdingTax),
      grossDelta: 0,
      taxableDelta: 0,
      socialDelta: 0,
      netDelta: input.withholdingTaxRateProvided ? -Math.abs(input.withholdingTax) : 0,
      cashImpact: 0,
      ruleVersionId: input.ruleVersionId,
      sourceName: "DGFiP",
      sourceUrl: "https://www.impots.gouv.fr/particulier/prelevement-la-source",
      metadata: {
        rateProvided: input.withholdingTaxRateProvided,
        rateSource: input.withholdingTaxRateProvided ? "validated_rule" : "not_provided",
      },
    }),
  );

  return entries;
}
