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

async function resetDemoPayrollPeriod(organizationId: string, periodId: string) {
  await prisma.$transaction(async (tx) => {
    const calculations = await tx.payrollCalculation.findMany({
      where: { organizationId, payrollPeriodId: periodId },
      select: { id: true },
    });
    if (calculations.length > 0) {
      await tx.payrollContribution.deleteMany({
        where: { calculationId: { in: calculations.map((calculation) => calculation.id) } },
      });
    }
    await tx.payrollCalculation.deleteMany({ where: { organizationId, payrollPeriodId: periodId } });
    await tx.payslip.deleteMany({ where: { organizationId, payrollPeriodId: periodId } });
    await tx.payrollVariable.deleteMany({ where: { organizationId, payrollPeriodId: periodId } });
    await tx.payrollPeriod.delete({ where: { id: periodId } });
  });
}

async function createDemoEmployee(template: (typeof DEMO_EMPLOYEES)[number], organizationId: string, managerMembershipId: string) {
  return prisma.employee.create({
    data: {
      organizationId,
      firstName: template.firstName,
      lastName: template.lastName,
      civility: template.civility,
      position: template.position,
      hireDate: daysFromNow(template.hireOffset),
      contractType: template.contractType,
      probationDuration: template.probationDuration,
      probationDurationUnit: template.probationDurationUnit,
      nextMedicalVisitDate: template.nextMedicalVisitOffset !== null ? daysFromNow(template.nextMedicalVisitOffset) : null,
      managerMembershipId: template.hasManager ? managerMembershipId : null,
      isDemoData: true,
    },
  });
}

async function triggerDemoEmployeeEvents(
  employees: Array<{ id: string; firstName: string; hireDate: Date }>,
  organizationId: string,
  userId: string,
) {
  const skipOnboarding = new Set(["Antoine", "Julien"]);
  const antoine = employees.find((employee) => employee.firstName === "Antoine");
  const emma = employees.find((employee) => employee.firstName === "Emma");
  const manon = employees.find((employee) => employee.firstName === "Manon");
  const eventTasks: Array<() => Promise<unknown>> = [];

  if (antoine) {
    eventTasks.push(() => triggerEmployeeEvent({ organizationId, employeeId: antoine.id, eventTemplateKey: "embauche", triggerDate: antoine.hireDate, actorUserId: userId }));
  }
  if (emma) {
    eventTasks.push(() => triggerEmployeeEvent({ organizationId, employeeId: emma.id, eventTemplateKey: "visite_medicale", triggerDate: new Date(), actorUserId: userId }));
  }
  if (manon) {
    eventTasks.push(() => triggerEmployeeEvent({ organizationId, employeeId: manon.id, eventTemplateKey: "fin_periode_essai", triggerDate: daysFromNow(-650), actorUserId: userId }).then((employeeEvent) => prisma.task.updateMany({ where: { employeeEventId: employeeEvent.id }, data: { status: "DONE" } })));
  }
  for (const employee of employees) {
    if (skipOnboarding.has(employee.firstName)) continue;
    eventTasks.push(() => triggerEmployeeEvent({ organizationId, employeeId: employee.id, eventTemplateKey: "embauche", triggerDate: employee.hireDate, actorUserId: userId }).then((employeeEvent) => prisma.task.updateMany({ where: { employeeEventId: employeeEvent.id }, data: { status: "DONE" } })));
  }
  await mapWithConcurrencyLimit(eventTasks, DB_CONCURRENCY_LIMIT, (task) => task());
}

