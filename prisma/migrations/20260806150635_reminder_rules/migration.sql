-- CreateTable
CREATE TABLE "reminder_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "daysBeforeDue" INTEGER NOT NULL,
    "notifyAssignee" BOOLEAN NOT NULL DEFAULT true,
    "notifyManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminder_rules_organizationId_idx" ON "reminder_rules"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_rules_organizationId_daysBeforeDue_key" ON "reminder_rules"("organizationId", "daysBeforeDue");

-- AddForeignKey
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
