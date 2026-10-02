ALTER TABLE "dsn_employee_profiles" ADD COLUMN "fixedTermReasonCode" TEXT;
ALTER TABLE "dsn_employee_profiles" ADD CONSTRAINT "dsn_employee_profiles_fixed_term_reason_check"
  CHECK ("fixedTermReasonCode" IS NULL OR ("contractNatureCode" = '02' AND "publicPolicyCode" = '99' AND "fixedTermReasonCode" IN ('01','02','03','04','05','06','07','08','09','10','12','13')));
