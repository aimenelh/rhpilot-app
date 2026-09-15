ALTER TABLE "dsn_organization_settings"
  ADD COLUMN "declaredContactType" TEXT,
  ADD COLUMN "enterpriseApenCode" TEXT;

ALTER TABLE "dsn_employee_profiles"
  ADD COLUMN "birthCountryCode" TEXT,
  ADD COLUMN "euClassificationCode" TEXT,
  ADD COLUMN "baseSchemeSupplementCode" TEXT,
  ADD COLUMN "workLocationId" TEXT,
  ADD COLUMN "foreignWorkerCode" TEXT,
  ADD COLUMN "employmentStatusCode" TEXT,
  ADD COLUMN "multipleJobsCode" TEXT,
  ADD COLUMN "multipleEmployersCode" TEXT,
  ADD COLUMN "workAccidentRegimeCode" TEXT,
  ADD COLUMN "workAccidentRiskCode" TEXT;

ALTER TABLE "dsn_organization_settings"
  ADD CONSTRAINT "dsn_organization_settings_contact_type_check"
  CHECK ("declaredContactType" IS NULL OR "declaredContactType" IN ('01','02','03','04','05','06','07','08','09','13','14','15','16'));

ALTER TABLE "dsn_employee_profiles"
  ADD CONSTRAINT "dsn_employee_profiles_birth_country_check"
  CHECK ("birthCountryCode" IS NULL OR "birthCountryCode" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "dsn_employee_profiles_eu_classification_check"
  CHECK ("euClassificationCode" IS NULL OR "euClassificationCode" IN ('01','02','03','04')),
  ADD CONSTRAINT "dsn_employee_profiles_base_scheme_supplement_check"
  CHECK ("baseSchemeSupplementCode" IS NULL OR "baseSchemeSupplementCode" IN ('01','02','03','99')),
  ADD CONSTRAINT "dsn_employee_profiles_foreign_worker_check"
  CHECK ("foreignWorkerCode" IS NULL OR "foreignWorkerCode" IN ('01','02','03','99')),
  ADD CONSTRAINT "dsn_employee_profiles_employment_status_check"
  CHECK ("employmentStatusCode" IS NULL OR "employmentStatusCode" IN ('01','02','03','04','06','07','08','09','10','11','12','99')),
  ADD CONSTRAINT "dsn_employee_profiles_multiple_jobs_check"
  CHECK ("multipleJobsCode" IS NULL OR "multipleJobsCode" IN ('01','02','03')),
  ADD CONSTRAINT "dsn_employee_profiles_multiple_employers_check"
  CHECK ("multipleEmployersCode" IS NULL OR "multipleEmployersCode" IN ('01','02','03'));
