-- Align payroll foundation columns with the Prisma field names.
-- The payroll migrations created snake_case SQL columns while the current
-- Prisma schema exposes these fields in camelCase without @map.

ALTER TABLE "payroll_profiles"
  RENAME COLUMN "organization_id" TO "organizationId";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "employee_id" TO "employeeId";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "pay_frequency" TO "payFrequency";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "base_salary_cents" TO "baseSalaryCents";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "monthly_hours" TO "monthlyHours";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "effective_from" TO "effectiveFrom";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "effective_until" TO "effectiveUntil";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "payroll_periods"
  RENAME COLUMN "organization_id" TO "organizationId";
ALTER TABLE "payroll_periods"
  RENAME COLUMN "calculated_at" TO "calculatedAt";
ALTER TABLE "payroll_periods"
  RENAME COLUMN "validated_at" TO "validatedAt";
ALTER TABLE "payroll_periods"
  RENAME COLUMN "locked_at" TO "lockedAt";
ALTER TABLE "payroll_periods"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "payroll_periods"
  RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "payroll_variables"
  RENAME COLUMN "organization_id" TO "organizationId";
ALTER TABLE "payroll_variables"
  RENAME COLUMN "payroll_period_id" TO "payrollPeriodId";
ALTER TABLE "payroll_variables"
  RENAME COLUMN "employee_id" TO "employeeId";
ALTER TABLE "payroll_variables"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "payroll_variables"
  RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "payroll_rule_versions"
  RENAME COLUMN "valid_from" TO "validFrom";
ALTER TABLE "payroll_rule_versions"
  RENAME COLUMN "valid_until" TO "validUntil";
ALTER TABLE "payroll_rule_versions"
  RENAME COLUMN "source_name" TO "sourceName";
ALTER TABLE "payroll_rule_versions"
  RENAME COLUMN "source_url" TO "sourceUrl";
ALTER TABLE "payroll_rule_versions"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "payroll_rule_versions"
  RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "payroll_calculations"
  RENAME COLUMN "organization_id" TO "organizationId";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "payroll_period_id" TO "payrollPeriodId";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "employee_id" TO "employeeId";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "rule_set_version" TO "ruleSetVersion";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "gross_amount" TO "grossAmount";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "employee_contributions" TO "employeeContributions";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "employer_contributions" TO "employerContributions";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "net_before_tax" TO "netBeforeTax";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "withholding_tax" TO "withholdingTax";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "net_paid" TO "netPaid";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "calculation_snapshot" TO "calculationSnapshot";
ALTER TABLE "payroll_calculations"
  RENAME COLUMN "created_at" TO "createdAt";

ALTER TABLE "payroll_contributions"
  RENAME COLUMN "calculation_id" TO "calculationId";
ALTER TABLE "payroll_contributions"
  RENAME COLUMN "base_amount" TO "baseAmount";
ALTER TABLE "payroll_contributions"
  RENAME COLUMN "rule_version_id" TO "ruleVersionId";
ALTER TABLE "payroll_contributions"
  RENAME COLUMN "created_at" TO "createdAt";

ALTER TABLE "payslips"
  RENAME COLUMN "organization_id" TO "organizationId";
ALTER TABLE "payslips"
  RENAME COLUMN "payroll_period_id" TO "payrollPeriodId";
ALTER TABLE "payslips"
  RENAME COLUMN "employee_id" TO "employeeId";
ALTER TABLE "payslips"
  RENAME COLUMN "calculation_id" TO "calculationId";
ALTER TABLE "payslips"
  RENAME COLUMN "document_status" TO "documentStatus";
ALTER TABLE "payslips"
  RENAME COLUMN "storage_key" TO "storageKey";
ALTER TABLE "payslips"
  RENAME COLUMN "generated_at" TO "generatedAt";
ALTER TABLE "payslips"
  RENAME COLUMN "published_at" TO "publishedAt";
ALTER TABLE "payslips"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "payslips"
  RENAME COLUMN "updated_at" TO "updatedAt";
