-- RH Pilot — variables de paie saisies en montant brut
--
-- Ces traitements autorisent uniquement des montants déjà déterminés en euros
-- et intégrés au brut. RH Pilot ne calcule ici ni la prime elle-même, ni une
-- exonération : l'utilisateur fournit le montant brut, puis Publicodes calcule
-- les cotisations sur le brut résultant.
--
-- Une nouvelle version de règle est créée afin de préserver l'historique : la
-- version 1 reste immuable et la version 2 ajoute les traitements variables.

INSERT INTO "payroll_rule_versions" (
  "id",
  "code",
  "version",
  "scope",
  "validFrom",
  "validUntil",
  "sourceName",
  "sourceUrl",
  "parameters",
  "status"
)
VALUES (
  'payrule-publicodes-social-2026-france-v2',
  'FR.PAIE.PUBLICODES.SOCIAL',
  2,
  'FRANCE_HORS_MAYOTTE',
  DATE '2026-01-01',
  NULL,
  'Mon-entreprise (Urssaf) — modèle social Publicodes 11.1.0 + paramétrage des variables brutes',
  'https://mon-entreprise.urssaf.fr/documentation/salarié/cotisations',
  '{
    "engine":"PUBLICODES",
    "model":"modele-social",
    "modelVersion":"11.1.0",
    "rules":[],
    "withholdingTaxRate":0,
    "variableTreatments":[
      {"code":"ACTIVITY_BONUS","grossEffect":"ADD_TO_GROSS","supportedUnits":["EUR"]},
      {"code":"SENIORITY_BONUS","grossEffect":"ADD_TO_GROSS","supportedUnits":["EUR"]},
      {"code":"YEAR_END_BONUS","grossEffect":"ADD_TO_GROSS","supportedUnits":["EUR"]},
      {"code":"OBJECTIVE_BONUS","grossEffect":"ADD_TO_GROSS","supportedUnits":["EUR"]},
      {"code":"EXCEPTIONAL_BONUS","grossEffect":"ADD_TO_GROSS","supportedUnits":["EUR"]}
    ],
    "absenceTreatments":[
      {"absenceType":"PAID_LEAVE","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"},
      {"absenceType":"RTT","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"}
    ]
  }'::jsonb,
  'VALIDATED'
)
ON CONFLICT ("code", "version", "scope") DO NOTHING;
