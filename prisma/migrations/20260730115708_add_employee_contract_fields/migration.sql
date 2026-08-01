-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDI', 'CDD');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "contractType" "ContractType",
ADD COLUMN     "probationDurationMonths" INTEGER;
