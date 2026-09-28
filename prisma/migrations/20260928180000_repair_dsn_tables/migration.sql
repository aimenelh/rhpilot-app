-- Réparation des tables DSN.
--
-- En production, "dsn_employee_profiles" (et peut-être "dsn_organization_settings")
-- a été créée par une version antérieure de la migration 20260915143000 : Prisma
-- ne rejoue jamais une migration déjà enregistrée, même modifiée ensuite. La table
-- n'a donc pas toutes les colonnes lues par l'application (erreur 42703
-- « column "contractNatureCode" does not exist » sur la fiche DSN d'un salarié).
--
-- Cette migration est idempotente et ne supprime aucune donnée :
-- - elle crée les tables si elles n'existent pas ;
-- - elle ajoute chaque colonne attendue qui manque (sans NOT NULL : d'éventuelles
--   lignes existantes n'ont pas ces valeurs, et l'application les exige à l'enregistrement) ;
-- - elle garantit l'unicité utilisée par les ON CONFLICT des enregistrements ;
-- - elle lève NOT NULL sur les colonnes d'une ancienne version que l'application ne
--   renseigne plus, pour que l'enregistrement ne soit pas refusé ;
-- - elle remet les contrôles de format quand les données existantes le permettent.

CREATE TABLE IF NOT EXISTS "dsn_organization_settings" (
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "dsn_organization_settings_pkey" PRIMARY KEY ("organizationId")
);

ALTER TABLE "dsn_organization_settings"
  ADD COLUMN IF NOT EXISTS "contactName" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultTestMode" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "declaredContactType" TEXT,
  ADD COLUMN IF NOT EXISTS "enterpriseApenCode" TEXT,
  ADD COLUMN IF NOT EXISTS "urssafSiret" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "dsn_employee_profiles" (
  "id" TEXT NOT NULL,
  CONSTRAINT "dsn_employee_profiles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "dsn_employee_profiles"
  ADD COLUMN IF NOT EXISTS "id" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
  ADD COLUMN IF NOT EXISTS "nirCiphertext" TEXT,
  ADD COLUMN IF NOT EXISTS "birthDate" DATE,
  ADD COLUMN IF NOT EXISTS "birthPlace" TEXT,
  ADD COLUMN IF NOT EXISTS "birthDepartment" TEXT,
  ADD COLUMN IF NOT EXISTS "birthCountryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "euClassificationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "addressLine" TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "contractNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "contractNatureCode" TEXT,
  ADD COLUMN IF NOT EXISTS "publicPolicyCode" TEXT DEFAULT '99',
  ADD COLUMN IF NOT EXISTS "pcsEsecCode" TEXT,
  ADD COLUMN IF NOT EXISTS "conventionalStatusCode" TEXT,
  ADD COLUMN IF NOT EXISTS "retirementStatusCode" TEXT,
  ADD COLUMN IF NOT EXISTS "workUnitCode" TEXT DEFAULT '10',
  ADD COLUMN IF NOT EXISTS "referenceWorkQuota" DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "contractWorkQuota" DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "workModalityCode" TEXT,
  ADD COLUMN IF NOT EXISTS "baseSchemeSupplementCode" TEXT,
  ADD COLUMN IF NOT EXISTS "sicknessRegimeCode" TEXT,
  ADD COLUMN IF NOT EXISTS "workLocationId" TEXT,
  ADD COLUMN IF NOT EXISTS "oldAgeRegimeCode" TEXT,
  ADD COLUMN IF NOT EXISTS "foreignWorkerCode" TEXT,
  ADD COLUMN IF NOT EXISTS "employmentStatusCode" TEXT,
  ADD COLUMN IF NOT EXISTS "multipleJobsCode" TEXT,
  ADD COLUMN IF NOT EXISTS "multipleEmployersCode" TEXT,
  ADD COLUMN IF NOT EXISTS "workAccidentRegimeCode" TEXT,
  ADD COLUMN IF NOT EXISTS "workAccidentRiskCode" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
DECLARE
  expected_settings TEXT[] := ARRAY['organizationId', 'contactName', 'contactEmail', 'contactPhone', 'defaultTestMode', 'declaredContactType', 'enterpriseApenCode', 'urssafSiret', 'createdAt', 'updatedAt'];
  expected_profiles TEXT[] := ARRAY['id', 'organizationId', 'employeeId', 'nirCiphertext', 'birthDate', 'birthPlace', 'birthDepartment', 'birthCountryCode',
    'euClassificationCode', 'addressLine', 'postalCode', 'city', 'countryCode', 'contractNumber', 'contractNatureCode', 'publicPolicyCode', 'pcsEsecCode',
    'conventionalStatusCode', 'retirementStatusCode', 'workUnitCode', 'referenceWorkQuota', 'contractWorkQuota', 'workModalityCode', 'baseSchemeSupplementCode',
    'sicknessRegimeCode', 'workLocationId', 'oldAgeRegimeCode', 'foreignWorkerCode', 'employmentStatusCode', 'multipleJobsCode', 'multipleEmployersCode',
    'workAccidentRegimeCode', 'workAccidentRiskCode', 'createdAt', 'updatedAt'];
  obsolete RECORD;
BEGIN
  -- Colonnes d'une ancienne version, obligatoires et sans valeur par défaut : l'application ne les
  -- renseigne pas, elles bloqueraient tout enregistrement. On lève seulement l'obligation.
  FOR obsolete IN
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND is_nullable = 'NO' AND column_default IS NULL
      AND ((table_name = 'dsn_organization_settings' AND NOT (column_name = ANY (expected_settings)))
        OR (table_name = 'dsn_employee_profiles' AND NOT (column_name = ANY (expected_profiles))))
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL', obsolete.table_name, obsolete.column_name);
    EXCEPTION WHEN others THEN
      RAISE NOTICE '%.% : obligation conservée (%).', obsolete.table_name, obsolete.column_name, SQLERRM;
    END;
  END LOOP;

  -- Unicité exigée par ON CONFLICT ("organizationId") et ON CONFLICT ("organizationId", "employeeId").
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid
    WHERE t.relname = 'dsn_organization_settings' AND t.relnamespace = current_schema()::regnamespace AND i.indisunique
      AND (SELECT array_agg(a.attname::TEXT ORDER BY a.attname) FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attnum = ANY (i.indkey)) = ARRAY['organizationId']
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX "dsn_organization_settings_organization_unique_idx" ON "dsn_organization_settings" ("organizationId");
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'dsn_organization_settings : doublons par organisation, index unique non créé.';
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid
    WHERE t.relname = 'dsn_employee_profiles' AND t.relnamespace = current_schema()::regnamespace AND i.indisunique
      AND (SELECT array_agg(a.attname::TEXT ORDER BY a.attname) FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attnum = ANY (i.indkey)) = ARRAY['employeeId', 'organizationId']
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX "dsn_employee_profiles_org_employee_unique_idx" ON "dsn_employee_profiles" ("organizationId", "employeeId");
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'dsn_employee_profiles : doublons par salarié, index unique non créé.';
    END;
  END IF;
END $$;

-- Contrôles de format : ajoutés seulement s'ils manquent et si les données existantes les respectent.
DO $$
DECLARE
  checks TEXT[][] := ARRAY[
    ['dsn_organization_settings', 'dsn_organization_settings_contact_type_check', '"declaredContactType" IS NULL OR "declaredContactType" IN (''01'',''02'',''03'',''04'',''05'',''06'',''07'',''08'',''09'',''13'',''14'',''15'',''16'')'],
    ['dsn_organization_settings', 'dsn_organization_settings_urssaf_siret_check', '"urssafSiret" IS NULL OR "urssafSiret" ~ ''^[0-9]{14}$'''],
    ['dsn_employee_profiles', 'dsn_employee_profiles_nir_ciphertext_check', '"nirCiphertext" IS NULL OR char_length("nirCiphertext") > 20'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_contract_number_check', '"contractNumber" IS NULL OR char_length("contractNumber") BETWEEN 5 AND 20'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_reference_quota_check', '"referenceWorkQuota" IS NULL OR "referenceWorkQuota" > 0'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_contract_quota_check', '"contractWorkQuota" IS NULL OR "contractWorkQuota" > 0'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_birth_country_check', '"birthCountryCode" IS NULL OR "birthCountryCode" ~ ''^[A-Z]{2}$'''],
    ['dsn_employee_profiles', 'dsn_employee_profiles_eu_classification_check', '"euClassificationCode" IS NULL OR "euClassificationCode" IN (''01'',''02'',''03'',''04'')'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_base_scheme_supplement_check', '"baseSchemeSupplementCode" IS NULL OR "baseSchemeSupplementCode" IN (''01'',''02'',''03'',''99'')'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_foreign_worker_check', '"foreignWorkerCode" IS NULL OR "foreignWorkerCode" IN (''01'',''02'',''03'',''99'')'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_employment_status_check', '"employmentStatusCode" IS NULL OR "employmentStatusCode" IN (''01'',''02'',''03'',''04'',''06'',''07'',''08'',''09'',''10'',''11'',''12'',''99'')'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_multiple_jobs_check', '"multipleJobsCode" IS NULL OR "multipleJobsCode" IN (''01'',''02'',''03'')'],
    ['dsn_employee_profiles', 'dsn_employee_profiles_multiple_employers_check', '"multipleEmployersCode" IS NULL OR "multipleEmployersCode" IN (''01'',''02'',''03'')']
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(checks, 1) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = checks[i][2]) THEN
      BEGIN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s)', checks[i][1], checks[i][2], checks[i][3]);
      EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '% : données existantes hors format, contrôle % non ajouté.', checks[i][1], checks[i][2];
      END;
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS "dsn_employee_profiles_lookup_idx" ON "dsn_employee_profiles" ("organizationId", "employeeId");
