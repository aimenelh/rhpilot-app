-- Additive payroll metadata only. Existing rows remain valid because every new field is nullable.
ALTER TABLE "organizations"
  ADD COLUMN "payrollAddress" TEXT,
  ADD COLUMN "payrollPostalCode" TEXT,
  ADD COLUMN "payrollCity" TEXT,
  ADD COLUMN "payrollNafCode" TEXT,
  ADD COLUMN "payrollUrssafReference" TEXT;

ALTER TABLE "payroll_profiles"
  ADD COLUMN "employeeAddress" TEXT;

ALTER TABLE "payroll_periods"
  ADD COLUMN "paymentDate" DATE;

ALTER TABLE "payroll_calculations"
  ADD COLUMN "netTaxableAmount" DECIMAL(12,2),
  ADD COLUMN "netSocialAmount" DECIMAL(12,2);
