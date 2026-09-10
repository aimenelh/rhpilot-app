CREATE TABLE "employee_alternance_profiles" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "birthDate" DATE NOT NULL,
  "contractYear" INTEGER,
  "hasBaccalaureateOrHigher" BOOLEAN,
  "validFrom" DATE NOT NULL,
  "validUntil" DATE,
  "source" TEXT NOT NULL,
  "sourceReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_alternance_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_alternance_profiles_contract_year_check" CHECK ("contractYear" IS NULL OR "contractYear" IN (1, 2, 3)),
  CONSTRAINT "employee_alternance_profiles_dates_check" CHECK ("validUntil" IS NULL OR "validUntil" >= "validFrom")
);

CREATE INDEX "employee_alternance_profiles_lookup_idx" ON "employee_alternance_profiles" ("organizationId", "employeeId", "validFrom", "validUntil");
