-- Information du salarié sur le bulletin électronique (C. trav. art. D3243-7) :
-- date et mode de remise de la note, qui doit donner date certaine.
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "electronicPayslipNoticeAt" DATE;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "electronicPayslipNoticeMethod" TEXT;

DO $$
BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_electronic_payslip_notice_method_check"
    CHECK ("electronicPayslipNoticeMethod" IS NULL OR "electronicPayslipNoticeMethod" IN ('HAND_DELIVERY', 'REGISTERED_MAIL', 'ELECTRONIC_REGISTERED_MAIL', 'AT_HIRING'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
