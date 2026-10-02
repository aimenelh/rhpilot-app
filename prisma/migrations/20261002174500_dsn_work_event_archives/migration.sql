CREATE UNIQUE INDEX "absences_organization_employee_id_key" ON "absences" ("organizationId", "employeeId", "id");
CREATE TABLE "dsn_work_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "absenceId" TEXT NOT NULL,
  "nature" TEXT NOT NULL,
  "declarationOrder" BIGINT NOT NULL,
  "businessId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "requestKey" TEXT NOT NULL,
  "sourceDigest" TEXT NOT NULL,
  "normVersion" TEXT NOT NULL DEFAULT 'P26V01',
  "mode" TEXT NOT NULL DEFAULT 'PRECONTROL',
  "fileName" TEXT NOT NULL,
  "contentCiphertext" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "warnings" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dsn_work_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dsn_work_events_absence_fk" FOREIGN KEY ("organizationId", "employeeId", "absenceId") REFERENCES "absences" ("organizationId", "employeeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dsn_work_events_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dsn_work_events_precontrol_check" CHECK ("mode" = 'PRECONTROL' AND "normVersion" = 'P26V01' AND "nature" IN ('04', '05')),
  CONSTRAINT "dsn_work_events_metadata_check" CHECK ("version" > 0 AND "declarationOrder" BETWEEN 1 AND 999999999999999 AND length("businessId") BETWEEN 1 AND 15 AND "sizeBytes" BETWEEN 1 AND 8388608 AND "sha256" ~ '^[a-f0-9]{64}$' AND "sourceDigest" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("warnings") = 'array')
);
CREATE UNIQUE INDEX "dsn_work_events_version_key" ON "dsn_work_events" ("organizationId", "absenceId", "nature", "version");
CREATE UNIQUE INDEX "dsn_work_events_order_key" ON "dsn_work_events" ("organizationId", "declarationOrder");
CREATE UNIQUE INDEX "dsn_work_events_business_key" ON "dsn_work_events" ("organizationId", "businessId");
CREATE UNIQUE INDEX "dsn_work_events_request_key" ON "dsn_work_events" ("organizationId", "requestKey");
CREATE INDEX "dsn_work_events_created_idx" ON "dsn_work_events" ("organizationId", "createdAt");
CREATE TRIGGER "dsn_work_events_immutable" BEFORE UPDATE OR DELETE ON "dsn_work_events" FOR EACH ROW EXECUTE FUNCTION "prevent_dsn_declaration_mutation"();
