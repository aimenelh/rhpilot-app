import { describe, expect, it } from "vitest";
import {
  createPayrollLedgerEntry,
  resolvedGrossLedgerEntry,
  resolvedNonGrossLedgerEntry,
  summarizePayrollLedger,
} from "./payroll-ledger";

describe("payroll-ledger", () => {
  it("keeps an approved gross line explicit", () => {
    const entry = resolvedGrossLedgerEntry({
      code: "OBJECTIVE_BONUS",
      label: "Prime sur objectifs",
      category: "BONUS_AND_ALLOWANCES",
      kind: "ADD_TO_GROSS",
      amount: 250,
      taxableDelta: 250,
      socialDelta: 250,
      ruleVersionId: "rule-1",
      sourceName: "Test source",
    });

    expect(entry.grossDelta).toBe(250);
    expect(entry.netDelta).toBe(0);
    expect(entry.cashImpact).toBe(0);
  });

  it("does not turn a reimbursement into gross", () => {
    const entry = resolvedNonGrossLedgerEntry({
      code: "EXPENSE_KILOMETRIC",
      label: "Indemnités kilométriques",
      category: "PROFESSIONAL_EXPENSES",
      kind: "REIMBURSEMENT",
      amount: 180,
      taxableDelta: 0,
      socialDelta: 0,
      netDelta: 180,
      cashImpact: 180,
      ruleVersionId: "rule-2",
      sourceName: "Test source",
    });

    expect(entry.grossDelta).toBe(0);
    expect(entry.netDelta).toBe(180);
    expect(entry.cashImpact).toBe(180);
  });

  it("rejects a ledger line without a validated rule", () => {
    expect(() =>
      createPayrollLedgerEntry({
        code: "BENEFIT_VEHICLE",
        label: "Avantage en nature véhicule",
        category: "BENEFITS_IN_KIND",
        kind: "NON_CASH",
        side: "EMPLOYEE",
        amount: 300,
        grossDelta: 0,
        taxableDelta: 300,
        socialDelta: 300,
        netDelta: 0,
        cashImpact: 0,
      }),
    ).toThrow("version de règle validée");
  });

  it("summarizes explicit ledger effects without inventing them", () => {
    const totals = summarizePayrollLedger([
      resolvedGrossLedgerEntry({
        code: "BASE_SALARY_ADJUSTMENT",
        label: "Salaire",
        category: "BASE_PAY",
        kind: "ADD_TO_GROSS",
        amount: 2000,
        taxableDelta: 2000,
        socialDelta: 2000,
        ruleVersionId: "rule-3",
        sourceName: "Test source",
      }),
      resolvedNonGrossLedgerEntry({
        code: "EXPENSE_MEAL",
        label: "Frais de repas",
        category: "PROFESSIONAL_EXPENSES",
        kind: "REIMBURSEMENT",
        amount: 50,
        taxableDelta: 0,
        socialDelta: 0,
        netDelta: 50,
        cashImpact: 50,
        ruleVersionId: "rule-4",
        sourceName: "Test source",
      }),
    ]);

    expect(totals.gross).toBe(2000);
    expect(totals.netBeforeTax).toBe(50);
    expect(totals.cashBeforeTax).toBe(50);
  });
});
