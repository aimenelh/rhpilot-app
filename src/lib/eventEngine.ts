import { randomUUID } from "node:crypto";
import { FunctionalRole, FunctionalRoleResolution, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Résout le responsable réel d'une tâche à partir de son rôle de
 * résolution (RH / DIRIGEANT / MANAGER_DIRECT), tel que défini au
 * moment de la conception du schéma :
 * - RH / DIRIGEANT : cherché parmi les membres de l'organisation ayant
 *   cette fonction. Si aucune correspondance OU plusieurs (ambiguïté),
 *   la tâche reste non assignée plutôt que de deviner — un vide visible
 *   vaut mieux qu'une mauvaise affectation silencieuse.
 * - MANAGER_DIRECT : résolu via Employee.managerMembershipId, propre à
 *   chaque salarié, jamais via un rôle global de l'organisation.
 */
async function resolveAssignedMembershipId(
  tx: Prisma.TransactionClient,
  organizationId: string,
  employee: { managerMembershipId: string | null },
  role: FunctionalRoleResolution
): Promise<string | null> {
  if (role === "MANAGER_DIRECT") {
    if (!employee.managerMembershipId) return null;
    const manager = await tx.membership.findFirst({
      where: { id: employee.managerMembershipId, organizationId, deletedAt: null },
    });
    return manager?.id ?? null;
  }

  const functionalRole = role === "RH" ? FunctionalRole.RH : FunctionalRole.DIRIGEANT;
  const matches = await tx.membership.findMany({
    where: { organizationId, deletedAt: null, functionalRole },
  });
  return matches.length === 1 ? matches[0].id : null;
}

export async function triggerEmployeeEvent({
  organizationId,
  employeeId,
  eventTemplateKey,
  triggerDate,
  actorUserId,
}: {
  organizationId: string;
  employeeId: string;
  eventTemplateKey: string;
  triggerDate: Date;
  actorUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: employeeId, organizationId, deletedAt: null },
    });
    if (!employee) throw new Error("Salarié introuvable dans cette organisation.");

    // Gabarit non archivé uniquement : un gabarit désactivé ne doit
    // plus pouvoir être déclenché pour un nouveau plan, même si des
    // plans existants continuent d'en dépendre (cf. Restrict au niveau
    // du schéma).
    const eventTemplate = await tx.eventTemplate.findFirst({
      where: { key: eventTemplateKey, archivedAt: null },
      include: {
        taskTemplates: {
          where: { archivedAt: null },
          orderBy: { stepOrder: "asc" },
        },
      },
    });
    if (!eventTemplate) throw new Error("Ce type d'événement est introuvable ou désactivé.");

    const employeeEvent = await tx.employeeEvent.create({
      data: {
        id: randomUUID(),
        organizationId,
        employeeId,
        eventTemplateId: eventTemplate.id,
        triggerDate,
      },
    });

    // Personnalisations mémorisées par cette organisation précise —
    // jamais partagées avec les autres, jamais appliquées au gabarit
    // global. Chargées une fois, indexées par taskTemplateId pour un
    // accès rapide dans la boucle de génération.
    const overrides = await tx.taskTemplateOverride.findMany({
      where: { organizationId, taskTemplateId: { in: eventTemplate.taskTemplates.map((t) => t.id) } },
    });
    const overrideByTemplateId = new Map(overrides.map((o) => [o.taskTemplateId, o]));

    for (const taskTemplate of eventTemplate.taskTemplates) {
      const override = overrideByTemplateId.get(taskTemplate.id);

      // Étape que cette organisation a explicitement choisi de ne
      // jamais générer — on passe simplement à la suivante.
      if (override?.action === "REMOVED") continue;

      const effectiveLabel = override?.action === "MODIFIED" && override.label ? override.label : taskTemplate.label;
      const effectiveOffsetDays =
        override?.action === "MODIFIED" && override.dueOffsetDays !== null
          ? override.dueOffsetDays
          : taskTemplate.dueOffsetDays;

      const dueDate = new Date(triggerDate);
      dueDate.setDate(dueDate.getDate() + effectiveOffsetDays);

      const assignedMembershipId = await resolveAssignedMembershipId(
        tx,
        organizationId,
        employee,
        taskTemplate.defaultFunctionalRole
      );

      // Champs copiés du gabarit vers l'instance (label, stepOrder,
      // deadlineType, proofRequired, proofLabel) : un plan déjà généré
      // ne doit jamais changer rétroactivement si le gabarit évolue
      // ensuite — principe posé dès la conception du schéma. Seuls le
      // libellé et le délai tiennent compte d'une personnalisation
      // mémorisée, jamais les autres champs.
      await tx.task.create({
        data: {
          organizationId,
          employeeEventId: employeeEvent.id,
          taskTemplateId: taskTemplate.id,
          label: effectiveLabel,
          stepOrder: taskTemplate.stepOrder,
          dueDate,
          deadlineType: taskTemplate.deadlineType,
          resolutionRole: taskTemplate.defaultFunctionalRole,
          assignedMembershipId,
          proofRequired: taskTemplate.proofRequired,
          proofLabel: taskTemplate.proofLabel,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId,
        actorUserId,
        action: "employee_event.created",
        entityType: "EmployeeEvent",
        entityId: employeeEvent.id,
        metadata: { eventTemplateKey, taskCount: eventTemplate.taskTemplates.length },
      },
    });

    return employeeEvent;
  });
}
