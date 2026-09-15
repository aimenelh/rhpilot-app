-- Les cotisations détaillées sont des enfants techniques d'un calcul de paie.
-- Sur une période DRAFT recalculée, un calcul devenu hors périmètre peut être
-- supprimé ; ses cotisations doivent suivre le calcul au lieu de bloquer la
-- transaction. Les bulletins restent volontairement en RESTRICT.
--
-- Les colonnes du socle paie ont été renommées en camelCase par la migration
-- 20260906195500_align_payroll_columns_with_prisma : la FK doit donc viser
-- "calculationId" et non l'ancien nom "calculation_id".

ALTER TABLE "payroll_contributions"
  DROP CONSTRAINT IF EXISTS "payroll_contributions_calculation_fk";

ALTER TABLE "payroll_contributions"
  ADD CONSTRAINT "payroll_contributions_calculation_fk"
  FOREIGN KEY ("calculationId") REFERENCES "payroll_calculations" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
