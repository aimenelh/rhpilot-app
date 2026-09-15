ALTER TABLE "dsn_organization_settings"
  ADD COLUMN "urssafSiret" TEXT;

ALTER TABLE "dsn_organization_settings"
  ADD CONSTRAINT "dsn_organization_settings_urssaf_siret_check"
  CHECK ("urssafSiret" IS NULL OR "urssafSiret" ~ '^[0-9]{14}$');
