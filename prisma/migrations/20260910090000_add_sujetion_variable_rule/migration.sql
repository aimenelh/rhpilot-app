-- RH Pilot — ajout d'un type de variable métier pour les primes de sujétion.
-- Le montant est saisi en euros par l'utilisateur ; aucune formule ni taux
-- n'est inventé ici. Les conditions et éventuelles exonérations restent portées
-- par les règles légales/conventionnelles applicables.

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
  'payrule-publicodes-social-2026-france-v3',
  'FR.PAIE.PUBLICODES.SOCIAL',
  3,
  'FRANCE_HORS_MAYOTTE',
  DATE '2026-01-01',
  NULL,
  'Mon-entreprise (Urssaf) — modèle social Publicodes 11.1.0 + paramétrage des variables brutes et sujétions',
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
      {"code":"EXCEPTIONAL_BONUS","grossEffect":"ADD_TO_GROSS","supportedUnits":["EUR"]},
      {"code":"SUJETION_BONUS","grossEffect":"ADD_TO_GROSS","supportedUnits":["EUR"]}
    ],
    "absenceTreatments":[
      {"absenceType":"PAID_LEAVE","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"},
      {"absenceType":"RTT","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"}
    ]
  }'::jsonb,
  'VALIDATED'
)
ON CONFLICT ("code", "version", "scope") DO NOTHING;
