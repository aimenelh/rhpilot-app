-- RH Pilot — traitements d'absence non ambigus pour le calcul de paie
--
-- Ces règles couvrent uniquement les situations dont l'effet sur le salaire
-- mensuel est explicite sans inventer de maintien de salaire :
-- - congés payés / RTT : pas de diminution du brut mensuel dans ce MVP.
--
-- Les arrêts maladie, accidents et absences sans solde restent volontairement
-- hors de ce jeu de règles tant que leur base de retenue et, le cas échéant,
-- leurs mécanismes d'indemnisation ne sont pas modélisés et sourcés.

UPDATE "payroll_rule_versions"
SET "parameters" = jsonb_set(
  "parameters",
  '{absenceTreatments}',
  '[
    {
      "absenceType": "PAID_LEAVE",
      "effect": "EXCLUDE_FROM_GROSS",
      "basis": "NONE"
    },
    {
      "absenceType": "RTT",
      "effect": "EXCLUDE_FROM_GROSS",
      "basis": "NONE"
    }
  ]'::jsonb,
  true
)
WHERE "code" = 'FR.PAIE.PUBLICODES.SOCIAL'
  AND "version" = 1
  AND "scope" = 'FRANCE_HORS_MAYOTTE'
  AND "status" = 'VALIDATED';
