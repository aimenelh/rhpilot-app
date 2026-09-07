-- RH Pilot — règle de calcul paie basée sur le modèle social officiel
--
-- Cette règle ne contient aucun taux social en dur.
-- Elle sert à versionner et autoriser l'orchestration du calcul Publicodes.
-- Les cotisations, bases, plafonds, exonérations et montants sont calculés
-- par le package officiel modele-social déjà intégré dans RH Pilot.
-- Le prélèvement à la source reste à zéro tant qu'aucun taux PAS DGFIP
-- n'est fourni pour le salarié ; aucun taux n'est donc inventé.

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
  'payrule-publicodes-social-2026-france-v1',
  'FR.PAIE.PUBLICODES.SOCIAL',
  1,
  'FRANCE_HORS_MAYOTTE',
  DATE '2026-01-01',
  NULL,
  'Mon-entreprise (Urssaf) — modèle social Publicodes 11.1.0',
  'https://mon-entreprise.urssaf.fr/documentation/salarié/cotisations',
  '{"engine":"PUBLICODES","model":"modele-social","modelVersion":"11.1.0","rules":[],"withholdingTaxRate":0,"variableTreatments":[],"absenceTreatments":[]}'::jsonb,
  'VALIDATED'
)
ON CONFLICT ("code", "version", "scope") DO NOTHING;
