/**
 * Remise à zéro de la paie d'une entreprise de démonstration : efface toute la paie
 * (mois, bulletins, DSN d'essai), puis recrée des profils, des reprises calculées par
 * le moteur et des données DSN fictives, et ouvre le mois en cours.
 *
 * Réservé aux organisations dont tous les salariés actifs sont fictifs : la base de
 * données le vérifie aussi avant de laisser supprimer une archive DSN.
 */
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkSiret } from "@/lib/siret";
import { FULL_TIME_SCHEDULE } from "./bulletin/calendar";
import { territoryFromDepartment } from "./bulletin/period-loader";
import { encryptDsnSensitiveValue } from "./dsn-pii";
import {
  DEMO_ATMP_RATE_PERCENT, DEMO_DSN_SETTINGS, DEMO_HEADCOUNT, DEMO_PAYROLL_EMPLOYEES, DEMO_HEALTH_PLAN, DEMO_MONTHLY_HOURS, DEMO_PREVOYANCE_RATES, DEMO_SIRET, DEMO_SOURCE,
  computeDemoOpening, demoContractEndDate, demoDsnProfileFields, demoNir, demoPaidLeaveOpening, demoPasRateIdentifier, demoPaymentDate,
  demoPayrollEmployee, type DemoPayrollEmployee,
} from "./demo-payroll-data";

export type DemoPayrollResetResult = { periodId: string; year: number; month: number; employeeCount: number; openingCount: number; siretReplaced: boolean };

const iso = (date: Date) => date.toISOString().slice(0, 10);
const utcDay = (day: string) => new Date(`${day}T00:00:00.000Z`);

