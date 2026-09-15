-- RH Pilot — traitements versionnés pour les éléments désormais calculables.
--
-- Aucun barème n'est recalculé dans cette migration. Les montants EUR doivent
-- provenir d'un calculateur métier déterministe/sourcé (heures, avantages,
-- frais, congés, mois incomplet, IJSS/subrogation, fin de contrat) ou d'une
-- saisie qualifiée explicitement comme montant déjà déterminé.

INSERT INTO "payroll_rule_versions" (
  "id", "code", "version", "scope", "validFrom", "validUntil",
  "sourceName", "sourceUrl", "parameters", "status"
)
VALUES (
  'payrule-publicodes-social-2026-france-v5',
  'FR.PAIE.PUBLICODES.SOCIAL',
  5,
  'FRANCE_HORS_MAYOTTE',
  DATE '2026-01-01',
  NULL,
  'RH Pilot — Publicodes 11.1.0 + traitements paie préévalués et versionnés',
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
      {"code":"INCOMPLETE_MONTH","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},

      {"code":"PAID_LEAVE_ABSENCE","kind":"DEDUCT_FROM_GROSS","grossEffect":"SUBTRACT_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"PAID_LEAVE_INDEMNITY","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"SICK_PAY_MAINTENANCE","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"IJSS_SUBROGATED","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},

      {"code":"BENEFIT_MEAL","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_HOUSING","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_VEHICLE","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_TECHNOLOGY","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"BENEFIT_OTHER","kind":"NON_CASH","grossEffect":"ADD_TO_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},

      {"code":"EXPENSE_REAL","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"EXPENSE_MEAL","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"EXPENSE_KILOMETRIC","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"EXPENSE_TRAVEL","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"EXPENSE_HOTEL","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"PUBLIC_TRANSPORT","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"SUSTAINABLE_MOBILITY","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},
      {"code":"TRANSPORT_ALLOWANCE","kind":"REIMBURSEMENT","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"ADD_TO_NET","supportedUnits":["EUR"]},

      {"code":"MEAL_VOUCHER_EMPLOYEE","kind":"DEDUCT_FROM_NET","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]},
      {"code":"MEAL_VOUCHER_EMPLOYER","kind":"INFORMATIONAL","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},

      {"code":"CDD_END_ALLOWANCE","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"PAID_LEAVE_COMPENSATION","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"NOTICE_COMPENSATION","kind":"ADD_TO_GROSS","grossEffect":"ADD_TO_GROSS","netEffect":"NONE","supportedUnits":["EUR"]},
      {"code":"OTHER_NET_DEDUCTION","kind":"DEDUCT_FROM_NET","grossEffect":"EXCLUDE_FROM_GROSS","netEffect":"SUBTRACT_FROM_NET","supportedUnits":["EUR"]}
    ],
    "absenceTreatments":[
      {"absenceType":"PAID_LEAVE","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"},
      {"absenceType":"RTT","effect":"EXCLUDE_FROM_GROSS","basis":"NONE"}
    ]
  }'::jsonb,
  'VALIDATED'
)
ON CONFLICT ("code", "version", "scope") DO NOTHING;
