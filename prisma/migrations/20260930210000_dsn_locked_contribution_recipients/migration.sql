ALTER TABLE "dsn_organization_settings"
  ADD COLUMN "retirementSiret" TEXT,
  ADD COLUMN "paymentIbanCiphertext" TEXT,
  ADD COLUMN "paymentBic" TEXT,
  ADD COLUMN "sepaMandatesConfirmed" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "dsn_organization_settings"
  ADD CONSTRAINT "dsn_retirement_siret_format" CHECK ("retirementSiret" IS NULL OR "retirementSiret" ~ '^[0-9]{14}$'),
  ADD CONSTRAINT "dsn_payment_bic_format" CHECK ("paymentBic" IS NULL OR "paymentBic" ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$');
