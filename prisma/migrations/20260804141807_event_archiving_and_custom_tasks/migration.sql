-- AlterTable
ALTER TABLE "employee_events" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "taskTemplateId" DROP NOT NULL;
