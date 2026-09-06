-- RH Pilot — Référentiel conventionnel v1
-- Ce socle ne contient aucune règle métier inventée.
-- Les conventions, versions et règles seront alimentées uniquement
-- depuis des sources juridiques identifiées et validées.

CREATE TABLE "collective_agreements" (
  "id" TEXT NOT NULL,
  "idcc" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source_name" TEXT,
  "source_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collective_agreements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collective_agreements_status_check" CHECK ("status" IN ('ACTIVE', 'ARCHIVED'))
);

CREATE UNIQUE INDEX "collective_agreements_idcc_key"
  ON "collective_agreements" ("idcc");

CREATE TABLE "collective_agreement_versions" (
  "id" TEXT NOT NULL,
  "collective_agreement_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "source_name" TEXT NOT NULL,
  "source_url" TEXT,
  "source_reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collective_agreement_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collective_agreement_versions_agreement_fk"
    FOREIGN KEY ("collective_agreement_id") REFERENCES "collective_agreements" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "collective_agreement_versions_status_check"
    CHECK ("status" IN ('DRAFT', 'VALIDATED', 'ARCHIVED')),
  CONSTRAINT "collective_agreement_versions_dates_check"
    CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from")
);

CREATE UNIQUE INDEX "collective_agreement_versions_agreement_version_key"
  ON "collective_agreement_versions" ("collective_agreement_id", "version");
CREATE INDEX "collective_agreement_versions_lookup_idx"
  ON "collective_agreement_versions" ("collective_agreement_id", "valid_from", "valid_until", "status");

CREATE TABLE "collective_agreement_rules" (
  "id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "parameters" JSONB NOT NULL,
  "source_reference" TEXT NOT NULL,
  "source_url" TEXT,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collective_agreement_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collective_agreement_rules_version_fk"
    FOREIGN KEY ("version_id") REFERENCES "collective_agreement_versions" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "collective_agreement_rules_status_check"
    CHECK ("status" IN ('DRAFT', 'VALIDATED', 'ARCHIVED')),
  CONSTRAINT "collective_agreement_rules_dates_check"
    CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from")
);

CREATE UNIQUE INDEX "collective_agreement_rules_version_code_key"
  ON "collective_agreement_rules" ("version_id", "code");
CREATE INDEX "collective_agreement_rules_lookup_idx"
  ON "collective_agreement_rules" ("version_id", "category", "valid_from", "valid_until", "status");

ALTER TABLE "organizations"
  ADD COLUMN "collective_agreement_id" TEXT;

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_collective_agreement_fk"
  FOREIGN KEY ("collective_agreement_id") REFERENCES "collective_agreements" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "organizations_collective_agreement_idx"
  ON "organizations" ("collective_agreement_id");

ALTER TABLE "payroll_profiles"
  ADD CONSTRAINT "payroll_profiles_collective_agreement_fk"
  FOREIGN KEY ("collective_agreement_id") REFERENCES "collective_agreements" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "payroll_profiles_collective_agreement_idx"
  ON "payroll_profiles" ("collective_agreement_id");
