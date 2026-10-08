"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { triggerEmployeeEvent } from "@/lib/eventEngine";

function daysFromNow(offset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(9, 0, 0, 0);
  return date;
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

import { DEMO_EMPLOYEES, DEMO_EMPLOYEE_NAMES } from "@/lib/demo-employees";

function redirectWithFlash(message: string): never {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
  redirect(`/dashboard/employees?flash=${encodeURIComponent(message)}`);
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
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent générer les données de démonstration.");
  }

  const organizationId = membership.organizationId;

  const allEmployees = await prisma.employee.findMany({
    where: { organizationId },
    select: { id: true, firstName: true, isDemoData: true, deletedAt: true, hireDate: true },
  });

  const hasRealEmployee = allEmployees.some((employee) => !employee.isDemoData && !employee.deletedAt);
  if (hasRealEmployee) redirectWithFlash("Votre organisation contient déjà des salariés réels. La génération fictive a été annulée pour protéger vos données.");

  const demoOnlyOrganization = allEmployees.length > 0;

  const employeesByName = new Map<string, (typeof allEmployees)[number]>();
  // Seuls les salariés fictifs peuvent être réactivés : un salarié réel archivé qui porte le même prénom reste archivé.
  for (const employee of allEmployees) {
    if (employee.isDemoData && !employeesByName.has(employee.firstName) && DEMO_EMPLOYEE_NAMES.has(employee.firstName)) employeesByName.set(employee.firstName, employee);
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
      `Erreur pendant la génération : seuls ${allDemoEmployees.length} salariés sur ${DEMO_EMPLOYEES.length} ont pu être créés. Réessayez ou contactez le support si le problème persiste.`
    );
  }

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

  redirectWithFlash("Entreprise de démonstration générée (15 salariés) avec parcours, échéances et tâches RH prêts à être testés.");
}

export async function archiveAllEmployees() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent archiver tous les salariés.");
  }

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
