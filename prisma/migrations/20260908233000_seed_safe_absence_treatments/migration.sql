-- RH Pilot — traitements d'absence non ambigus pour le calcul de paie
--
-- Ces règles couvrent uniquement les situations dont l'effet sur le salaire
-- mensuel est explicite sans inventer de maintien de salaire :
-- - congés payés / RTT : pas de diminution du brut mensuel dans ce MVP ;
-- - absence sans solde : retenue sur salaire, calculée sur les jours calendaires.
--
-- Les arrêts maladie et accidents restent volontairement hors de ce jeu de
-- règles tant que les données d'indemnisation (IJ, prévoyance, maintien
-- conventionnel, ancienneté, carence, etc.) ne sont pas modélisées.

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
    },
    {
      "absenceType": "UNPAID_LEAVE",
      "effect": "SUBTRACT_FROM_GROSS",
      "basis": "CALENDAR_DAYS",
      "divisor": 30,
      "rate": 1
    }
  ]'::jsonb,
  true
)
WHERE "code" = 'FR.PAIE.PUBLICODES.SOCIAL'
  AND "version" = 1
  AND "scope" = 'FRANCE_HORS_MAYOTTE'
  AND "status" = 'VALIDATED';
