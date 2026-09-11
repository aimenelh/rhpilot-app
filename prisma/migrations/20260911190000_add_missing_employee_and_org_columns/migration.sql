-- Ces colonnes existent dans schema.prisma depuis un moment mais
-- n'ont jamais été appliquées en base par une migration. Conséquence
-- concrète : toute création de salarié avec isDemoData (génération de
-- l'entreprise de démonstration) échouait en base (colonne
-- inexistante), pour 0 salarié créé au final.
--
-- Les contraintes uniques sur stripeCustomerId/stripeSubscriptionId
-- existaient déjà en base (probablement ajoutées hors migration à un
-- moment donné) -- gérées avec un bloc exception plutôt qu'un simple
-- IF NOT EXISTS, qui ne suffit pas à couvrir ce cas.

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "isDemoData" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

DO $$
BEGIN
  BEGIN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
  EXCEPTION WHEN duplicate_table OR duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
  EXCEPTION WHEN duplicate_table OR duplicate_object THEN
    NULL;
  END;
END $$;
