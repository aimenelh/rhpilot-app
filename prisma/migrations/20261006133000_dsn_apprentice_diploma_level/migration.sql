-- Apprentis : niveau de diplôme préparé (S21.G00.30.025), obligatoire en DSN pour les
-- dispositifs 64, 65 et 81 (Dsn-Val S21.G00.30.025/CCH-11). Nomenclature P26V01 : 03 à 08.
ALTER TABLE "dsn_employee_profiles" ADD COLUMN "preparedDiplomaLevel" VARCHAR(2);
ALTER TABLE "dsn_employee_profiles" ADD CONSTRAINT "dsn_employee_profiles_prepared_diploma_level_check"
  CHECK ("preparedDiplomaLevel" IS NULL OR "preparedDiplomaLevel" IN ('03', '04', '05', '06', '07', '08'));
