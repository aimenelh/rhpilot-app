/**
 * Ledger métier du bulletin.
 *
 * Cette couche ne contient aucun taux légal ni plafond : elle structure les
 * effets des éléments déjà résolus par les règles de paie versionnées.
 * Elle sépare explicitement brut, fiscal, social et trésorerie afin que les
 * remboursements et avantages non monétaires ne soient jamais confondus avec
 * du salaire versé.
 */

import type { Prisma } from "@prisma/client";

export type PayrollLedgerKind =
  | "ADD_TO_GROSS"
  | "DEDUCT_FROM_GROSS"
  | "DEDUCT_FROM_NET"
  | "REIMBURSEMENT"
  | "NON_CASH"
  | "INFORMATIONAL";

export type PayrollLedgerSide = "EMPLOYEE" | "EMPLOYER" | "NEUTRAL";

export type PayrollLedgerEntry = {
  code: string;
  label: string;
  category: string;
  kind: PayrollLedgerKind;
  side: PayrollLedgerSide;
  amount: number;
  grossDelta: number;
  taxableDelta: number;
  socialDelta: number;
  netDelta: number;
  cashImpact: number;
  ruleVersionId?: string;
  sourceName?: string;
  sourceUrl?: string | null;
  sourceReference?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export type PayrollLedgerTotals = {
  gross: number;
  taxable: number;
  social: number;
  netBeforeTax: number;
  cashBeforeTax: number;
  employerCostAdjustments: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertFiniteMoney(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`Le montant ${label} est invalide.`);
}

/**
 * Fabrique une ligne de ledger à partir d'effets explicites.
 * Aucun effet n'est déduit de la catégorie ou du libellé.
 */
export function createPayrollLedgerEntry(input: PayrollLedgerEntry): PayrollLedgerEntry {
  if (!input.code.trim()) throw new Error("Le code de ligne de bulletin est obligatoire.");
  if (!input.label.trim()) throw new Error(`Le libellé de la ligne ${input.code} est obligatoire.`);
  if (!input.category.trim()) throw new Error(`La catégorie de la ligne ${input.code} est obligatoire.`);
  if (!input.ruleVersionId?.trim()) throw new Error(`La ligne ${input.code} doit être rattachée à une version de règle validée.`);

  for (const [label, value] of Object.entries({
    amount: input.amount,
    grossDelta: input.grossDelta,
    taxableDelta: input.taxableDelta,
    socialDelta: input.socialDelta,
    netDelta: input.netDelta,
    cashImpact: input.cashImpact,
  })) assertFiniteMoney(value, label);

  return {
    ...input,
    amount: roundMoney(input.amount),
    grossDelta: roundMoney(input.grossDelta),
    taxableDelta: roundMoney(input.taxableDelta),
    socialDelta: roundMoney(input.socialDelta),
    netDelta: roundMoney(input.netDelta),
    cashImpact: roundMoney(input.cashImpact),
  };
}

/**
 * Agrège les effets des lignes. Le moteur social reste la source de vérité
 * pour les cotisations ; le ledger ne réécrit donc jamais ses montants.
 */
export function summarizePayrollLedger(entries: readonly PayrollLedgerEntry[]): PayrollLedgerTotals {
  const totals = entries.reduce(
    (acc, entry) => ({
      gross: acc.gross + entry.grossDelta,
      taxable: acc.taxable + entry.taxableDelta,
      social: acc.social + entry.socialDelta,
      netBeforeTax: acc.netBeforeTax + entry.netDelta,
      cashBeforeTax: acc.cashBeforeTax + entry.cashImpact,
      employerCostAdjustments:
        acc.employerCostAdjustments +
        (entry.side === "EMPLOYER" ? Math.max(0, entry.cashImpact) : 0),
    }),
    { gross: 0, taxable: 0, social: 0, netBeforeTax: 0, cashBeforeTax: 0, employerCostAdjustments: 0 },
  );

  return {
    gross: roundMoney(totals.gross),
    taxable: roundMoney(totals.taxable),
    social: roundMoney(totals.social),
    netBeforeTax: roundMoney(totals.netBeforeTax),
    cashBeforeTax: roundMoney(totals.cashBeforeTax),
    employerCostAdjustments: roundMoney(totals.employerCostAdjustments),
  };
}

/**
 * Construit les effets standards d'une ligne de brut ou de retenue brute.
 * Les effets fiscal/social doivent toujours être fournis par la règle résolue.
 */
export function resolvedGrossLedgerEntry(input: {
  code: string;
  label: string;
  category: string;
  kind: Extract<PayrollLedgerKind, "ADD_TO_GROSS" | "DEDUCT_FROM_GROSS">;
  amount: number;
  taxableDelta: number;
  socialDelta: number;
  ruleVersionId: string;
  sourceName: string;
  sourceUrl?: string | null;
}): PayrollLedgerEntry {
  const sign = input.kind === "ADD_TO_GROSS" ? 1 : -1;
  return createPayrollLedgerEntry({
    code: input.code,
    label: input.label,
    category: input.category,
    kind: input.kind,
    side: "EMPLOYEE",
    amount: Math.abs(input.amount),
    grossDelta: roundMoney(sign * Math.abs(input.amount)),
    taxableDelta: roundMoney(input.taxableDelta),
    socialDelta: roundMoney(input.socialDelta),
    netDelta: 0,
    cashImpact: 0,
    ruleVersionId: input.ruleVersionId,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
  });
}

/**
 * Construit une ligne de remboursement ou d'avantage non monétaire.
 * Par défaut, aucun impact de brut ou de trésorerie n'est supposé : la règle
 * résolue doit fournir explicitement les effets éventuels.
 */
export function resolvedNonGrossLedgerEntry(input: {
  code: string;
  label: string;
  category: string;
  kind: Extract<PayrollLedgerKind, "DEDUCT_FROM_NET" | "REIMBURSEMENT" | "NON_CASH" | "INFORMATIONAL">;
  amount: number;
  taxableDelta: number;
  socialDelta: number;
  netDelta: number;
  cashImpact: number;
  ruleVersionId: string;
  sourceName: string;
  sourceUrl?: string | null;
}): PayrollLedgerEntry {
  return createPayrollLedgerEntry({
    code: input.code,
    label: input.label,
    category: input.category,
    kind: input.kind,
    side: "EMPLOYEE",
    amount: Math.abs(input.amount),
    grossDelta: 0,
    taxableDelta: input.taxableDelta,
    socialDelta: input.socialDelta,
    netDelta: input.netDelta,
    cashImpact: input.cashImpact,
    ruleVersionId: input.ruleVersionId,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
  });
}

/**
 * Persiste les lignes dans la transaction de calcul via SQL brut afin de ne
 * pas dépendre d'un client Prisma régénéré avant le prochain déploiement.
 */
export async function persistPayrollLedger(
  tx: Prisma.TransactionClient,
  calculationId: string,
  entries: readonly PayrollLedgerEntry[],
): Promise<void> {
  const prepared = entries.map(createPayrollLedgerEntry);

  await tx.$executeRaw`
    DELETE FROM "payroll_ledger_entries"
    WHERE "calculation_id" = ${calculationId}
  `;

  for (const [index, entry] of prepared.entries()) {
    await tx.$executeRaw`
      INSERT INTO "payroll_ledger_entries" (
        "id", "calculation_id", "line_order", "code", "label", "category",
        "kind", "amount", "gross_delta", "taxable_delta", "social_delta",
        "net_delta", "cash_delta", "rule_version_id", "source_name",
        "source_url", "source_reference", "metadata"
      ) VALUES (
        ${crypto.randomUUID()}, ${calculationId}, ${index + 1}, ${entry.code},
        ${entry.label}, ${entry.category}, ${entry.kind}, ${entry.amount},
        ${entry.grossDelta}, ${entry.taxableDelta}, ${entry.socialDelta},
        ${entry.netDelta}, ${entry.cashImpact}, ${entry.ruleVersionId ?? null},
        ${entry.sourceName ?? null}, ${entry.sourceUrl ?? null},
        ${entry.sourceReference ?? null},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb
      )
    `;
  }
}
