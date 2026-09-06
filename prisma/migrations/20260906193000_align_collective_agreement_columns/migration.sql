-- Align the collective-agreement foundation columns with the Prisma field names.
-- The foundation migration created several snake_case columns while the current
-- Prisma schema maps these fields directly (without @map). Rename them so the
-- runtime client and production database describe the same columns.

ALTER TABLE "organizations"
  RENAME COLUMN "collective_agreement_id" TO "collectiveAgreementId";

ALTER TABLE "payroll_profiles"
  RENAME COLUMN "collective_agreement_id" TO "collectiveAgreementId";

ALTER TABLE "collective_agreements"
  RENAME COLUMN "source_name" TO "sourceName";
ALTER TABLE "collective_agreements"
  RENAME COLUMN "source_url" TO "sourceUrl";
ALTER TABLE "collective_agreements"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "collective_agreements"
  RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "collective_agreement_id" TO "collectiveAgreementId";
ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "valid_from" TO "validFrom";
ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "valid_until" TO "validUntil";
ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "source_name" TO "sourceName";
ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "source_url" TO "sourceUrl";
ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "source_reference" TO "sourceReference";
ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "collective_agreement_versions"
  RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "collective_agreement_rules"
  RENAME COLUMN "version_id" TO "versionId";
ALTER TABLE "collective_agreement_rules"
  RENAME COLUMN "source_reference" TO "sourceReference";
ALTER TABLE "collective_agreement_rules"
  RENAME COLUMN "source_url" TO "sourceUrl";
ALTER TABLE "collective_agreement_rules"
  RENAME COLUMN "valid_from" TO "validFrom";
ALTER TABLE "collective_agreement_rules"
  RENAME COLUMN "valid_until" TO "validUntil";
ALTER TABLE "collective_agreement_rules"
  RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "collective_agreement_rules"
  RENAME COLUMN "updated_at" TO "updatedAt";
