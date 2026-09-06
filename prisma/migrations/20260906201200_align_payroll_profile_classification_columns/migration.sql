-- Align payroll profile classification columns with the Prisma field names.
-- The classification migration created snake_case SQL columns while the
-- current Prisma schema exposes these fields in camelCase without @map.

ALTER TABLE "payroll_profiles"
  RENAME COLUMN "classification_code" TO "classificationCode";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "classification_label" TO "classificationLabel";
ALTER TABLE "payroll_profiles"
  RENAME COLUMN "seniority_date" TO "seniorityDate";
