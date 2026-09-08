-- RH Pilot — Ledger de bulletin
--
-- Cette migration remplace la première table de ledger expérimentale créée
-- par 20260908220000 par la structure finale, rattachée au calcul de paie.
-- Aucun taux légal ou calcul réglementaire n'est codé ici.

DROP TABLE IF EXISTS "payroll_ledger_entries" CASCADE;

CREATE TABLE "payroll_ledger_entries" (
  "id" TEXT NOT NULL,
  "calculation_id" TEXT NOT NULL,
  "line_order" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "side" TEXT NOT NULL DEFAULT 'EMPLOYEE',
  "amount" DECIMAL(12,2) NOT NULL,
  "gross_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxable_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "social_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cash_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "rule_version_id" TEXT,
  "source_name" TEXT,
  "source_url" TEXT,
  "source_reference" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_ledger_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_ledger_entries_calculation_id_fkey"
    FOREIGN KEY ("calculation_id") REFERENCES "payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payroll_ledger_entries_kind_check"
    CHECK ("kind" IN ('ADD_TO_GROSS','DEDUCT_FROM_GROSS','DEDUCT_FROM_NET','REIMBURSEMENT','NON_CASH','INFORMATIONAL')),
  CONSTRAINT "payroll_ledger_entries_side_check"
    CHECK ("side" IN ('EMPLOYEE','EMPLOYER','NEUTRAL'))
);

CREATE INDEX "payroll_ledger_entries_calculation_id_line_order_idx"
  ON "payroll_ledger_entries"("calculation_id", "line_order");

CREATE INDEX "payroll_ledger_entries_rule_version_id_idx"
  ON "payroll_ledger_entries"("rule_version_id");
