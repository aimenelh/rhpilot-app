import type {
  PayrollCalculationInput,
  PayrollCalculationResult,
  PayrollContributionResult,
} from "./domain";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Moteur volontairement déterministe.
 *
 * Les taux ne sont pas définis dans ce fichier : ils viennent d'un
 * PayrollRuleSet versionné. L'IA ne participe jamais au calcul.
 */
export function calculatePayroll(
  input: PayrollCalculationInput,
): PayrollCalculationResult {
  if (!Number.isFinite(input.grossAmount) || input.grossAmount < 0) {
    throw new Error("Le brut doit être un montant positif ou nul.");
  }

  if (!input.ruleSet.version.trim()) {
    throw new Error("Une version de règles est obligatoire pour calculer une paie.");
  }

  const withholdingTaxRate = input.withholdingTaxRate ?? 0;
  if (!Number.isFinite(withholdingTaxRate) || withholdingTaxRate < 0) {
    throw new Error("Le taux de prélèvement doit être positif ou nul.");
  }

  const contributions: PayrollContributionResult[] = input.ruleSet.rules.map((rule) => {
    if (rule.base !== "GROSS") {
      throw new Error(`Base de calcul non supportée : ${rule.base}`);
    }

    if (!Number.isFinite(rule.rate) || rule.rate < 0) {
      throw new Error(`Taux invalide pour la règle ${rule.code}.`);
    }

    return {
      code: rule.code,
      label: rule.label,
      side: rule.side,
      baseAmount: roundMoney(input.grossAmount),
      rate: rule.rate,
      amount: roundMoney(input.grossAmount * rule.rate),
      ruleVersionId: rule.ruleVersionId,
    };
  });

  const employeeContributions = roundMoney(
    contributions
      .filter((contribution) => contribution.side === "EMPLOYEE")
      .reduce((total, contribution) => total + contribution.amount, 0),
  );

  const employerContributions = roundMoney(
    contributions
      .filter((contribution) => contribution.side === "EMPLOYER")
      .reduce((total, contribution) => total + contribution.amount, 0),
  );

  const netBeforeTax = roundMoney(input.grossAmount - employeeContributions);
  const withholdingTax = roundMoney(netBeforeTax * withholdingTaxRate);
  const netPaid = roundMoney(netBeforeTax - withholdingTax);

  return {
    ruleSetVersion: input.ruleSet.version,
    grossAmount: roundMoney(input.grossAmount),
    employeeContributions,
    employerContributions,
    netBeforeTax,
    withholdingTax,
    netPaid,
    contributions,
    variables: input.variables ?? [],
  };
}
