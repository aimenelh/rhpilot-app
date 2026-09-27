-- Espace salarié : comptes des salariés, documents mis à disposition et journal.
--
-- Les comptes salariés ne sont pas des Membership : ils ne donnent aucun accès
-- au tableau de bord RH, ne comptent pas comme utilisateurs de l'organisation
-- et ne changent rien à la facturation (qui porte sur les fiches salariés).

-- Adresse personnelle du salarié (invitation et notifications) et refus du
-- bulletin électronique (article L3243-2 du Code du travail).
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "personalEmail" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "paperPayslipSince" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "paperPayslipSource" TEXT;

DO $$
BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_paper_payslip_source_check" CHECK ("paperPayslipSource" IS NULL OR "paperPayslipSource" IN ('EMPLOYEE', 'EMPLOYER'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "employee_accounts" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "userId" TEXT,
  "inviteTokenHash" TEXT,
  "inviteExpiresAt" TIMESTAMP(3),
  "invitedAt" TIMESTAMP(3),
  "invitedByUserId" TEXT,
  "activatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_accounts_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_accounts_employee_fk" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_accounts_user_fk" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "employee_accounts_employee_unique" ON "employee_accounts" ("organizationId", "employeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "employee_accounts_token_unique" ON "employee_accounts" ("inviteTokenHash");
CREATE INDEX IF NOT EXISTS "employee_accounts_user_idx" ON "employee_accounts" ("userId");

-- Documents mis à disposition du salarié. Un document publié n'est jamais
-- modifié ni supprimé : une correction publie un nouveau document et marque
-- l'ancien comme remplacé.
CREATE TABLE IF NOT EXISTS "employee_documents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "periodYear" INTEGER,
  "periodMonth" INTEGER,
  "sourcePayslipId" TEXT,
  "storageKey" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedByUserId" TEXT,
  "replacedAt" TIMESTAMP(3),
  "replacedByDocumentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_documents_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_documents_employee_fk" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_documents_kind_check" CHECK ("kind" IN ('PAYSLIP', 'WORK_CERTIFICATE', 'FINAL_SETTLEMENT', 'FRANCE_TRAVAIL', 'OTHER')),
  CONSTRAINT "employee_documents_period_check" CHECK (
    ("periodYear" IS NULL AND "periodMonth" IS NULL)
    OR ("periodYear" BETWEEN 2000 AND 2100 AND "periodMonth" BETWEEN 1 AND 12)
  ),
  CONSTRAINT "employee_documents_payslip_period_check" CHECK ("kind" <> 'PAYSLIP' OR "periodYear" IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS "employee_documents_employee_idx" ON "employee_documents" ("organizationId", "employeeId", "publishedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "employee_documents_active_payslip_unique"
  ON "employee_documents" ("organizationId", "employeeId", "periodYear", "periodMonth")
  WHERE "kind" = 'PAYSLIP' AND "replacedAt" IS NULL;

-- Journal de mise à disposition, de notification et de téléchargement.
-- Il sert de preuve : on ne peut qu'y ajouter des lignes.
CREATE TABLE IF NOT EXISTS "employee_document_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorKind" TEXT NOT NULL,
  "actorUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_document_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_document_events_document_fk" FOREIGN KEY ("documentId") REFERENCES "employee_documents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_document_events_action_check" CHECK ("action" IN ('PUBLISHED', 'NOTIFIED', 'NOTIFICATION_FAILED', 'DOWNLOADED', 'REPLACED')),
  CONSTRAINT "employee_document_events_actor_check" CHECK ("actorKind" IN ('EMPLOYER', 'EMPLOYEE', 'SYSTEM'))
);
CREATE INDEX IF NOT EXISTS "employee_document_events_document_idx" ON "employee_document_events" ("documentId", "createdAt");
CREATE INDEX IF NOT EXISTS "employee_document_events_employee_idx" ON "employee_document_events" ("organizationId", "employeeId", "createdAt");

CREATE OR REPLACE FUNCTION "employee_document_events_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Le journal des documents salariés ne peut pas être modifié.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "employee_document_events_no_update" ON "employee_document_events";
CREATE TRIGGER "employee_document_events_no_update"
  BEFORE UPDATE OR DELETE ON "employee_document_events"
  FOR EACH ROW EXECUTE FUNCTION "employee_document_events_append_only"();
