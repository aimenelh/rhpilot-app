"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ProfessionalCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMemberships } from "@/lib/auth";

const DEMO_PAYROLL_DATA = [
  { firstName: "Antoine", professionalCategory: ProfessionalCategory.OUVRIER, classificationCode: "DEMO-OUV", classificationLabel: "Ouvrier", salaryEuros: 2250, pasRate: 0.03 },
  { firstName: "Emma", professionalCategory: ProfessionalCategory.CADRE, classificationCode: "DEMO-CAD", classificationLabel: "Cadre", salaryEuros: 3900, pasRate: 0.07 },
  { firstName: "Manon", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-EMP", classificationLabel: "Employé", salaryEuros: 2850, pasRate: 0.05 },
  { firstName: "Karim", professionalCategory: ProfessionalCategory.OUVRIER, classificationCode: "DEMO-ALT", classificationLabel: "Alternant", salaryEuros: 1200, pasRate: 0.00 },
  { firstName: "Nicolas", professionalCategory: ProfessionalCategory.CADRE, classificationCode: "DEMO-CAD", classificationLabel: "Cadre", salaryEuros: 4600, pasRate: 0.12 },
  { firstName: "Julien", professionalCategory: ProfessionalCategory.AUTRE, classificationCode: "DEMO-AUT", classificationLabel: "Autre", salaryEuros: 3100, pasRate: 0.10 },
  { firstName: "Léa", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-EMP", classificationLabel: "Employé", salaryEuros: 2050, pasRate: 0.03 },
  { firstName: "Sarah", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-EMP", classificationLabel: "Employé", salaryEuros: 2600, pasRate: 0.07 },
  { firstName: "Sophie", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-EMP", classificationLabel: "Employé", salaryEuros: 2100, pasRate: 0.05 },
  { firstName: "Thomas", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-ALT", classificationLabel: "Alternant", salaryEuros: 1950, pasRate: 0.03 },
  { firstName: "Hugo", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-EMP", classificationLabel: "Employé", salaryEuros: 2400, pasRate: 0.05 },
  { firstName: "Chloé", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-ALT", classificationLabel: "Alternant", salaryEuros: 1750, pasRate: 0.00 },
  { firstName: "Inès", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-EMP", classificationLabel: "Employé", salaryEuros: 2700, pasRate: 0.07 },
  { firstName: "Maxime", professionalCategory: ProfessionalCategory.OUVRIER, classificationCode: "DEMO-OUV", classificationLabel: "Ouvrier", salaryEuros: 1950, pasRate: 0.03 },
  { firstName: "Camille", professionalCategory: ProfessionalCategory.EMPLOYE, classificationCode: "DEMO-EMP", classificationLabel: "Employé", salaryEuros: 2350, pasRate: 0.05 },
] as const;

const ALTERNANCE_DATA = {
  Karim: { birthDate: "2007-04-15", contractYear: 1, hasBaccalaureateOrHigher: null },
  Thomas: { birthDate: "2002-09-20", contractYear: null, hasBaccalaureateOrHigher: true },
  Chloé: { birthDate: "2004-02-10", contractYear: 2, hasBaccalaureateOrHigher: null },
} as const;

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export async function prepareDemoPayrollDataForOrganization(organizationId: string) {
  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, firstName: true, isDemoData: true },
  });

  if (employees.length === 0 || !employees.every((employee) => employee.isDemoData)) {
    throw new Error("Le jeu de paie de démonstration est réservé à une organisation contenant uniquement les salariés fictifs générés par RH Pilot.");
  }

  const employeeByFirstName = new Map(employees.map((employee) => [employee.firstName, employee]));
  for (const row of DEMO_PAYROLL_DATA) {
    if (!employeeByFirstName.has(row.firstName)) throw new Error(`Salarié fictif introuvable : ${row.firstName}.`);
  }

  const periodStart = startOfCurrentMonth();
  const existingPeriod = await prisma.payrollPeriod.findUnique({
    where: { organizationId_year_month: { organizationId, year: periodStart.getFullYear(), month: periodStart.getMonth() + 1 } },
    select: { id: true, status: true },
  });
  if (existingPeriod && existingPeriod.status !== "DRAFT") {
    throw new Error("La période de paie de démonstration existe déjà et n'est plus en préparation. Elle ne sera pas écrasée.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        siret: "99999999999999",
        payrollAddress: "10 rue de la Démonstration",
        payrollPostalCode: "30000",
        payrollCity: "Nîmes",
        payrollNafCode: "6201Z",
        payrollUrssafReference: "DEMO-URSSAF",
      },
    });

    await tx.$executeRaw`
      UPDATE "organizations"
      SET "legalCategory" = 'SAS', "atmpRate" = 1.00, "healthPlanMonthlyAmount" = 30.00,
          "healthPlanEmployerRate" = 50.00, "companyCreationDate" = ${new Date(2020, 0, 1)},
          "payrollDepartment" = '30'
      WHERE "id" = ${organizationId}
    `;

    for (const row of DEMO_PAYROLL_DATA) {
      const employee = employeeByFirstName.get(row.firstName)!;
      await tx.employee.update({ where: { id: employee.id }, data: { professionalCategory: row.professionalCategory } });

      const profile = await tx.payrollProfile.findFirst({
        where: { organizationId, employeeId: employee.id, effectiveFrom: periodStart },
        select: { id: true },
      });
      const profileData = {
        baseSalaryCents: Math.round(row.salaryEuros * 100),
        monthlyHours: 151.67,
        payFrequency: "MONTHLY",
        currency: "EUR",
        employeeAddress: "12 avenue de la République, 30000 Nîmes",
        classificationCode: row.classificationCode,
        classificationLabel: row.classificationLabel,
        effectiveUntil: null as Date | null,
      };
      if (profile) await tx.payrollProfile.update({ where: { id: profile.id }, data: profileData });
      else await tx.payrollProfile.create({ data: { id: randomUUID(), organizationId, employeeId: employee.id, ...profileData, effectiveFrom: periodStart } });

      const pasValidFrom = new Date(2020, 0, 1);
      await tx.$executeRaw`
        DELETE FROM "employee_withholding_tax_profiles"
        WHERE "organizationId" = ${organizationId} AND "employeeId" = ${employee.id} AND "validFrom" = ${pasValidFrom}
      `;
      await tx.$executeRaw`
        INSERT INTO "employee_withholding_tax_profiles"
          ("id", "organizationId", "employeeId", "rate", "validFrom", "validUntil", "source", "sourceReference", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}, ${organizationId}, ${employee.id}, ${row.pasRate}, ${pasValidFrom}, NULL, 'DEMO', 'RH-PILOT-DEMO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    for (const [firstName, alternance] of Object.entries(ALTERNANCE_DATA)) {
      const employee = employeeByFirstName.get(firstName);
      if (!employee) continue;
      const validFrom = new Date(2020, 0, 1);
      await tx.$executeRaw`
        DELETE FROM "employee_alternance_profiles"
        WHERE "organizationId" = ${organizationId} AND "employeeId" = ${employee.id} AND "validFrom" = ${validFrom}
      `;
      await tx.$executeRaw`
        INSERT INTO "employee_alternance_profiles"
          ("id", "organizationId", "employeeId", "birthDate", "contractYear", "hasBaccalaureateOrHigher", "validFrom", "validUntil", "source", "sourceReference", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}, ${organizationId}, ${employee.id}, ${new Date(`${alternance.birthDate}T00:00:00.000Z`)}, ${alternance.contractYear}, ${alternance.hasBaccalaureateOrHigher}, ${validFrom}, NULL, 'DEMO', 'RH-PILOT-DEMO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    const period = await tx.payrollPeriod.upsert({
      where: { organizationId_year_month: { organizationId, year: periodStart.getFullYear(), month: periodStart.getMonth() + 1 } },
      create: { id: randomUUID(), organizationId, year: periodStart.getFullYear(), month: periodStart.getMonth() + 1, status: "DRAFT" },
      update: {},
      select: { id: true },
    });
    await tx.payrollVariable.deleteMany({ where: { organizationId, payrollPeriodId: period.id } });
  }, { timeout: 30000, maxWait: 10000 });

  revalidatePath("/dashboard/payroll");
  if (existingPeriod) revalidatePath(`/dashboard/payroll/${existingPeriod.id}`);
}

export async function prepareDemoPayrollData() {
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0];
  if (!membership) throw new Error("Organisation introuvable.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    throw new Error("Seuls les administrateurs peuvent préparer le jeu de paie de démonstration.");
  }
  await prepareDemoPayrollDataForOrganization(membership.organizationId);
}
