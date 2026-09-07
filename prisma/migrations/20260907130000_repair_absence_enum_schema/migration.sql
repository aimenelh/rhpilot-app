-- The absence migration created PostgreSQL enum types without an explicit schema.
-- Production expects the Prisma enum types in public. Normalize them explicitly.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'AbsenceType'
  ) THEN
    CREATE TYPE public."AbsenceType" AS ENUM (
      'PAID_LEAVE', 'RTT', 'SICK_LEAVE', 'WORK_ACCIDENT',
      'UNPAID_LEAVE', 'FAMILY_EVENT', 'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'AbsenceStatus'
  ) THEN
    CREATE TYPE public."AbsenceStatus" AS ENUM (
      'TO_VALIDATE', 'TO_PROVIDE_JUSTIFICATION',
      'TO_REVIEW_JUSTIFICATION', 'VALIDATED', 'REJECTED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'JustificationStatus'
  ) THEN
    CREATE TYPE public."JustificationStatus" AS ENUM (
      'TO_PROVIDE', 'RECEIVED', 'VALIDATED', 'REJECTED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'PayrollImpactStatus'
  ) THEN
    CREATE TYPE public."PayrollImpactStatus" AS ENUM (
      'PENDING', 'READY', 'INTEGRATED'
    );
  END IF;
END $$;

ALTER TABLE public."absences"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "payrollImpactStatus" DROP DEFAULT;

ALTER TABLE public."absences"
  ALTER COLUMN "type" TYPE public."AbsenceType"
    USING "type"::text::public."AbsenceType",
  ALTER COLUMN "status" TYPE public."AbsenceStatus"
    USING "status"::text::public."AbsenceStatus",
  ALTER COLUMN "payrollImpactStatus" TYPE public."PayrollImpactStatus"
    USING "payrollImpactStatus"::text::public."PayrollImpactStatus";

ALTER TABLE public."absences"
  ALTER COLUMN "status" SET DEFAULT 'TO_VALIDATE'::public."AbsenceStatus",
  ALTER COLUMN "payrollImpactStatus" SET DEFAULT 'PENDING'::public."PayrollImpactStatus";

ALTER TABLE public."absence_justifications"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE public."absence_justifications"
  ALTER COLUMN "status" TYPE public."JustificationStatus"
    USING "status"::text::public."JustificationStatus";

ALTER TABLE public."absence_justifications"
  ALTER COLUMN "status" SET DEFAULT 'TO_PROVIDE'::public."JustificationStatus";
