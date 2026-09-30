ALTER TABLE "organizations"
  ADD COLUMN "sickPayRule" JSONB,
  ADD COLUMN "workAccidentPayRule" JSONB;

ALTER TABLE "organizations" ALTER COLUMN "payrollHeadcount" TYPE DECIMAL(10, 2);
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_payroll_settings_check";
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_payroll_settings_check" CHECK (
  ("payrollHeadcount" IS NULL OR "payrollHeadcount" >= 0)
  AND ("mobilityRate" IS NULL OR ("mobilityRate" >= 0 AND "mobilityRate" <= 3.2))
  AND "paidLeaveMethod" IN ('OUVRABLES', 'OUVRES')
  AND ("mealVoucherFaceValue" IS NULL OR "mealVoucherFaceValue" > 0)
  AND ("mealVoucherEmployerShare" IS NULL OR ("mealVoucherEmployerShare" >= 0.5 AND "mealVoucherEmployerShare" <= 0.6))
  AND ("transportEmployerShare" >= 0.5 AND "transportEmployerShare" <= 1)
);
