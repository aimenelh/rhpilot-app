CREATE TABLE "employee_withholding_tax_profiles" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "rate" DECIMAL(8,6) NOT NULL,
  "validFrom" DATE NOT NULL,
  "validUntil" DATE,
  "source" TEXT NOT NULL,
  "sourceReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_withholding_tax_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_withholding_tax_profiles_rate_check" CHECK ("rate" >= 0 AND "rate" <= 1),
  CONSTRAINT "employee_withholding_tax_profiles_dates_check" CHECK ("validUntil" IS NULL OR "validUntil" >= "validFrom"),
  CONSTRAINT "employee_withholding_tax_profiles_employee_fk" FOREIGN KEY ("organizationId", "employeeId") REFERENCES "employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "employee_withholding_tax_profiles_lookup_idx" ON "employee_withholding_tax_profiles" ("organizationId", "employeeId", "validFrom", "validUntil");
