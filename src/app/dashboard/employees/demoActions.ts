"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { triggerEmployeeEvent } from "@/lib/eventEngine";
import { prepareDemoPayrollDataForOrganization } from "../payroll/demoPayrollActions";

function daysFromNow(offset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(9, 0, 0, 0);
  return date;
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

async function mapWithConcurrencyLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const DB_CONCURRENCY_LIMIT = 5;

const DEMO_EMPLOYEES = [
  { firstName: "Antoine", lastName: "Perrot", civility: "M" as const, position: "Technicien de maintenance", hireOffset: -5, contractType: "CDI" as const, probationDuration: 2, probationDurationUnit: "MONTHS" as const, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Emma", lastName: "Roussel", civility: "MME" as const, position: "Responsable marketing", hireOffset: -900, contractType: "CDI" as const, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: null as number | null, hasManager: false },
  { firstName: "Manon", lastName: "Dubreuil", civility: "MME" as const, position: "Responsable RH", hireOffset: -700, contractType: "CDI" as const, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: null as number | null, hasManager: false },
  { firstName: "Karim", lastName: "Belhaj", civility: "M" as const, position: "Apprenti technicien", hireOffset: -20, contractType: "APPRENTISSAGE" as const, probationDuration: 45, probationDurationUnit: "DAYS" as const, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Nicolas", lastName: "Fabre", civility: "M" as const, position: "Analyste financier", hireOffset: -80, contractType: "CDI" as const, probationDuration: 3, probationDurationUnit: "MONTHS" as const, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Julien", lastName: "Marchand", civility: "M" as const, position: "Développeur", hireOffset: -25, contractType: null as "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION" | null, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: null as number | null, hasManager: false },
  { firstName: "Léa", lastName: "Fontaine", civility: "MME" as const, position: "Secrétaire médicale", hireOffset: -400, contractType: "CDI" as const, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: null as number | null, hasManager: false },
  { firstName: "Sarah", lastName: "Benali", civility: "AUTRE" as const, position: "Comptable", hireOffset: -1000, contractType: "CDI" as const, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Sophie", lastName: "Lemoine", civility: "MME" as const, position: "Assistante comptable", hireOffset: -60, contractType: "CDD" as const, probationDuration: 4, probationDurationUnit: "MONTHS" as const, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Thomas", lastName: "Girard", civility: "M" as const, position: "Chargé de projet", hireOffset: -60, contractType: "PROFESSIONNALISATION" as const, probationDuration: 4, probationDurationUnit: "MONTHS" as const, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Hugo", lastName: "Lacroix", civility: "M" as const, position: "Commercial", hireOffset: -200, contractType: "CDD" as const, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Chloé", lastName: "Bertin", civility: "MME" as const, position: "Apprentie assistante RH", hireOffset: -5, contractType: "APPRENTISSAGE" as const, probationDuration: 45, probationDurationUnit: "DAYS" as const, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Inès", lastName: "Chevalier", civility: "MME" as const, position: "Chargée de recrutement", hireOffset: -300, contractType: "CDI" as const, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Maxime", lastName: "Renard", civility: "M" as const, position: "Magasinier", hireOffset: -45, contractType: "CDD" as const, probationDuration: 3, probationDurationUnit: "MONTHS" as const, nextMedicalVisitOffset: null as number | null, hasManager: true },
  { firstName: "Camille", lastName: "Vidal", civility: "AUTRE" as const, position: "Chargée de clientèle", hireOffset: -540, contractType: "CDI" as const, probationDuration: null as number | null, probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null, nextMedicalVisitOffset: 45, hasManager: true },
];

const DEMO_EMPLOYEE_NAMES = new Set(DEMO_EMPLOYEES.map((employee) => employee.firstName));

function redirectWithFlash(message: string): never {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/payroll");
  redirect(`/dashboard/employees?flash=${encodeURIComponent(message)}`);
}

export async function generateDemoOrganization() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const periodStart = startOfCurrentMonth();
  let existingPeriod = await prisma.payrollPeriod.findUnique({
    where: { organizationId_year_month: { organizationId: membership.organizationId, year: periodStart.getFullYear(), month: periodStart.getMonth() + 1 } },
    select: { id: true, status: true },
  });

  const allEmployees = await prisma.employee.findMany({
    where: { organizationId: membership.organizationId },
    select: { id: true, firstName: true, isDemoData: true, deletedAt: true },
  });
  const existingEmployees = allEmployees.filter((employee) => employee.deletedAt === null);
  const archivedEmployees = allEmployees.filter((employee) => employee.deletedAt !== null);

  // Recover the complete demo set even if other real employees are archived.
  // Only employees explicitly marked as demo data and matching the known 15 names are eligible.
  const archivedDemoEmployees = archivedEmployees.filter(
    (employee) => employee.isDemoData && DEMO_EMPLOYEE_NAMES.has(employee.firstName),
  );
  const archivedDemoSet =
    existingEmployees.length === 0 &&
    archivedDemoEmployees.length === DEMO_EMPLOYEES.length &&
    new Set(archivedDemoEmployees.map((employee) => employee.firstName)).size === DEMO_EMPLOYEES.length;

  if (archivedDemoSet) {
    await prisma.employee.updateMany({
      where: { organizationId: membership.organizationId, id: { in: archivedDemoEmployees.map((employee) => employee.id) } },
      data: { deletedAt: null },
    });
    existingEmployees.push(...archivedDemoEmployees.map((employee) => ({ ...employee, deletedAt: null })));
  }

  if (existingEmployees.length === 0 && existingPeriod && existingPeriod.status !== "DRAFT") {
    const [calculationCount, payslipCount, variableCount] = await Promise.all([
      prisma.payrollCalculation.count({ where: { organizationId: membership.organizationId, payrollPeriodId: existingPeriod.id } }),
      prisma.payslip.count({ where: { organizationId: membership.organizationId, payrollPeriodId: existingPeriod.id } }),
      prisma.payrollVariable.count({ where: { organizationId: membership.organizationId, payrollPeriodId: existingPeriod.id } }),
    ]);

    if (calculationCount === 0 && payslipCount === 0 && variableCount === 0) {
      await prisma.payrollPeriod.delete({ where: { id: existingPeriod.id } });
      existingPeriod = null;
    } else {
      redirectWithFlash("La période de paie du mois contient déjà des données et ne peut pas être remplacée. La génération fictive a été annulée pour protéger ces données.");
    }
  }

  if (existingEmployees.length > 0) {
    const allDemo = existingEmployees.every((employee) => employee.isDemoData);
    const isCompleteDemoSet = allDemo && existingEmployees.length === DEMO_EMPLOYEES.length && existingEmployees.every((employee) => DEMO_EMPLOYEE_NAMES.has(employee.firstName));

    if (!allDemo || !isCompleteDemoSet) {
      redirectWithFlash("Votre organisation contient déjà des salariés. La génération fictive a été annulée pour éviter tout doublon.");
    }

    if (existingPeriod && existingPeriod.status !== "DRAFT") {
      redirectWithFlash("Les salariés fictifs existent déjà, mais la période de paie du mois est verrouillée. Aucune donnée existante n'a été écrasée.");
    }

    await prepareDemoPayrollDataForOrganization(membership.organizationId);
    redirectWithFlash(archivedDemoSet ? "Les 15 salariés fictifs ont été récupérés et leur jeu de paie est prêt pour le test." : "Les données fictives existaient déjà : leur jeu de paie a été réparé et est prêt pour le test.");
  }

  if (existingPeriod && existingPeriod.status !== "DRAFT") {
    redirectWithFlash("La période de paie du mois est déjà verrouillée. La génération fictive a été annulée pour protéger les données existantes.");
  }

  const createdEmployees = await mapWithConcurrencyLimit(DEMO_EMPLOYEES, DB_CONCURRENCY_LIMIT, (template) =>
    prisma.employee.create({
      data: {
        organizationId: membership.organizationId,
        firstName: template.firstName,
        lastName: template.lastName,
        civility: template.civility,
        position: template.position,
        hireDate: daysFromNow(template.hireOffset),
        contractType: template.contractType,
        probationDuration: template.probationDuration,
        probationDurationUnit: template.probationDurationUnit,
        nextMedicalVisitDate: template.nextMedicalVisitOffset !== null ? daysFromNow(template.nextMedicalVisitOffset) : null,
        managerMembershipId: template.hasManager ? membership.id : null,
        isDemoData: true,
      },
    })
  );

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "organization.demo_generated",
      entityType: "Organization",
      entityId: membership.organizationId,
    },
  });

  const skipOnboarding = new Set(["Antoine", "Julien"]);
  const antoine = createdEmployees.find((e) => e.firstName === "Antoine");
  const emma = createdEmployees.find((e) => e.firstName === "Emma");
  const manon = createdEmployees.find((e) => e.firstName === "Manon");
  const eventTasks: Array<() => Promise<unknown>> = [];

  if (antoine) eventTasks.push(() => triggerEmployeeEvent({ organizationId: membership.organizationId, employeeId: antoine.id, eventTemplateKey: "embauche", triggerDate: antoine.hireDate, actorUserId: user.id }));
  if (emma) eventTasks.push(() => triggerEmployeeEvent({ organizationId: membership.organizationId, employeeId: emma.id, eventTemplateKey: "visite_medicale", triggerDate: new Date(), actorUserId: user.id }));
  if (manon) eventTasks.push(() => triggerEmployeeEvent({ organizationId: membership.organizationId, employeeId: manon.id, eventTemplateKey: "fin_periode_essai", triggerDate: daysFromNow(-650), actorUserId: user.id }).then((employeeEvent) => prisma.task.updateMany({ where: { employeeEventId: employeeEvent.id }, data: { status: "DONE" } })));
  for (const employee of createdEmployees) {
    if (skipOnboarding.has(employee.firstName)) continue;
    eventTasks.push(() => triggerEmployeeEvent({ organizationId: membership.organizationId, employeeId: employee.id, eventTemplateKey: "embauche", triggerDate: employee.hireDate, actorUserId: user.id }).then((employeeEvent) => prisma.task.updateMany({ where: { employeeEventId: employeeEvent.id }, data: { status: "DONE" } })));
  }

  await mapWithConcurrencyLimit(eventTasks, DB_CONCURRENCY_LIMIT, (task) => task());
  await prepareDemoPayrollDataForOrganization(membership.organizationId);

  redirectWithFlash("Entreprise de démonstration générée (15 salariés) avec données de paie prêtes pour le test.");
}

export async function archiveAllEmployees() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const result = await prisma.employee.updateMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "employees.bulk_archived",
      entityType: "Organization",
      entityId: membership.organizationId,
      metadata: { count: result.count },
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
  const label = `${result.count} salarié${result.count > 1 ? "s" : ""} archivé${result.count > 1 ? "s" : ""}`;
  redirectWithFlash(label);
}
