-- RH Pilot — premier référentiel de minima conventionnels vérifiés sur source officielle.
-- Convention : Bureaux d'études techniques, cabinets d'ingénieurs-conseils
-- et sociétés de conseils (IDCC 1486).
-- Source : Légifrance, Accord du 26 juin 2024 relatif aux salaires minimaux
-- (Annexe III), IDCC 1486, étendu par arrêté du 8 novembre 2024.
-- L'accord prend effet au plus tôt le 1er janvier 2025 et remplace les accords
-- de branche antérieurs sur les minima hiérarchiques.
-- Les montants sont stockés comme données de référentiel : aucune formule
-- juridique n'est déduite par le moteur.

INSERT INTO "collective_agreements" (
  "id", "idcc", "name", "sourceName", "sourceUrl", "status"
)
VALUES (
  'ccn-1486-syntec',
  '1486',
  'Bureaux d''études techniques, cabinets d''ingénieurs-conseils et sociétés de conseils',
  'Légifrance',
  'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/',
  'ACTIVE'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "collective_agreement_versions" (
  "id", "collectiveAgreementId", "version", "validFrom", "validUntil",
  "sourceName", "sourceUrl", "sourceReference", "status"
)
VALUES (
  'ccn-1486-v1',
  'ccn-1486-syntec',
  1,
  DATE '2025-01-01',
  NULL,
  'Légifrance',
  'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/',
  'Accord du 26 juin 2024 relatif aux salaires minimaux (Annexe III), IDCC 1486',
  'VALIDATED'
)
ON CONFLICT ("collectiveAgreementId", "version") DO NOTHING;

INSERT INTO "collective_agreement_rules" (
  "id", "versionId", "code", "category", "parameters",
  "sourceReference", "sourceUrl", "validFrom", "validUntil", "status"
)
VALUES
  ('ccn-1486-v1-etam-1-1', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_1.1', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_1.1","monthlyMinimumCents":181500,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 1.1, coefficient 240"}'::jsonb, 'Annexe — ETAM 1.1 / coefficient 240', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-etam-1-2', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_1.2', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_1.2","monthlyMinimumCents":184500,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 1.2, coefficient 250"}'::jsonb, 'Annexe — ETAM 1.2 / coefficient 250', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-etam-2-1', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_2.1', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_2.1","monthlyMinimumCents":187500,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 2.1, coefficient 275"}'::jsonb, 'Annexe — ETAM 2.1 / coefficient 275', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-etam-2-2', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_2.2', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_2.2","monthlyMinimumCents":190500,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 2.2, coefficient 310"}'::jsonb, 'Annexe — ETAM 2.2 / coefficient 310', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-etam-2-3', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_2.3', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_2.3","monthlyMinimumCents":204500,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 2.3, coefficient 355"}'::jsonb, 'Annexe — ETAM 2.3 / coefficient 355', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-etam-3-1', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_3.1', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_3.1","monthlyMinimumCents":218500,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 3.1, coefficient 400"}'::jsonb, 'Annexe — ETAM 3.1 / coefficient 400', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-etam-3-2', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_3.2', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_3.2","monthlyMinimumCents":234000,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 3.2, coefficient 450"}'::jsonb, 'Annexe — ETAM 3.2 / coefficient 450', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-etam-3-3', 'ccn-1486-v1', 'MINIMUM_SALARY_ETAM_3.3', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"ETAM_3.3","monthlyMinimumCents":249000,"sourceReference":"Annexe — Salaires minimaux des ETAM, position 3.3, coefficient 500"}'::jsonb, 'Annexe — ETAM 3.3 / coefficient 500', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-1-1', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_1.1', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_1.1","monthlyMinimumCents":213500,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 1.1, coefficient 95"}'::jsonb, 'Annexe — IC 1.1 / coefficient 95', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-1-2', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_1.2', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_1.2","monthlyMinimumCents":224000,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 1.2, coefficient 100"}'::jsonb, 'Annexe — IC 1.2 / coefficient 100', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-2-1-lt26', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_2.1_LT26', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_2.1_LT26","monthlyMinimumCents":231500,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 2.1, coefficient 105"}'::jsonb, 'Annexe — IC 2.1 / coefficient 105', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-2-1-ge26', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_2.1_GE26', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_2.1_GE26","monthlyMinimumCents":253000,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 2.1, coefficient 115"}'::jsonb, 'Annexe — IC 2.1 / coefficient 115', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-2-2', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_2.2', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_2.2","monthlyMinimumCents":285000,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 2.2, coefficient 130"}'::jsonb, 'Annexe — IC 2.2 / coefficient 130', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-2-3', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_2.3', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_2.3","monthlyMinimumCents":327500,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 2.3, coefficient 150"}'::jsonb, 'Annexe — IC 2.3 / coefficient 150', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-3-1', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_3.1', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_3.1","monthlyMinimumCents":365000,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 3.1, coefficient 170"}'::jsonb, 'Annexe — IC 3.1 / coefficient 170', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-3-2', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_3.2', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_3.2","monthlyMinimumCents":449500,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 3.2, coefficient 210"}'::jsonb, 'Annexe — IC 3.2 / coefficient 210', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED'),
  ('ccn-1486-v1-ic-3-3', 'ccn-1486-v1', 'MINIMUM_SALARY_IC_3.3', 'SALARY_MINIMUM', '{"ruleType":"MINIMUM_GROSS_MONTHLY","classificationCode":"IC_3.3","monthlyMinimumCents":575500,"sourceReference":"Annexe — Salaires minimaux des ingénieurs et cadres, position 3.3, coefficient 270"}'::jsonb, 'Annexe — IC 3.3 / coefficient 270', 'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000050228699/', DATE '2025-01-01', NULL, 'VALIDATED');
