-- Règles maison : les règles de congés écrites par le RH, puis appliquées par
-- RH Pilot à chaque demande. Migration additive : aucune donnée existante
-- n'est modifiée.

-- Enfants à charge déclarés : la loi demande de tenir compte de la situation
-- de famille pour l'ordre des départs en congé (C. trav. art. L3141-16).
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "dependentChildren" INTEGER;

DO $$
BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_dependent_children_check" CHECK ("dependentChildren" IS NULL OR ("dependentChildren" >= 0 AND "dependentChildren" <= 20));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Une ligne par version. Une règle modifiée n'est jamais réécrite : la
-- nouvelle version remplace l'ancienne, qui reste consultable avec les
-- décisions prises en son nom.
CREATE TABLE IF NOT EXISTS "hr_rules" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lineageId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "domain" TEXT NOT NULL DEFAULT 'LEAVE',
  "title" TEXT NOT NULL,
  "sourceText" TEXT,
  "spec" JSONB NOT NULL,
  "legalReview" JSONB,
  "mode" TEXT NOT NULL DEFAULT 'PROPOSE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" DATE NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  "archivedByUserId" TEXT,
  CONSTRAINT "hr_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_rules_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "hr_rules_domain_check" CHECK ("domain" IN ('LEAVE')),
  CONSTRAINT "hr_rules_mode_check" CHECK ("mode" IN ('PROPOSE', 'AUTO_APPROVE')),
  CONSTRAINT "hr_rules_status_check" CHECK ("status" IN ('ACTIVE', 'ARCHIVED')),
  CONSTRAINT "hr_rules_version_check" CHECK ("version" >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "hr_rules_lineage_version_key" ON "hr_rules" ("lineageId", "version");
CREATE INDEX IF NOT EXISTS "hr_rules_organization_status_idx" ON "hr_rules" ("organizationId", "status");

-- Chaque décision prise sur une demande gouvernée par une règle : ce que les
-- règles proposaient, ce qui a été décidé, par qui. C'est la preuve que la
-- décision repose sur un critère objectif. Pas de clé vers "absences" : la
-- trace reste si l'absence est supprimée, comme le journal d'audit.
CREATE TABLE IF NOT EXISTS "hr_rule_decisions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "absenceId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "ruleIds" TEXT[] NOT NULL,
  "ruleOutcome" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "decidedBy" TEXT NOT NULL,
  "followedRules" BOOLEAN NOT NULL,
  "hrExplanation" TEXT NOT NULL,
  "employeeExplanation" TEXT,
  "evaluation" JSONB NOT NULL,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hr_rule_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_rule_decisions_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "hr_rule_decisions_outcome_check" CHECK ("ruleOutcome" IN ('APPROVE', 'REFUSE', 'REVIEW')),
  CONSTRAINT "hr_rule_decisions_decision_check" CHECK ("decision" IN ('VALIDATED', 'REJECTED')),
  CONSTRAINT "hr_rule_decisions_decided_by_check" CHECK ("decidedBy" IN ('RULE', 'HR'))
);
CREATE INDEX IF NOT EXISTS "hr_rule_decisions_absence_idx" ON "hr_rule_decisions" ("organizationId", "absenceId");
CREATE INDEX IF NOT EXISTS "hr_rule_decisions_created_idx" ON "hr_rule_decisions" ("organizationId", "createdAt");
