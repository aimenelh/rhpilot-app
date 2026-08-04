-- CreateEnum
CREATE TYPE "OverrideAction" AS ENUM ('MODIFIED', 'REMOVED');

-- CreateTable
CREATE TABLE "task_template_overrides" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "action" "OverrideAction" NOT NULL,
    "label" TEXT,
    "dueOffsetDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_template_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_template_overrides_organizationId_idx" ON "task_template_overrides"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "task_template_overrides_organizationId_taskTemplateId_key" ON "task_template_overrides"("organizationId", "taskTemplateId");

-- AddForeignKey
ALTER TABLE "task_template_overrides" ADD CONSTRAINT "task_template_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_template_overrides" ADD CONSTRAINT "task_template_overrides_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "task_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
