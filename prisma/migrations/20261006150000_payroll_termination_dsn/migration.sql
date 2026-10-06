-- Fin de contrat en DSN mensuelle : motif S21.G00.62.002, dates de la rupture, préavis
-- S21.G00.63 et part légale de l'indemnité. Saisis dans la fiche de sortie, figés au calcul.
ALTER TABLE "payroll_terminations"
  ADD COLUMN "dsnEndReasonCode" VARCHAR(3),
  ADD COLUMN "notificationDate" DATE,
  ADD COLUMN "conventionSignatureDate" DATE,
  ADD COLUMN "dismissalProcedureDate" DATE,
  ADD COLUMN "lastWorkedPaidDate" DATE,
  ADD COLUMN "noticeTypeCode" VARCHAR(2),
  ADD COLUMN "noticeStartDate" DATE,
  ADD COLUMN "noticeEndDate" DATE,
  ADD COLUMN "transactionPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "legalSeveranceAmount" DECIMAL(12, 2);

ALTER TABLE "payroll_terminations"
  ADD CONSTRAINT "payroll_terminations_dsn_end_reason_check"
    CHECK ("dsnEndReasonCode" IS NULL OR "dsnEndReasonCode" IN ('059', '031', '081', '084', '036', '037', '034', '035', '020', '087', '088', '091', '043', '038', '039', '058', '066')),
  ADD CONSTRAINT "payroll_terminations_notice_type_check"
    CHECK ("noticeTypeCode" IS NULL OR "noticeTypeCode" IN ('01', '02', '03', '60', '90')),
  ADD CONSTRAINT "payroll_terminations_notice_order_check"
    CHECK ("noticeStartDate" IS NULL OR "noticeEndDate" IS NULL OR "noticeEndDate" >= "noticeStartDate"),
  ADD CONSTRAINT "payroll_terminations_legal_severance_check"
    CHECK ("legalSeveranceAmount" IS NULL OR "legalSeveranceAmount" >= 0);
