CREATE TABLE "dsn_organization_settings" (
  "organizationId" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "defaultTestMode" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dsn_organization_settings_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "dsn_organization_settings_organization_fk"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "dsn_employee_profiles" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "nirCiphertext" TEXT NOT NULL,
  "birthDate" DATE NOT NULL,
  "birthPlace" TEXT NOT NULL,
  "birthDepartment" TEXT NOT NULL,
  "addressLine" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "countryCode" TEXT,
  "contractNumber" TEXT NOT NULL,
  "pcsEsecCode" TEXT NOT NULL,
  "conventionalStatusCode" TEXT NOT NULL,
  "retirementStatusCode" TEXT NOT NULL,
  "workUnitCode" TEXT NOT NULL DEFAULT '10',
  "referenceWorkQuota" DECIMAL(8,2) NOT NULL,
  "contractWorkQuota" DECIMAL(8,2) NOT NULL,
  "sicknessRegimeCode" TEXT NOT NULL,
  "oldAgeRegimeCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dsn_employee_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dsn_employee_profiles_org_employee_unique" UNIQUE ("organizationId", "employeeId"),
  CONSTRAINT "dsn_employee_profiles_employee_fk"
    FOREIGN KEY ("organizationId", "employeeId") REFERENCES "employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dsn_employee_profiles_nir_ciphertext_check" CHECK (char_length("nirCiphertext") > 20),
  CONSTRAINT "dsn_employee_profiles_contract_number_check" CHECK (char_length("contractNumber") BETWEEN 5 AND 20),
  CONSTRAINT "dsn_employee_profiles_reference_quota_check" CHECK ("referenceWorkQuota" > 0),
  CONSTRAINT "dsn_employee_profiles_contract_quota_check" CHECK ("contractWorkQuota" > 0)
);

CREATE INDEX "dsn_employee_profiles_lookup_idx"
  ON "dsn_employee_profiles" ("organizationId", "employeeId");
