-- Remise à zéro de la paie d'une organisation de démonstration.
--
-- Les archives DSN et les absences intégrées à une paie restent immuables. Seule
-- exception : la transaction de remise à zéro, qui déclare l'organisation visée
-- (set_config local à la transaction) et uniquement si cette organisation ne
-- contient que des salariés fictifs générés par RH Pilot.
CREATE OR REPLACE FUNCTION "demo_payroll_reset_allowed"(org TEXT) RETURNS boolean AS $$
  SELECT COALESCE(current_setting('rhpilot.demo_payroll_reset', true), '') = org
     AND EXISTS (SELECT 1 FROM "employees" e WHERE e."organizationId" = org AND e."deletedAt" IS NULL)
     AND NOT EXISTS (SELECT 1 FROM "employees" e WHERE e."organizationId" = org AND e."deletedAt" IS NULL AND e."isDemoData" = false);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION "prevent_dsn_declaration_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND "demo_payroll_reset_allowed"(OLD."organizationId") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Une archive DSN est immuable : créez une nouvelle version.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "protect_integrated_absence"() RETURNS trigger AS $$
BEGIN
  IF "demo_payroll_reset_allowed"(OLD."organizationId") THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF OLD."payrollImpactStatus" <> 'INTEGRATED' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Une absence intégrée à la paie ne peut pas être supprimée';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['returnDate', 'returnReasonCode', 'updatedAt']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['returnDate', 'returnReasonCode', 'updatedAt']) THEN
    RAISE EXCEPTION 'Les faits d''une absence intégrée à la paie sont figés';
  END IF;
  IF NEW."returnDate" IS NOT DISTINCT FROM OLD."returnDate" AND
     NEW."returnReasonCode" IS NOT DISTINCT FROM OLD."returnReasonCode" THEN RETURN NEW; END IF;
  IF OLD."returnDate" IS NOT NULL OR OLD."returnReasonCode" IS NOT NULL OR
     NEW."returnDate" IS NULL OR NEW."returnReasonCode" IS NULL OR NEW."returnReasonCode" NOT IN ('01', '03') OR
     OLD."type" NOT IN ('SICK_LEAVE', 'WORK_ACCIDENT', 'MATERNITY', 'PATERNITY') OR
     OLD."status" <> 'VALIDATED' OR NEW."returnDate" <= OLD."startDate" OR NEW."returnDate" > OLD."endDate" + 1 THEN
    RAISE EXCEPTION 'La reprise d''un arrêt intégré ne peut pas être remplacée ou être incohérente';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "payroll_periods" p
    JOIN "payroll_calculations" c ON c."organizationId" = p."organizationId" AND c."payrollPeriodId" = p."id"
    WHERE p."organizationId" = OLD."organizationId" AND c."employeeId" = OLD."employeeId"
      AND p."status" IN ('VALIDATED', 'LOCKED')
      AND NEW."returnDate" <= (make_date(p."year", p."month", 1) + INTERVAL '1 month' - INTERVAL '1 day')::date
  ) THEN RAISE EXCEPTION 'Une reprise dans une paie clôturée nécessite une régularisation'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
