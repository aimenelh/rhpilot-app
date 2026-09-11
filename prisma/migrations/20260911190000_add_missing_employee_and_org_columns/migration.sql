-- Ces colonnes existent dans schema.prisma depuis un moment mais
-- n'ont jamais été appliquées en base : aucune migration ne les
-- créait. Conséquence concrète : toute création de salarié avec
-- isDemoData (génération de l'entreprise de démonstration) échouait
-- en base (colonne inexistante), pour 0 salarié créé au final.

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "isDemoData" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_stripeCustomerId_key'
  ) THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_stripeSubscriptionId_key'
  ) THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
  END IF;
END $$;
