-- RH Pilot — Référentiel légal SMIC 2026
-- Sources officielles : Légifrance, décret n° 2025-1228 du 17 décembre 2025
-- et arrêté du 22 mai 2026.
-- Les montants sont stockés comme paramètres versionnés et ne sont pas codés dans le moteur.

INSERT INTO "payroll_rule_versions" (
  "id",
  "code",
  "version",
  "scope",
  "valid_from",
  "valid_until",
  "source_name",
  "source_url",
  "parameters",
  "status"
)
VALUES
(
  'payrule-smic-2026-01-france',
  'FR.SMIC.MONTHLY_GROSS',
  1,
  'FRANCE_HORS_MAYOTTE',
  DATE '2026-01-01',
  DATE '2026-05-31',
  'Décret n° 2025-1228 du 17 décembre 2025',
  'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053042520',
  '{"territory":"METROPOLE_ET_OUTRE_MER_HORS_MAYOTTE","hourlyGrossCents":1202,"monthlyGrossCentsAt35Hours":182303,"monthlyHoursAt35Hours":151.67}'::jsonb,
  'VALIDATED'
),
(
  'payrule-smic-2026-06-france',
  'FR.SMIC.MONTHLY_GROSS',
  2,
  'FRANCE_HORS_MAYOTTE',
  DATE '2026-06-01',
  NULL,
  'Arrêté du 22 mai 2026 relatif au relèvement du salaire minimum de croissance',
  'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054126589',
  '{"territory":"METROPOLE_ET_OUTRE_MER_HORS_MAYOTTE","hourlyGrossCents":1231,"monthlyGrossCentsAt35Hours":186702,"monthlyHoursAt35Hours":151.67}'::jsonb,
  'VALIDATED'
),
(
  'payrule-smic-2026-01-mayotte',
  'FR.SMIC.MONTHLY_GROSS',
  1,
  'MAYOTTE',
  DATE '2026-01-01',
  DATE '2026-05-31',
  'Décret n° 2025-1228 du 17 décembre 2025',
  'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053042520',
  '{"territory":"MAYOTTE","hourlyGrossCents":933,"monthlyGrossCentsAt35Hours":141505,"monthlyHoursAt35Hours":151.67}'::jsonb,
  'VALIDATED'
),
(
  'payrule-smic-2026-06-mayotte',
  'FR.SMIC.MONTHLY_GROSS',
  2,
  'MAYOTTE',
  DATE '2026-06-01',
  NULL,
  'Arrêté du 22 mai 2026 relatif au relèvement du salaire minimum de croissance',
  'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054126589',
  '{"territory":"MAYOTTE","hourlyGrossCents":956,"monthlyGrossCentsAt35Hours":144993,"monthlyHoursAt35Hours":151.67}'::jsonb,
  'VALIDATED'
)
ON CONFLICT ("code", "version", "scope") DO NOTHING;
