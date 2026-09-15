-- RH Pilot — généralisation prudente des variables monétaires.
--
-- Cette version n'invente aucun barème. Les montants sont des valeurs en euros
-- déjà déterminées ou justifiées en amont. La règle décrit uniquement leur
-- classement dans la chaîne de paie : brut, avantage non monétaire,
-- remboursement ou retenue sur net.
--
-- Les heures supplémentaires/complémentaires ne sont acceptées ici qu'en
-- montant brut déjà calculé (EUR). Le calcul automatique depuis un nombre
-- d'heures et un taux de majoration reste volontairement séparé.

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
  'payrule-publicodes-social-2026-france-v4',
  'FR.PAIE.PUBLICODES.SOCIAL',
  4,
  'FRANCE_HORS_MAYOTTE',
  DATE '2026-01-01',
  NULL,
  'RH Pilot — modèle social Publicodes 11.1.0 + traitements monétaires préévalués',
  'https://mon-entreprise.urssaf.fr/documentation/salarié/cotisations',
  '{
    "engine":"PUBLICODES",
    "model":"modele-social",
    "modelVersion":"11.1.0",
    "rules":[],
    "withholdingTaxRate":0,
    "prevaluationRequired":true,
    "variableTreatments":[
      {"code":"ACTIVITY_BONUS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"SENIORITY_BONUS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"YEAR_END_BONUS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"OBJECTIVE_BONUS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"EXCEPTIONAL_BONUS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"SUJETION_BONUS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},

      {"code":"OVERTIME_HOURS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"ADDITIONAL_HOURS","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},

      {"code":"BENEFIT_MEAL","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_HOUSING","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_VEHICLE","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_TECHNOLOGY","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_OTHER","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},

      {"code":"EXPENSE_REAL","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"MEAL_VOUCHER_EMPLOYEE","kind":"DEDUCT_FROM_NET","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]}
    ],
    "absenceTreatments":[
      {"absenceType":"PAID_LEAVE","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"},
      {"absenceType":"RTT","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"}
    ]
  }'::jsonb,
  'VALIDATED'
)
ON CONFLICT ("code", "version", "scope") DO NOTHING;
