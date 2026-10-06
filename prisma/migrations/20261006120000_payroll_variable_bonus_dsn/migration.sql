-- Primes non mensuelles : nature S21.G00.52.001 et période de rattachement saisies
-- explicitement avec la variable, puis figées dans le calcul. Colonnes facultatives :
-- seules les primes annuelles ou exceptionnelles les exigent au calcul.
ALTER TABLE "payroll_variables"
  ADD COLUMN "dsnBonusType" VARCHAR(3),
  ADD COLUMN "attachmentStart" DATE,
  ADD COLUMN "attachmentEnd" DATE;

ALTER TABLE "payroll_variables"
  ADD CONSTRAINT "payroll_variables_dsn_bonus_type_check"
    CHECK ("dsnBonusType" IS NULL OR "dsnBonusType" IN ('026', '027', '028')),
  ADD CONSTRAINT "payroll_variables_attachment_order_check"
    CHECK ("attachmentStart" IS NULL OR "attachmentEnd" IS NULL OR "attachmentEnd" >= "attachmentStart");
