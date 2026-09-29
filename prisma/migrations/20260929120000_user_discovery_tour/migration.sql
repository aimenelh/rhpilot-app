-- Visite de découverte vue ou passée : mémorisée sur le compte, pour ne pas la
-- rejouer à chaque nouvel appareil ou navigateur.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "discoveryTourCompletedAt" TIMESTAMP(3);
