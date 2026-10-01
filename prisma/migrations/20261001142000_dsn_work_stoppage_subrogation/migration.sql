ALTER TABLE "absences"
  ADD COLUMN "lastWorkedDate" DATE,
  ADD COLUMN "subrogationStartDate" DATE,
  ADD COLUMN "subrogationEndDate" DATE,
  ADD COLUMN "workAccidentDate" DATE,
  ADD COLUMN "returnDate" DATE,
  ADD COLUMN "returnReasonCode" TEXT;

ALTER TABLE "dsn_organization_settings"
  ADD COLUMN "subrogationIbanCiphertext" TEXT,
  ADD COLUMN "subrogationBic" TEXT;

ALTER TABLE "absences"
  ADD CONSTRAINT "absences_subrogation_dates_check"
  CHECK (
    ("subrogationStartDate" IS NULL AND "subrogationEndDate" IS NULL)
    OR (
      "subrogationStartDate" IS NOT NULL
      AND "subrogationEndDate" IS NOT NULL
      AND "subrogationEndDate" >= "subrogationStartDate"
    )
  );

ALTER TABLE "absences"
  ADD CONSTRAINT "absences_return_reason_check"
  CHECK ("returnReasonCode" IS NULL OR "returnReasonCode" IN ('01', '02', '03'));
