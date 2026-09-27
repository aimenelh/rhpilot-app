/**
 * Lignes de ledger et détail des cotisations dérivés d'un bulletin calculé.
 * Aucun montant n'est recalculé : tout vient du résultat du moteur.
 */
import { createPayrollLedgerEntry, type PayrollLedgerEntry } from "../payroll-ledger";
import { round2 } from "./money";
import type { PayslipLine, PayslipResult } from "./types";

const CATEGORY_BY_SECTION: Record<PayslipLine["section"], string> = {
  GROSS: "BASE_PAY",
  SANTE: "SOCIAL_PROTECTION",
  ACCIDENTS_TRAVAIL: "SOCIAL_PROTECTION",
  RETRAITE: "SOCIAL_PROTECTION",
  FAMILLE: "SOCIAL_PROTECTION",
  CHOMAGE: "SOCIAL_PROTECTION",
  AUTRES_EMPLOYEUR: "SOCIAL_PROTECTION",
  CSG_CRDS: "SOCIAL_PROTECTION",
  EXONERATIONS: "SOCIAL_PROTECTION",
  NET_ITEMS: "PROFESSIONAL_EXPENSES",
};

export type BulletinContributionDetail = {
  code: string;
  label: string;
  sourceRule: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  baseAmount: number | null;
  rate: number | null;
};

export function isContributionLine(line: PayslipLine): boolean {
  return line.section !== "GROSS" && line.section !== "NET_ITEMS";
}

/**
 * Détail des cotisations au format historique (une ligne par part), utilisé
 * par l'écran de contrôle et la table payroll_contributions.
 */
export function contributionDetailsFromBulletin(result: PayslipResult): BulletinContributionDetail[] {
  const details: BulletinContributionDetail[] = [];
  for (const line of result.lines) {
    if (!isContributionLine(line)) continue;
    const base = line.base ?? null;
    if ((line.amount ?? 0) !== 0) details.push({ code: line.code, label: line.label, sourceRule: line.source, side: "EMPLOYEE", amount: round2(line.amount ?? 0), baseAmount: base, rate: line.rate ?? null });
    if ((line.employerAmount ?? 0) !== 0) details.push({ code: line.code, label: line.label, sourceRule: line.source, side: "EMPLOYER", amount: round2(line.employerAmount ?? 0), baseAmount: base, rate: line.employerRate ?? null });
  }
  return details;
}

export function buildBulletinLedger(result: PayslipResult, ruleVersionId: string): PayrollLedgerEntry[] {
  const entries: PayrollLedgerEntry[] = [];
  const source = { ruleVersionId, sourceName: `Moteur de bulletin RH Pilot ${result.engineVersion}` };
  for (const line of result.lines) {
    if (line.section === "GROSS") {
      const amount = line.amount ?? 0;
      entries.push(createPayrollLedgerEntry({
        code: line.code, label: line.label, category: line.code === "SEVERANCE" || line.code.endsWith("_COMPENSATION") || line.code === "CDD_END_ALLOWANCE" ? "TERMINATION" : CATEGORY_BY_SECTION.GROSS,
        kind: amount >= 0 ? "ADD_TO_GROSS" : "DEDUCT_FROM_GROSS", side: "EMPLOYEE", amount: Math.abs(amount), grossDelta: amount,
        taxableDelta: 0, socialDelta: 0, netDelta: 0, cashImpact: 0, sourceReference: line.source, ...source,
        metadata: line.detail ? JSON.parse(JSON.stringify(line.detail)) : undefined,
      }));
    } else if (line.section === "NET_ITEMS") {
      const amount = line.amount ?? 0;
      entries.push(createPayrollLedgerEntry({
        code: line.code, label: line.label, category: CATEGORY_BY_SECTION.NET_ITEMS, kind: amount >= 0 ? "REIMBURSEMENT" : "DEDUCT_FROM_NET", side: "EMPLOYEE",
        amount: Math.abs(amount), grossDelta: 0, taxableDelta: 0, socialDelta: 0, netDelta: amount, cashImpact: amount, sourceReference: line.source, ...source,
      }));
    } else {
      const employee = line.amount ?? 0;
      const employer = line.employerAmount ?? 0;
      if (employee !== 0) entries.push(createPayrollLedgerEntry({
        code: line.code, label: line.label, category: CATEGORY_BY_SECTION[line.section], kind: "DEDUCT_FROM_NET", side: "EMPLOYEE",
        amount: Math.abs(employee), grossDelta: 0, taxableDelta: 0, socialDelta: -employee, netDelta: -employee, cashImpact: 0, sourceReference: line.source, ...source,
        metadata: { base: line.base ?? null, rate: line.rate ?? null, section: line.section },
      }));
      if (employer !== 0) entries.push(createPayrollLedgerEntry({
        code: line.code, label: line.label, category: CATEGORY_BY_SECTION[line.section], kind: "INFORMATIONAL", side: "EMPLOYER",
        amount: Math.abs(employer), grossDelta: 0, taxableDelta: 0, socialDelta: employer, netDelta: 0, cashImpact: employer, sourceReference: line.source, ...source,
        metadata: { base: line.base ?? null, rate: line.employerRate ?? null, section: line.section },
      }));
    }
  }
  const totals = result.totals;
  const info = (code: string, label: string, amount: number, category = "TAX_AND_WITHHOLDING") => createPayrollLedgerEntry({ code, label, category, kind: "INFORMATIONAL", side: "NEUTRAL", amount, grossDelta: 0, taxableDelta: 0, socialDelta: 0, netDelta: 0, cashImpact: 0, ...source, metadata: { value: amount } });
  entries.push(info("NET_BEFORE_TAX_TOTAL", "Net à payer avant impôt sur le revenu", totals.netBeforeTax));
  entries.push(info("NET_TAXABLE_TOTAL", "Net imposable", totals.netTaxable));
  entries.push(info("NET_SOCIAL_TOTAL", "Montant net social", totals.netSocial, "SOCIAL_PROTECTION"));
  entries.push(createPayrollLedgerEntry({
    code: "PAS", label: "Prélèvement à la source", category: "TAX_AND_WITHHOLDING", kind: "DEDUCT_FROM_NET", side: "EMPLOYEE", amount: totals.withholdingTax,
    grossDelta: 0, taxableDelta: 0, socialDelta: 0, netDelta: -totals.withholdingTax, cashImpact: -totals.withholdingTax, ...source,
    sourceName: "DGFiP", sourceReference: result.withholding.source, metadata: { mode: result.withholding.mode, rate: result.withholding.rate, base: result.withholding.base },
  }));
  return entries;
}
