CREATE TABLE "absences" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TO_VALIDATE',
  "justificationRequired" BOOLEAN NOT NULL DEFAULT false,
  "payrollImpactStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "validatedByUserId" TEXT,
  "validatedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "absences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "absences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "absences_employee_fkey" FOREIGN KEY ("organizationId", "employeeId") REFERENCES "employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "absences_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "absences_organizationId_startDate_endDate_idx" ON "absences"("organizationId", "startDate", "endDate");
CREATE INDEX "absences_organizationId_employeeId_startDate_idx" ON "absences"("organizationId", "employeeId", "startDate");
CREATE INDEX "absences_organizationId_status_idx" ON "absences"("organizationId", "status");

CREATE TABLE "absence_justifications" (
  "id" TEXT NOT NULL,
  "absenceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TO_PROVIDE',
  "storageKey" TEXT,
  "fileName" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "uploadedByUserId" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "absence_justifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "absence_justifications_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "absences"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "absence_justifications_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "absence_justifications_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "absence_justifications_absenceId_status_idx" ON "absence_justifications"("absenceId", "status");
CREATE INDEX "absence_justifications_reviewedByUserId_reviewedAt_idx" ON "absence_justifications"("reviewedByUserId", "reviewedAt");
