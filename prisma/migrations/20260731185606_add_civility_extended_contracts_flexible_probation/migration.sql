/*
  Warnings:

  - You are about to drop the column `probationDurationMonths` on the `employees` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Civility" AS ENUM ('MME', 'M', 'AUTRE');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractType" ADD VALUE 'APPRENTISSAGE';
ALTER TYPE "ContractType" ADD VALUE 'PROFESSIONNALISATION';

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "probationDurationMonths",
ADD COLUMN     "civility" "Civility",
ADD COLUMN     "probationDuration" INTEGER,
ADD COLUMN     "probationDurationUnit" "DurationUnit";
