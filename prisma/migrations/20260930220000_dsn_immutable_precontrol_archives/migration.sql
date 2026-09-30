CREATE TABLE "dsn_declarations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "payrollPeriodId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "requestKey" TEXT NOT NULL,
  "normVersion" TEXT NOT NULL DEFAULT 'P26V01',
  "mode" TEXT NOT NULL DEFAULT 'PRECONTROL',
  "fileName" TEXT NOT NULL,
  "contentCiphertext" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "employeeCount" INTEGER NOT NULL,
  "warnings" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dsn_declarations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dsn_declarations_organization_id_id_key" UNIQUE ("organizationId", "id"),
  CONSTRAINT "dsn_declarations_period_version_key" UNIQUE ("organizationId", "payrollPeriodId", "version"),
  CONSTRAINT "dsn_declarations_request_key" UNIQUE ("organizationId", "requestKey"),
  CONSTRAINT "dsn_declarations_period_fk" FOREIGN KEY ("organizationId", "payrollPeriodId") REFERENCES "payroll_periods" ("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dsn_declarations_precontrol_check" CHECK ("mode" = 'PRECONTROL' AND "normVersion" = 'P26V01'),
  CONSTRAINT "dsn_declarations_metadata_check" CHECK ("version" > 0 AND "sizeBytes" > 0 AND "sizeBytes" <= 8388608 AND "employeeCount" > 0 AND "sha256" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("warnings") = 'array')
);
CREATE INDEX "dsn_declarations_period_created_idx" ON "dsn_declarations" ("organizationId", "payrollPeriodId", "createdAt");
CREATE FUNCTION "prevent_dsn_declaration_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Une archive DSN est immuable : créez une nouvelle version.';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "dsn_declarations_immutable" BEFORE UPDATE OR DELETE ON "dsn_declarations" FOR EACH ROW EXECUTE FUNCTION "prevent_dsn_declaration_mutation"();
