-- CreateEnum
CREATE TYPE "ProfessionalCategory" AS ENUM ('CADRE', 'AGENT_DE_MAITRISE', 'EMPLOYE', 'OUVRIER', 'AUTRE');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "professionalCategory" "ProfessionalCategory";
