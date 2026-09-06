-- RH Pilot — Classification conventionnelle du profil paie
-- Ces champs sont des données de situation du salarié, pas des règles.

ALTER TABLE "payroll_profiles"
  ADD COLUMN "classification_code" TEXT,
  ADD COLUMN "classification_label" TEXT,
  ADD COLUMN "level" TEXT,
  ADD COLUMN "coefficient" TEXT,
  ADD COLUMN "seniority_date" TIMESTAMP(3);
