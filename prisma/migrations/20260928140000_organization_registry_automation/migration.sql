-- Paramétrage automatique de l'organisation à partir de son SIRET
-- (répertoire Sirene) et du barème Urssaf du versement mobilité.

-- Code commune Insee de l'établissement : clé du barème du versement mobilité.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "payrollCommuneCode" TEXT;
-- Dernière reprise des données du répertoire Sirene et instantané de la réponse utile.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "registrySyncedAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "registrySnapshot" JSONB;
-- Dernière tentative, réussie ou non (évite de réinterroger le registre à chaque calcul).
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "registryCheckedAt" TIMESTAMP(3);
-- Provenance du taux de versement mobilité : URSSAF (barème officiel, par défaut),
-- MANUEL (saisi par l'entreprise), DEMO (jeu de démonstration hors ligne).
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mobilityRateSource" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mobilityRateCheckedAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mobilityRateDetail" TEXT;

DO $$
BEGIN
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_mobility_rate_source_check"
    CHECK ("mobilityRateSource" IS NULL OR "mobilityRateSource" IN ('URSSAF', 'MANUEL', 'DEMO'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Les taux déjà saisis l'ont été à la main : ils restent prioritaires tant que
-- l'entreprise ne vide pas le champ pour revenir au barème Urssaf.
UPDATE "organizations" SET "mobilityRateSource" = 'MANUEL'
WHERE "mobilityRate" IS NOT NULL AND "mobilityRateSource" IS NULL;
