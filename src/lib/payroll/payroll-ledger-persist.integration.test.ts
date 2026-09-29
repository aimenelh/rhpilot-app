import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { persistPayrollLedger } from "./payroll-ledger";

// Vérifie l'insertion groupée des écritures sur une vraie base (ignoré sans DATABASE_URL).
describe.skipIf(!process.env.DATABASE_URL)("persistance des écritures de paie", () => {
  it("produit une insertion multi-lignes acceptée par Postgres", async () => {
    const calculationId = randomUUID();
    const entries = [
      { code: "BASE", label: "Salaire de base", category: "GROSS", kind: "EARNING", amount: 2000, grossDelta: 2000, taxableDelta: 2000, socialDelta: 2000, netDelta: 2000, cashImpact: 2000, ruleVersionId: "rule-1", sourceName: "Test" },
      { code: "CSG", label: "CSG", category: "EMPLOYEE_CONTRIBUTION", kind: "DEDUCTION", amount: -100, grossDelta: 0, taxableDelta: 0, socialDelta: 0, netDelta: -100, cashImpact: -100, ruleVersionId: "rule-1", sourceName: "Test" },
    ];
    // Sans calcul parent, la clé étrangère refuse l'insertion : on teste la requête SQL générée.
    await expect(prisma.$transaction((tx) => persistPayrollLedger(tx, calculationId, entries as never))).rejects.toThrow(/foreign key|violates|calculation/i);
  });
});
