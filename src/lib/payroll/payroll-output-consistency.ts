export type PayrollOutputTotals = {
  grossAmount: number;
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;
  netTaxableAmount: number;
  netSocialAmount: number;
  withholdingTax: number;
  netPaid: number;
  employerCost?: number;
};

function assertMoney(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Contrôle paie bloquant : ${label} est absent ou invalide.`);
  }
}

function rounded(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Contrôles de sortie indépendants du moteur de calcul. Ils évitent qu'un
 * snapshot, un bulletin ou une DSN soient produits à partir de totaux qui ne
 * se réconcilient plus entre eux après une évolution du moteur.
 */
export function assertPayrollOutputConsistency(input: PayrollOutputTotals): PayrollOutputTotals {
  assertMoney(input.grossAmount, "le salaire brut");
  assertMoney(input.employeeContributions, "les cotisations salariales");
  assertMoney(input.employerContributions, "les cotisations employeur");
  assertMoney(input.netBeforeTax, "le net avant impôt");
  assertMoney(input.netTaxableAmount, "le net imposable");
  assertMoney(input.netSocialAmount, "le montant net social");
  assertMoney(input.withholdingTax, "le prélèvement à la source");
  assertMoney(input.netPaid, "le net payé");
  if (input.employerCost !== undefined) assertMoney(input.employerCost, "le coût employeur");

  // Contrôle métier prioritaire : un PAS supérieur au net avant impôt est
  // impossible. On le signale avant le contrôle de réconciliation du net payé
  // afin de remonter la cause, et non sa conséquence arithmétique.
  if (input.withholdingTax > input.netBeforeTax + 0.01) {
    throw new Error("Contrôle paie bloquant : le prélèvement à la source dépasse le net avant impôt.");
  }

  const expectedNetPaid = rounded(input.netBeforeTax - input.withholdingTax);
  if (Math.abs(expectedNetPaid - rounded(input.netPaid)) > 0.01) {
    throw new Error(
      `Contrôle paie bloquant : le net payé (${input.netPaid.toFixed(2)} €) ne se réconcilie pas avec le net avant impôt et le PAS (${expectedNetPaid.toFixed(2)} € attendu).`,
    );
  }

  if (input.employerCost !== undefined && input.employerCost + 0.01 < input.grossAmount) {
    throw new Error("Contrôle paie bloquant : le coût employeur est inférieur au brut.");
  }

  return {
    ...input,
    netPaid: rounded(input.netPaid),
    netBeforeTax: rounded(input.netBeforeTax),
    netTaxableAmount: rounded(input.netTaxableAmount),
    netSocialAmount: rounded(input.netSocialAmount),
    withholdingTax: rounded(input.withholdingTax),
  };
}