export async function generateDemoOrganization() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const organizationId = membership.organizationId;
  const periodStart = startOfCurrentMonth();
  let existingPeriod = await prisma.payrollPeriod.findUnique({
    where: { organizationId_year_month: { organizationId, year: periodStart.getFullYear(), month: periodStart.getMonth() + 1 } },
    select: { id: true, status: true },
  });

  const allEmployees = await prisma.employee.findMany({
    where: { organizationId },
    select: { id: true, firstName: true, isDemoData: true, deletedAt: true, hireDate: true },
  });

  const hasRealEmployee = allEmployees.some((employee) => !employee.isDemoData && !employee.deletedAt);
  if (hasRealEmployee) redirectWithFlash("Votre organisation contient déjà des salariés réels. La génération fictive a été annulée pour protéger vos données.");

  const demoOnlyOrganization = allEmployees.length > 0;

  if (demoOnlyOrganization && existingPeriod) {
    await resetDemoPayrollPeriod(organizationId, existingPeriod.id);
    existingPeriod = null;
  }

  const employeesByName = new Map<string, (typeof allEmployees)[number]>();
  for (const employee of allEmployees) {
    if (!employeesByName.has(employee.firstName) && DEMO_EMPLOYEE_NAMES.has(employee.firstName)) employeesByName.set(employee.firstName, employee);
  }

  const activeDemoEmployees: Array<{ id: string; firstName: string; hireDate: Date }> = [];
  const missingTemplates: Array<(typeof DEMO_EMPLOYEES)[number]> = [];

  for (const template of DEMO_EMPLOYEES) {
    const existing = employeesByName.get(template.firstName);
    if (existing) {
      if (existing.deletedAt) await prisma.employee.update({ where: { id: existing.id }, data: { deletedAt: null } });
      activeDemoEmployees.push({ id: existing.id, firstName: existing.firstName, hireDate: existing.hireDate });
    } else {
      missingTemplates.push(template);
    }
  }

  const activeIdsToKeep = new Set(activeDemoEmployees.map((employee) => employee.id));
  const extraActiveDemoEmployees = allEmployees.filter((employee) => !employee.deletedAt && !activeIdsToKeep.has(employee.id));
  if (extraActiveDemoEmployees.length > 0) {
    await prisma.employee.updateMany({ where: { id: { in: extraActiveDemoEmployees.map((employee) => employee.id) } }, data: { deletedAt: new Date() } });
  }

  const createdEmployees = await mapWithConcurrencyLimit(missingTemplates, DB_CONCURRENCY_LIMIT, (template) => createDemoEmployee(template, organizationId, membership.id));

  const allDemoEmployees = [
    ...activeDemoEmployees,
    ...createdEmployees.map((employee) => ({ id: employee.id, firstName: employee.firstName, hireDate: employee.hireDate })),
  ];

  if (allDemoEmployees.length !== DEMO_EMPLOYEES.length) {
    redirectWithFlash(
      `Erreur pendant la génération : seuls ${allDemoEmployees.length} salariés sur ${DEMO_EMPLOYEES.length} ont pu être créés. Réessayez, ou contactez le support si ça persiste.`
    );
  }

  try {
    if (createdEmployees.length > 0) {
      await prisma.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId,
          actorUserId: user.id,
          action: "organization.demo_generated",
          entityType: "Organization",
          entityId: organizationId,
          metadata: { count: createdEmployees.length, reset: demoOnlyOrganization },
        },
      });
      await triggerDemoEmployeeEvents(createdEmployees.map((employee) => ({ id: employee.id, firstName: employee.firstName, hireDate: employee.hireDate })), organizationId, user.id);
    }

    await prepareDemoPayrollDataForOrganization(organizationId);
  } catch (error) {
    // Les salariés sont déjà créés à ce stade (pas dans la même
    // transaction que ce qui suit) -- une erreur ici ne doit pas
    // laisser l'utilisateur sans aucune explication. Le message
    // d'origine de l'erreur est inclus : les erreurs de ce bloc sont
    // déjà écrites pour être lisibles par un humain (voir
    // demoPayrollActions.ts).
    const detail = error instanceof Error ? error.message : "Erreur inconnue.";
    redirectWithFlash(
      `${allDemoEmployees.length} salariés créés, mais la préparation des données de paie a échoué : ${detail}`
    );
  }

  redirectWithFlash("Entreprise de démonstration générée (15 salariés) avec données de paie prêtes pour le test.");
}

export async function archiveAllEmployees() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const result = await prisma.employee.updateMany({ where: { organizationId: membership.organizationId, deletedAt: null }, data: { deletedAt: new Date() } });
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
