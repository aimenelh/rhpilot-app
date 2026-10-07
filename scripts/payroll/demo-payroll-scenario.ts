/**
 * Parcours complet de la paie de démonstration sur une base PostgreSQL :
 * salariés fictifs → remise à zéro → calcul → clôture → DSN, sur deux mois
 * (le premier s'appuie sur les reprises, le second sur le mois clôturé).
 */
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import { DEMO_EMPLOYEES } from "../../src/lib/demo-employees";
import { resetDemoPayroll } from "../../src/lib/payroll/demo-payroll";
import { demoPaymentDate } from "../../src/lib/payroll/demo-payroll-data";
import { calculatePayrollPeriod } from "../../src/lib/payroll/payroll-period-calculation";
import { prepareDsnP26V01 } from "../../src/lib/payroll/dsn-preparation";

export const DEMO_RULE = { ruleCode: "FR.PAIE.PUBLICODES.SOCIAL", ruleScope: "FRANCE_HORS_MAYOTTE" } as const;

/** Clé de chiffrement de test, uniquement si l'environnement n'en fournit pas. */
export function ensureTestEncryptionKey(): void {
  if (!process.env.DSN_PII_ENCRYPTION_KEY) process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
}

/** Organisation fictive telle que la crée le générateur de démonstration (SIRET de remplissage invalide compris). */
export async function createDemoOrganization(today: Date, name = "Démonstration DSN"): Promise<string> {
  const organizationId = randomUUID();
  await prisma.organization.create({ data: { id: organizationId, name, siret: "99999999999999" } });
  await prisma.employee.createMany({
    data: DEMO_EMPLOYEES.map((template) => {
      const hireDate = new Date(today);
      hireDate.setUTCDate(hireDate.getUTCDate() + template.hireOffset);
      hireDate.setUTCHours(9, 0, 0, 0);
      return { organizationId, firstName: template.firstName, lastName: template.lastName, civility: template.civility, position: template.position, hireDate, contractType: template.contractType, isDemoData: true };
    }),
  });
  return organizationId;
}

/** Calcule, valide, clôture puis prépare la DSN d'essai d'un mois. */
export async function closeDemoMonth(organizationId: string, periodId: string, fileDate: Date): Promise<{ content: string; warnings: string[]; employeeCount: number }> {
  const calculation = await calculatePayrollPeriod({ periodId, organizationId, ...DEMO_RULE });
  await prisma.payrollPeriod.update({ where: { id: periodId }, data: { status: "VALIDATED", validatedAt: new Date() } });
  await prisma.payrollPeriod.update({ where: { id: periodId }, data: { status: "LOCKED", lockedAt: new Date() } });
  const dsn = await prepareDsnP26V01({ organizationId, periodId, testMode: true, declarationOrder: 1, fileDate });
  return { content: dsn.content, warnings: calculation.warnings, employeeCount: dsn.employeeCount };
}

export type DemoScenarioResult = { organizationId: string; months: Array<{ year: number; month: number; content: string; warnings: string[]; employeeCount: number }> };

export async function runDemoPayrollScenario(today = new Date("2026-10-07T10:00:00.000Z")): Promise<DemoScenarioResult> {
  ensureTestEncryptionKey();
  const organizationId = await createDemoOrganization(today);
  const reset = await resetDemoPayroll({ organizationId, actorUserId: null, today });
  const months: DemoScenarioResult["months"] = [];
  const first = await closeDemoMonth(organizationId, reset.periodId, new Date(Date.UTC(reset.year, reset.month, 3, 10)));
  months.push({ year: reset.year, month: reset.month, ...first });

  const next = reset.month === 12 ? { year: reset.year + 1, month: 1 } : { year: reset.year, month: reset.month + 1 };
  const nextPeriodId = randomUUID();
  await prisma.payrollPeriod.create({ data: { id: nextPeriodId, organizationId, year: next.year, month: next.month, status: "DRAFT", paymentDate: demoPaymentDate(next.year, next.month) } });
  const second = await closeDemoMonth(organizationId, nextPeriodId, new Date(Date.UTC(next.year, next.month, 3, 10)));
  months.push({ ...next, ...second });
  return { organizationId, months };
}
