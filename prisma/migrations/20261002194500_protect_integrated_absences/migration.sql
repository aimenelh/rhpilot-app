-- Une paie validée fige les faits RH utilisés. Seule une reprise nouvelle,
-- postérieure aux paies clôturées, peut compléter un arrêt intégré.
UPDATE "absences" a SET "payrollImpactStatus" = 'INTEGRATED'
WHERE a."status" = 'VALIDATED' AND a."payrollImpactStatus" = 'READY' AND EXISTS (
  SELECT 1 FROM "payroll_calculations" c JOIN "payroll_periods" p
    ON p."organizationId" = c."organizationId" AND p."id" = c."payrollPeriodId"
  WHERE c."organizationId" = a."organizationId" AND c."employeeId" = a."employeeId"
    AND p."status" IN ('VALIDATED', 'LOCKED')
    AND c."calculationSnapshot" -> 'validatedAbsences' @> jsonb_build_array(jsonb_build_object('absenceId', a."id"))
);

CREATE FUNCTION "protect_integrated_absence"() RETURNS trigger AS $$
BEGIN
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

CREATE TRIGGER "absences_protect_integrated" BEFORE UPDATE OR DELETE ON "absences"
FOR EACH ROW EXECUTE FUNCTION "protect_integrated_absence"();
