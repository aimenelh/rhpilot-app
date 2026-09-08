CREATE TABLE "payroll_ledger_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "calculationId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "grossDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "socialDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashImpact" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ruleVersionId" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payroll_ledger_entries_calculationId_idx" ON "payroll_ledger_entries"("calculationId");
CREATE INDEX "payroll_ledger_entries_employee_period_idx" ON "payroll_ledger_entries"("organizationId", "payrollPeriodId", "employeeId");
CREATE INDEX "payroll_ledger_entries_code_idx" ON "payroll_ledger_entries"("code");

ALTER TABLE "payroll_ledger_entries" ADD CONSTRAINT "payroll_ledger_entries_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "payroll_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
