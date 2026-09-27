-- Saisie de la paie : salariés dont la saisie du mois est vérifiée.
CREATE TABLE IF NOT EXISTS "payroll_entry_reviews" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "payrollPeriodId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_entry_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_entry_reviews_period_fk" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payroll_entry_reviews_employee_fk" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_entry_reviews_unique" ON "payroll_entry_reviews" ("organizationId", "payrollPeriodId", "employeeId");
