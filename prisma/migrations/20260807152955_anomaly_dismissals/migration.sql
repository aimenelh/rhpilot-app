-- CreateTable
CREATE TABLE "anomaly_dismissals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "anomalyKey" TEXT NOT NULL,
    "snoozedUntil" TIMESTAMP(3),
    "dismissedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anomaly_dismissals_organizationId_idx" ON "anomaly_dismissals"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_dismissals_organizationId_anomalyKey_key" ON "anomaly_dismissals"("organizationId", "anomalyKey");

-- AddForeignKey
ALTER TABLE "anomaly_dismissals" ADD CONSTRAINT "anomaly_dismissals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_dismissals" ADD CONSTRAINT "anomaly_dismissals_dismissedByUserId_fkey" FOREIGN KEY ("dismissedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
