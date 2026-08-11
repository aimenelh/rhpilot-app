-- CreateTable
CREATE TABLE "diagnostic_responses" (
    "id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "riskAreas" TEXT[],
    "email" TEXT,
    "companySize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnostic_responses_createdAt_idx" ON "diagnostic_responses"("createdAt");
