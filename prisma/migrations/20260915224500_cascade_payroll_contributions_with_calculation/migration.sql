-- Les cotisations détaillées sont des enfants techniques d'un calcul de paie.
-- Sur une période DRAFT recalculée, un calcul devenu hors périmètre peut être
-- supprimé ; ses cotisations doivent suivre le calcul au lieu de bloquer la
-- transaction. Les bulletins restent volontairement en RESTRICT.

ALTER TABLE "payroll_contributions"
  DROP CONSTRAINT IF EXISTS "payroll_contributions_calculation_fk";

ALTER TABLE "payroll_contributions"
  ADD CONSTRAINT "payroll_contributions_calculation_fk"
  FOREIGN KEY ("calculation_id") REFERENCES "payroll_calculations" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
