-- RH Pilot — Socle paie v1
-- Cette migration pose uniquement le modèle de données et l'historisation.
-- Aucun taux social n'est codé ici : les règles seront versionnées séparément.

CREATE TABLE "payroll_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "pay_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "base_salary_cents" INTEGER,
  "monthly_hours" DECIMAL(8,2),
  "collective_agreement_id" TEXT,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_profiles_employee_fk"
    FOREIGN KEY ("organization_id", "employee_id")
    REFERENCES "employees" ("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_profiles_frequency_check"
    CHECK ("pay_frequency" IN ('MONTHLY')),
  CONSTRAINT "payroll_profiles_currency_check"
    CHECK ("currency" = 'EUR'),
  CONSTRAINT "payroll_profiles_salary_check"
    CHECK ("base_salary_cents" IS NULL OR "base_salary_cents" >= 0),
  CONSTRAINT "payroll_profiles_hours_check"
    CHECK ("monthly_hours" IS NULL OR "monthly_hours" > 0)
);

CREATE UNIQUE INDEX "payroll_profiles_organization_employee_effective_from_key"
  ON "payroll_profiles" ("organization_id", "employee_id", "effective_from");
CREATE INDEX "payroll_profiles_organization_employee_idx"
  ON "payroll_profiles" ("organization_id", "employee_id");

CREATE TABLE "payroll_periods" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "calculated_at" TIMESTAMP(3),
  "validated_at" TIMESTAMP(3),
  "locked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_periods_organization_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_periods_month_check" CHECK ("month" BETWEEN 1 AND 12),
  CONSTRAINT "payroll_periods_year_check" CHECK ("year" BETWEEN 2000 AND 2100),
  CONSTRAINT "payroll_periods_status_check"
    CHECK ("status" IN ('DRAFT', 'CALCULATED', 'REVIEW', 'VALIDATED', 'LOCKED'))
);

CREATE UNIQUE INDEX "payroll_periods_organization_year_month_key"
  ON "payroll_periods" ("organization_id", "year", "month");
CREATE INDEX "payroll_periods_organization_status_idx"
  ON "payroll_periods" ("organization_id", "status");

CREATE TABLE "payroll_variables" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "payroll_period_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'EUR',
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_variables_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_variables_period_fk"
    FOREIGN KEY ("organization_id", "payroll_period_id")
    REFERENCES "payroll_periods" ("organization_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_variables_employee_fk"
    FOREIGN KEY ("organization_id", "employee_id")
    REFERENCES "employees" ("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_variables_unit_check" CHECK ("unit" IN ('EUR', 'DAYS', 'HOURS', 'PERCENT')),
  CONSTRAINT "payroll_variables_source_check" CHECK ("source" IN ('MANUAL', 'IMPORT', 'SYSTEM'))
);

CREATE INDEX "payroll_variables_period_employee_idx"
  ON "payroll_variables" ("organization_id", "payroll_period_id", "employee_id");

CREATE TABLE "payroll_rule_versions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "scope" TEXT NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "source_name" TEXT NOT NULL,
  "source_url" TEXT,
  "parameters" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_rule_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_rule_versions_status_check" CHECK ("status" IN ('DRAFT', 'VALIDATED', 'ARCHIVED')),
  CONSTRAINT "payroll_rule_versions_dates_check" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from")
);

CREATE UNIQUE INDEX "payroll_rule_versions_code_version_scope_key"
  ON "payroll_rule_versions" ("code", "version", "scope");
CREATE INDEX "payroll_rule_versions_lookup_idx"
  ON "payroll_rule_versions" ("code", "scope", "valid_from", "valid_until", "status");

CREATE TABLE "payroll_calculations" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "payroll_period_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "rule_set_version" TEXT NOT NULL,
  "gross_amount" DECIMAL(12,2) NOT NULL,
  "employee_contributions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "employer_contributions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_before_tax" DECIMAL(12,2) NOT NULL,
  "withholding_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_paid" DECIMAL(12,2) NOT NULL,
  "calculation_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_calculations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_calculations_period_fk"
    FOREIGN KEY ("organization_id", "payroll_period_id")
    REFERENCES "payroll_periods" ("organization_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_calculations_employee_fk"
    FOREIGN KEY ("organization_id", "employee_id")
    REFERENCES "employees" ("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_calculations_non_negative_check"
    CHECK ("gross_amount" >= 0 AND "employee_contributions" >= 0 AND "employer_contributions" >= 0 AND "withholding_tax" >= 0)
);

CREATE UNIQUE INDEX "payroll_calculations_period_employee_key"
  ON "payroll_calculations" ("organization_id", "payroll_period_id", "employee_id");

CREATE TABLE "payroll_contributions" (
  "id" TEXT NOT NULL,
  "calculation_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "base_amount" DECIMAL(12,2) NOT NULL,
  "rate" DECIMAL(10,6) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "rule_version_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_contributions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_contributions_calculation_fk"
    FOREIGN KEY ("calculation_id") REFERENCES "payroll_calculations" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_contributions_rule_fk"
    FOREIGN KEY ("rule_version_id") REFERENCES "payroll_rule_versions" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payroll_contributions_side_check" CHECK ("side" IN ('EMPLOYEE', 'EMPLOYER')),
  CONSTRAINT "payroll_contributions_rate_check" CHECK ("rate" >= 0),
  CONSTRAINT "payroll_contributions_amount_check" CHECK ("base_amount" >= 0 AND "amount" >= 0)
);

CREATE INDEX "payroll_contributions_calculation_idx"
  ON "payroll_contributions" ("calculation_id");

CREATE TABLE "payslips" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "payroll_period_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "calculation_id" TEXT NOT NULL,
  "document_status" TEXT NOT NULL DEFAULT 'DRAFT',
  "storage_key" TEXT,
  "generated_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payslips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payslips_period_fk"
    FOREIGN KEY ("organization_id", "payroll_period_id")
    REFERENCES "payroll_periods" ("organization_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payslips_employee_fk"
    FOREIGN KEY ("organization_id", "employee_id")
    REFERENCES "employees" ("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payslips_calculation_fk"
    FOREIGN KEY ("calculation_id") REFERENCES "payroll_calculations" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payslips_status_check" CHECK ("document_status" IN ('DRAFT', 'GENERATED', 'PUBLISHED'))
);

CREATE UNIQUE INDEX "payslips_calculation_key" ON "payslips" ("calculation_id");
CREATE UNIQUE INDEX "payslips_period_employee_key" ON "payslips" ("organization_id", "payroll_period_id", "employee_id");
