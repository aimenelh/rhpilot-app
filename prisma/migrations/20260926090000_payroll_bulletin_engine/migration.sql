-- Moteur de bulletin RH Pilot : paramètres de paie de l'entreprise et du
-- salarié, reprise des compteurs et des cumuls, solde de tout compte.

-- Congés maternité et paternité (IJSS, plafond, DSN).
ALTER TYPE public."AbsenceType" ADD VALUE IF NOT EXISTS 'MATERNITY';
ALTER TYPE public."AbsenceType" ADD VALUE IF NOT EXISTS 'PATERNITY';

-- Paramètres de paie de l'entreprise.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "payrollHeadcount" INTEGER;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mobilityRate" DECIMAL(6,3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "ijssSubrogation" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "paidLeaveMethod" TEXT NOT NULL DEFAULT 'OUVRABLES';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "workedSolidarityDay" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "prevoyanceRates" JSONB;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mealVoucherFaceValue" DECIMAL(8,2);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mealVoucherEmployerShare" DECIMAL(5,4);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "transportEmployerShare" DECIMAL(5,4) NOT NULL DEFAULT 0.5;

DO $$
BEGIN
  BEGIN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_payroll_settings_check" CHECK (
      ("payrollHeadcount" IS NULL OR "payrollHeadcount" >= 1)
      AND ("mobilityRate" IS NULL OR ("mobilityRate" >= 0 AND "mobilityRate" <= 3.2))
      AND "paidLeaveMethod" IN ('OUVRABLES', 'OUVRES')
      AND ("mealVoucherFaceValue" IS NULL OR "mealVoucherFaceValue" > 0)
      AND ("mealVoucherEmployerShare" IS NULL OR ("mealVoucherEmployerShare" >= 0.5 AND "mealVoucherEmployerShare" <= 0.6))
      AND ("transportEmployerShare" >= 0.5 AND "transportEmployerShare" <= 1)
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Horaire hebdomadaire et heures supplémentaires structurelles du salarié.
ALTER TABLE "payroll_profiles" ADD COLUMN IF NOT EXISTS "weeklySchedule" JSONB;
ALTER TABLE "payroll_profiles" ADD COLUMN IF NOT EXISTS "structuralOvertimeHours" DECIMAL(8,2);
ALTER TABLE "payroll_profiles" ADD COLUMN IF NOT EXISTS "structuralOvertimeRate" DECIMAL(5,4);
-- Dispense d'adhésion à la complémentaire santé (justificatif conservé par l'employeur).
ALTER TABLE "payroll_profiles" ADD COLUMN IF NOT EXISTS "healthPlanWaiver" BOOLEAN NOT NULL DEFAULT false;

-- Rattachement d'une variable à une absence (montant d'IJSS de l'attestation).
ALTER TABLE "payroll_variables" ADD COLUMN IF NOT EXISTS "reference" TEXT;

-- Reprise des compteurs de congés payés.
CREATE TABLE IF NOT EXISTS "employee_paid_leave_openings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "asOf" DATE NOT NULL,
  "previousAcquired" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "previousTaken" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "currentAcquired" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "currentTaken" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "referenceGross" DECIMAL(12,2),
  "referenceAcquiredDays" DECIMAL(6,2),
  "currentReferenceGross" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_paid_leave_openings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_paid_leave_openings_employee_fk" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_paid_leave_openings_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_paid_leave_openings_values_check" CHECK (
    "previousAcquired" >= 0 AND "previousTaken" >= 0 AND "currentAcquired" >= 0 AND "currentTaken" >= 0
    AND ("referenceGross" IS NULL OR "referenceGross" >= 0)
    AND ("referenceAcquiredDays" IS NULL OR "referenceAcquiredDays" >= 0)
    AND ("currentReferenceGross" IS NULL OR "currentReferenceGross" >= 0)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS "employee_paid_leave_openings_unique" ON "employee_paid_leave_openings" ("organizationId", "employeeId", "asOf");

-- Reprise des cumuls annuels (bases plafonnées, RGDU, net imposable…) arrêtés à la fin d'un mois.
CREATE TABLE IF NOT EXISTS "employee_payroll_openings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "throughMonth" INTEGER NOT NULL,
  "cumuls" JSONB NOT NULL,
  "sickPayHistory" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_payroll_openings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_payroll_openings_employee_fk" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_payroll_openings_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_payroll_openings_month_check" CHECK ("throughMonth" BETWEEN 1 AND 11)
);
CREATE UNIQUE INDEX IF NOT EXISTS "employee_payroll_openings_unique" ON "employee_payroll_openings" ("organizationId", "employeeId", "year");

-- Solde de tout compte saisi sur la période de sortie.
CREATE TABLE IF NOT EXISTS "payroll_terminations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "payrollPeriodId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "noticeCompensation" DECIMAL(12,2),
  "severanceAmount" DECIMAL(12,2),
  "severanceLegalMinimum" DECIMAL(12,2),
  "previousYearGross" DECIMAL(12,2),
  "eligibleForFullPension" BOOLEAN NOT NULL DEFAULT false,
  "cddEndAllowanceMode" TEXT NOT NULL DEFAULT 'AUTO',
  "cddEndAllowanceAmount" DECIMAL(12,2),
  "cddEndAllowanceRate" DECIMAL(5,4),
  "paidLeaveCompensationAmount" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_terminations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_terminations_period_fk" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payroll_terminations_employee_fk" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payroll_terminations_reason_check" CHECK ("reason" IN ('DEMISSION', 'LICENCIEMENT', 'RUPTURE_CONVENTIONNELLE', 'FIN_CDD', 'FIN_PERIODE_ESSAI', 'MISE_A_LA_RETRAITE', 'DEPART_RETRAITE', 'AUTRE')),
  CONSTRAINT "payroll_terminations_cdd_mode_check" CHECK ("cddEndAllowanceMode" IN ('AUTO', 'NONE', 'AMOUNT')),
  CONSTRAINT "payroll_terminations_amounts_check" CHECK (
    ("noticeCompensation" IS NULL OR "noticeCompensation" >= 0)
    AND ("severanceAmount" IS NULL OR "severanceAmount" >= 0)
    AND ("severanceLegalMinimum" IS NULL OR "severanceLegalMinimum" >= 0)
    AND ("previousYearGross" IS NULL OR "previousYearGross" >= 0)
    AND ("cddEndAllowanceAmount" IS NULL OR "cddEndAllowanceAmount" >= 0)
    AND ("paidLeaveCompensationAmount" IS NULL OR "paidLeaveCompensationAmount" >= 0)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_terminations_unique" ON "payroll_terminations" ("organizationId", "payrollPeriodId", "employeeId");

-- Les réductions (RGDU, heures supplémentaires) et la régularisation progressive des tranches
-- produisent des montants et des assiettes négatifs ; une paie peut aussi, rarement, dégager
-- des cotisations patronales nettes négatives (apprenti, heures supplémentaires).
ALTER TABLE "payroll_contributions" DROP CONSTRAINT IF EXISTS "payroll_contributions_amount_check";
ALTER TABLE "payroll_calculations" DROP CONSTRAINT IF EXISTS "payroll_calculations_non_negative_check";
DO $$
BEGIN
  BEGIN
    ALTER TABLE "payroll_calculations" ADD CONSTRAINT "payroll_calculations_amounts_check" CHECK ("grossAmount" >= 0 AND "withholdingTax" >= 0);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
