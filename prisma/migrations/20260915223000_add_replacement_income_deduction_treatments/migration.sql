-- RH Pilot — complétion prudente des retenues d'absence / revenus de remplacement.
--
-- Ces traitements ne calculent ni IJSS, ni maintien, ni durée d'absence. Ils
-- classent uniquement des montants EUR déjà déterminés par les calculateurs
-- métier versionnés ou par une saisie qualifiée. Aucun barème n'est inventé.

INSERT INTO "payroll_rule_versions" (
  "id", "code", "version", "scope", "validFrom", "validUntil",
  "sourceName", "sourceUrl", "parameters", "status"
)
SELECT
  'payrule-publicodes-social-2026-france-v6',
  "code",
  6,
  "scope",
  "validFrom",
  "validUntil",
  'RH Pilot — Publicodes 11.1.0 + traitements paie préévalués, absences et revenus de remplacement',
  "sourceUrl",
  jsonb_set(
    "parameters",
    '{variableTreatments}',
    COALESCE("parameters"->'variableTreatments', '[]'::jsonb) || '[
      {"code":"SICK_LEAVE","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"WORK_ACCIDENT_ABSENCE","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"MATERNITY_LEAVE","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"PATERNITY_LEAVE","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"ADOPTION_LEAVE","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"UNPAID_LEAVE","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]}
    ]'::jsonb,
    true
  ),
  'VALIDATED'
FROM "payroll_rule_versions"
WHERE "id" = 'payrule-publicodes-social-2026-france-v5'
ON CONFLICT ("code", "version", "scope") DO NOTHING;