/** Salariés actifs non fictifs : leur présence interdit la remise à zéro. */
export async function realActiveEmployees(organizationId: string): Promise<string[]> {
  const rows = await prisma.employee.findMany({ where: { organizationId, deletedAt: null, isDemoData: false }, select: { firstName: true, lastName: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  return rows.map((row) => `${row.firstName} ${row.lastName}`.trim());
}

type Prepared = {
  id: string;
  data: DemoPayrollEmployee;
  index: number;
  hireDate: string;
  contractEndDate: Date | null;
  displayName: string;
};

export async function resetDemoPayroll(input: { organizationId: string; actorUserId: string | null; today?: Date }): Promise<DemoPayrollResetResult> {
  const { organizationId } = input;
  const today = input.today ?? new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, hireDate: true, isDemoData: true },
    orderBy: { hireDate: "asc" },
  });
  if (employees.length === 0) throw new Error("Aucun salarié fictif : générez d'abord l'entreprise de démonstration depuis l'onglet Salariés.");
  const real = employees.filter((employee) => !employee.isDemoData);
  if (real.length > 0) {
    throw new Error(`La paie de démonstration ne se remet à zéro que si l'organisation ne contient que les salariés fictifs. Archivez d'abord : ${real.map((employee) => `${employee.firstName} ${employee.lastName}`.trim()).join(", ")}.`);
  }
  const unknown = employees.filter((employee) => !demoPayrollEmployee(employee.firstName));
  if (unknown.length > 0) throw new Error(`Salarié fictif non reconnu : ${unknown.map((employee) => employee.firstName).join(", ")}. Régénérez les salariés de démonstration depuis l'onglet Salariés.`);

  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { siret: true } });
  if (!organization) throw new Error("Organisation introuvable.");
  const siretCheck = checkSiret(organization.siret ?? "");
  const siret = siretCheck.ok ? siretCheck.siret : DEMO_SIRET;

  const prepared: Prepared[] = employees.map((employee) => {
    const data = demoPayrollEmployee(employee.firstName)!;
    const hireDate = iso(employee.hireDate);
    return {
      id: employee.id, data, hireDate, displayName: `${employee.firstName} ${employee.lastName}`.trim(),
      index: DEMO_PAYROLL_EMPLOYEES.indexOf(data),
      contractEndDate: demoContractEndDate(data.contract, hireDate, year, month),
    };
  });

  // Tout ce qui peut échouer (chiffrement, moteur) est préparé avant la transaction.
  const department = (await prisma.$queryRaw<Array<{ payrollDepartment: string | null }>>`SELECT "payrollDepartment" FROM "organizations" WHERE "id" = ${organizationId}`)[0]?.payrollDepartment || "30";
  const { territory, alsaceMoselle } = territoryFromDepartment(department);
  if (territory !== "METROPOLE" || alsaceMoselle) throw new Error("La paie de démonstration est prévue pour un établissement de métropole hors Alsace-Moselle : corrigez le département dans Configuration > Organisation.");
  const organizationContext = {
    atmpRatePercent: DEMO_ATMP_RATE_PERCENT,
    healthPlan: { monthlyAmount: DEMO_HEALTH_PLAN.monthlyAmount, employerShare: DEMO_HEALTH_PLAN.employerSharePercent / 100 },
    prevoyance: DEMO_PREVOYANCE_RATES,
    ijssSubrogation: true,
    paidLeaveMethod: "OUVRABLES" as const,
    workedSolidarityDay: false,
  };
  const openings = prepared.map((employee) => computeDemoOpening({
    employee: employee.data, employeeId: employee.id, displayName: employee.displayName, hireDate: employee.hireDate,
    contractEndDate: employee.contractEndDate ? iso(employee.contractEndDate) : null, year, month, organization: organizationContext,
    headcount: DEMO_HEADCOUNT, rateIdentifier: demoPasRateIdentifier(employee.index),
  }));
  const iban = encryptDsnSensitiveValue(DEMO_DSN_SETTINGS.iban);
  const nirs = prepared.map((employee) => encryptDsnSensitiveValue(demoNir(employee.data, employee.index)));
  const demoIds = (await prisma.employee.findMany({ where: { organizationId, isDemoData: true }, select: { id: true } })).map((row) => row.id);
  const periodId = randomUUID();
  const now = new Date();
  const yearStart = utcDay(`${year}-01-01`);
  const firstOfHireMonth = (hireDate: string) => utcDay(`${hireDate.slice(0, 7)}-01`);

  await prisma.$transaction(async (tx) => {
    // Autorise, pour cette seule transaction et cette organisation, la suppression des archives DSN et des absences intégrées.
    await tx.$queryRaw`SELECT set_config('rhpilot.demo_payroll_reset', ${organizationId}, true)`;
    await tx.dsn_work_events.deleteMany({ where: { organizationId } });
    await tx.dsn_declarations.deleteMany({ where: { organizationId } });
    await tx.payslip.deleteMany({ where: { organizationId } });
    await tx.payrollCalculation.deleteMany({ where: { organizationId } });
    await tx.payrollVariable.deleteMany({ where: { organizationId } });
    await tx.payrollPeriod.deleteMany({ where: { organizationId } });
    await tx.absence.updateMany({ where: { organizationId, payrollImpactStatus: "INTEGRATED" }, data: { payrollImpactStatus: "READY" } });
    await tx.$executeRaw`UPDATE "employee_documents" SET "replacedAt" = ${now} WHERE "organizationId" = ${organizationId} AND "kind" = 'PAYSLIP' AND "replacedAt" IS NULL`;

    const scope = { organizationId, employeeId: { in: demoIds } };
    await tx.payrollProfile.deleteMany({ where: scope });
    await tx.employee_withholding_tax_profiles.deleteMany({ where: scope });
    await tx.employee_alternance_profiles.deleteMany({ where: scope });
    await tx.employee_paid_leave_openings.deleteMany({ where: scope });
    await tx.employee_payroll_openings.deleteMany({ where: scope });
    await tx.dsn_employee_profiles.deleteMany({ where: scope });

    await tx.$executeRaw`
      UPDATE "organizations"
      SET "siret" = ${siret},
          "payrollAddress" = COALESCE(NULLIF("payrollAddress", ''), '10 rue de la Démonstration'),
          "payrollPostalCode" = COALESCE(NULLIF("payrollPostalCode", ''), '30000'),
          "payrollCommuneCode" = CASE WHEN NULLIF("payrollCity", '') IS NULL THEN '30189' ELSE "payrollCommuneCode" END,
          "payrollCity" = COALESCE(NULLIF("payrollCity", ''), 'Nîmes'),
          "payrollDepartment" = COALESCE(NULLIF("payrollDepartment", ''), '30'),
          "payrollNafCode" = COALESCE(NULLIF("payrollNafCode", ''), '6201Z'),
          "payrollUrssafReference" = COALESCE(NULLIF("payrollUrssafReference", ''), 'DEMO-URSSAF'),
          "legalCategory" = COALESCE("legalCategory", 'SAS'),
          "companyCreationDate" = COALESCE("companyCreationDate", ${new Date(Date.UTC(2020, 0, 1))}),
          "collectiveAgreementId" = COALESCE("collectiveAgreementId", (SELECT "id" FROM "collective_agreements" WHERE "id" = 'ccn-1486-syntec')),
          "atmpRate" = ${DEMO_ATMP_RATE_PERCENT},
          "healthPlanMonthlyAmount" = ${DEMO_HEALTH_PLAN.monthlyAmount},
          "healthPlanEmployerRate" = ${DEMO_HEALTH_PLAN.employerSharePercent},
          "prevoyanceRates" = ${JSON.stringify(DEMO_PREVOYANCE_RATES)}::jsonb,
          "payrollHeadcount" = ${DEMO_HEADCOUNT},
          "ijssSubrogation" = true, "paidLeaveMethod" = 'OUVRABLES', "workedSolidarityDay" = false,
          "mealVoucherFaceValue" = 10.00, "mealVoucherEmployerShare" = 0.5
      WHERE "id" = ${organizationId}
    `;
    const [settings] = await tx.$queryRaw<Array<{ collectiveAgreementId: string | null; payrollNafCode: string | null }>>`SELECT "collectiveAgreementId", "payrollNafCode" FROM "organizations" WHERE "id" = ${organizationId}`;
    if (!settings?.collectiveAgreementId) throw new Error("Convention collective de démonstration introuvable : associez une convention collective dans Configuration > Organisation.");

    const dsnSettings = {
      contactName: DEMO_DSN_SETTINGS.contactName, contactEmail: DEMO_DSN_SETTINGS.contactEmail, contactPhone: DEMO_DSN_SETTINGS.contactPhone,
      declaredContactType: DEMO_DSN_SETTINGS.declaredContactType, enterpriseApenCode: settings.payrollNafCode ?? "6201Z",
      urssafSiret: DEMO_DSN_SETTINGS.urssafSiret, retirementSiret: DEMO_DSN_SETTINGS.retirementSiret,
      paymentIbanCiphertext: iban, paymentBic: DEMO_DSN_SETTINGS.bic, subrogationIbanCiphertext: iban, subrogationBic: DEMO_DSN_SETTINGS.bic,
      sepaMandatesConfirmed: true, defaultTestMode: true, updatedAt: now,
    };
    await tx.dsn_organization_settings.upsert({ where: { organizationId }, create: { organizationId, ...dsnSettings }, update: dsnSettings });

    for (const employee of prepared) {
      await tx.employee.update({ where: { id: employee.id }, data: { contractType: employee.data.contract, professionalCategory: employee.data.category, contractEndDate: employee.contractEndDate } });
    }
    await tx.payrollProfile.createMany({
      data: prepared.map((employee) => ({
        id: randomUUID(), organizationId, employeeId: employee.id, payFrequency: "MONTHLY", currency: "EUR",
        baseSalaryCents: Math.round(employee.data.salary * 100), monthlyHours: DEMO_MONTHLY_HOURS, collectiveAgreementId: settings.collectiveAgreementId,
        effectiveFrom: firstOfHireMonth(employee.hireDate), effectiveUntil: null,
        classificationCode: employee.data.classificationCode, classificationLabel: employee.data.classificationLabel,
        employeeAddress: `${employee.data.address.line}, ${employee.data.address.postalCode} ${employee.data.address.city}`,
        weeklySchedule: [...FULL_TIME_SCHEDULE],
      })),
    });
    await tx.employee_withholding_tax_profiles.createMany({
      data: prepared.map((employee) => {
        const hireMonth = firstOfHireMonth(employee.hireDate);
        return { id: randomUUID(), organizationId, employeeId: employee.id, rate: employee.data.pasRate, validFrom: hireMonth > yearStart ? hireMonth : yearStart, validUntil: null, source: DEMO_SOURCE, sourceReference: demoPasRateIdentifier(employee.index), updatedAt: now };
      }),
    });
    const alternants = prepared.filter((employee) => employee.data.alternance);
    if (alternants.length > 0) {
      await tx.employee_alternance_profiles.createMany({
        data: alternants.map((employee) => ({
          id: randomUUID(), organizationId, employeeId: employee.id, birthDate: utcDay(employee.data.birthDate),
          contractYear: employee.data.alternance!.contractYear, hasBaccalaureateOrHigher: employee.data.alternance!.hasBaccalaureateOrHigher,
          validFrom: firstOfHireMonth(employee.hireDate), validUntil: null, source: "DEMO", sourceReference: "RH-PILOT-DEMO", updatedAt: now,
        })),
      });
    }
    const leaveOpenings = prepared.flatMap((employee) => {
      const balances = demoPaidLeaveOpening(employee.data, employee.hireDate, year, month);
      return balances ? [{ id: randomUUID(), organizationId, employeeId: employee.id, asOf: utcDay(`${year}-${String(month).padStart(2, "0")}-01`), ...balances, updatedAt: now }] : [];
    });
    if (leaveOpenings.length > 0) await tx.employee_paid_leave_openings.createMany({ data: leaveOpenings });
    const payrollOpenings = prepared.flatMap((employee, position) => {
      const opening = openings[position];
      if (!opening) return [];
      const { year: _year, ...cumuls } = opening.cumuls;
      void _year;
      return [{ id: randomUUID(), organizationId, employeeId: employee.id, year, throughMonth: opening.throughMonth, cumuls: cumuls as Prisma.InputJsonValue, sickPayHistory: { fullRateDaysUsed: 0, reducedRateDaysUsed: 0 }, updatedAt: now }];
    });
    if (payrollOpenings.length > 0) await tx.employee_payroll_openings.createMany({ data: payrollOpenings });

    await tx.dsn_employee_profiles.createMany({
      data: prepared.map((employee, position) => {
        const fields = demoDsnProfileFields({ employee: employee.data, index: employee.index, hireDate: employee.hireDate, contractEndDate: employee.contractEndDate, siret, year, headcount: DEMO_HEADCOUNT });
        return { id: randomUUID(), organizationId, employeeId: employee.id, nirCiphertext: nirs[position], ...fields, complementaryAffiliations: fields.complementaryAffiliations as unknown as Prisma.InputJsonValue, updatedAt: now };
      }),
    });

    await tx.payrollPeriod.create({ data: { id: periodId, organizationId, year, month, status: "DRAFT", paymentDate: demoPaymentDate(year, month) } });
    await tx.auditLog.create({ data: { id: randomUUID(), organizationId, actorUserId: input.actorUserId, action: "payroll.demo.reset", entityType: "Organization", entityId: organizationId,
      metadata: { year, month, employeeCount: prepared.length, openingCount: payrollOpenings.length, siretReplaced: siret !== (organization.siret ?? "") } } });
  }, { maxWait: 10000, timeout: 60000 });

  return { periodId, year, month, employeeCount: prepared.length, openingCount: openings.filter(Boolean).length, siretReplaced: siret !== (organization.siret ?? "") };
}
