"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { triggerEmployeeEvent } from "@/lib/eventEngine";
import type { TaskStatus, Prisma } from "@prisma/client";

export type TriggerEventFormState = { error: string } | undefined;

const ALLOWED_STATUSES: TaskStatus[] = [
  "TO_PREPARE",
  "TODO",
  "IN_PROGRESS",
  "WAITING_EXTERNAL",
  "DONE",
  "CANCELLED",
];

export async function triggerEvent(
  employeeId: string,
  _prevState: TriggerEventFormState,
  formData: FormData
): Promise<TriggerEventFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    return { error: "Session expirée, veuillez recharger la page." };
  }

  const eventTemplateKey = String(formData.get("eventTemplateKey") ?? "");
  const triggerDateRaw = String(formData.get("triggerDate") ?? "");

  if (!eventTemplateKey) return { error: "Choisissez un type d'événement." };
  if (!triggerDateRaw || Number.isNaN(new Date(triggerDateRaw).getTime())) {
    return { error: "La date de l'événement n'est pas valide." };
  }

  let employeeEventId: string;
  try {
    const employeeEvent = await triggerEmployeeEvent({
      organizationId: membership.organizationId,
      employeeId,
      eventTemplateKey,
      triggerDate: new Date(triggerDateRaw),
      actorUserId: user.id,
    });
    employeeEventId = employeeEvent.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Une erreur est survenue." };
  }

  redirect(
    `/dashboard/events/${employeeEventId}?flash=${encodeURIComponent("Plan d'action généré")}`
  );
}

export async function triggerEventQuick(formData: FormData) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const employeeId = String(formData.get("employeeId") ?? "");
  const eventTemplateKey = String(formData.get("eventTemplateKey") ?? "");
  const triggerDateRaw = String(formData.get("triggerDate") ?? "");

  if (!employeeId || !eventTemplateKey || !triggerDateRaw) {
    throw new Error("Suggestion invalide : données manquantes.");
  }

  const employeeEvent = await triggerEmployeeEvent({
    organizationId: membership.organizationId,
    employeeId,
    eventTemplateKey,
    triggerDate: new Date(triggerDateRaw),
    actorUserId: user.id,
  });

  redirect(
    `/dashboard/events/${employeeEvent.id}?flash=${encodeURIComponent("Plan d'action généré")}`
  );
}

export async function updateTaskStatus(taskId: string, formData: FormData) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  // Isolation multi-tenant : vérification explicite en plus des clés
  // composites du schéma, comme partout ailleurs dans l'application.
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: membership.organizationId },
  });
  if (!task) throw new Error("Tâche introuvable dans cette organisation");

  const statusRaw = String(formData.get("status") ?? "");
  if (!ALLOWED_STATUSES.includes(statusRaw as TaskStatus)) {
    throw new Error("Statut invalide");
  }
  const status = statusRaw as TaskStatus;

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "task.status_updated",
        entityType: "Task",
        entityId: taskId,
        metadata: { status },
      },
    }),
  ]);

  redirect(
    `/dashboard/events/${task.employeeEventId}?flash=${encodeURIComponent("Statut mis à jour")}`
  );
}

/**
 * Assignation manuelle d'une tâche restée "À assigner" — par exemple
 * parce qu'aucun manager n'était renseigné, ou qu'aucune/plusieurs
 * personnes étaient marquées "RH" au moment de la génération du
 * parcours. RH Pilot ne recalcule jamais automatiquement après coup
 * (voir resolveAssignedMembershipId) — c'est une vraie personne qui
 * choisit explicitement, jamais une déduction silencieuse.
 */
export async function assignTask(taskId: string, formData: FormData) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: membership.organizationId },
  });
  if (!task) throw new Error("Tâche introuvable dans cette organisation");

  const assignedMembershipId = String(formData.get("assignedMembershipId") ?? "").trim();
  if (!assignedMembershipId) throw new Error("Veuillez choisir une personne.");

  // Vérifie que la personne choisie appartient bien à cette organisation.
  const targetMembership = await prisma.membership.findFirst({
    where: { id: assignedMembershipId, organizationId: membership.organizationId, deletedAt: null },
  });
  if (!targetMembership) throw new Error("Cette personne ne fait pas partie de votre organisation.");

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: { assignedMembershipId },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "task.assigned_manually",
        entityType: "Task",
        entityId: taskId,
        metadata: { assignedMembershipId },
      },
    }),
  ]);

  redirect(
    `/dashboard/events/${task.employeeEventId}?flash=${encodeURIComponent("Tâche assignée")}`
  );
}

/**
 * Archive un parcours (par exemple un doublon créé par erreur) —
 * jamais de suppression définitive, cohérent avec le reste du
 * produit. Ses tâches restent en base pour l'historique, simplement
 * masquées de toutes les listes actives.
 */
export async function archiveEmployeeEvent(eventId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const event = await prisma.employeeEvent.findFirst({
    where: { id: eventId, organizationId: membership.organizationId, deletedAt: null },
  });
  if (!event) throw new Error("Parcours introuvable dans cette organisation");

  await prisma.$transaction([
    prisma.employeeEvent.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "employeeEvent.archived",
        entityType: "EmployeeEvent",
        entityId: eventId,
      },
    }),
  ]);

  redirect(
    `/dashboard/employees/${event.employeeId}?flash=${encodeURIComponent("Parcours archivé")}`
  );
}

/**
 * Ajoute une tâche manuelle à un parcours déjà généré — parce que le
 * fonctionnement de chaque entreprise diffère, un gabarit ne peut
 * jamais tout prévoir. Toujours assignée dès la création (l'assignant
 * choisit directement qui), donc jamais "À assigner" comme les tâches
 * de gabarit peuvent l'être.
 */
export async function addCustomTask(employeeEventId: string, formData: FormData) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const event = await prisma.employeeEvent.findFirst({
    where: { id: employeeEventId, organizationId: membership.organizationId, deletedAt: null },
  });
  if (!event) throw new Error("Parcours introuvable dans cette organisation");

  const label = String(formData.get("label") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const assignedMembershipId = String(formData.get("assignedMembershipId") ?? "").trim();

  if (!label) throw new Error("Le libellé de la tâche est obligatoire.");
  if (!dueDateRaw || Number.isNaN(new Date(dueDateRaw).getTime())) {
    throw new Error("L'échéance n'est pas valide.");
  }
  if (!assignedMembershipId) throw new Error("Veuillez choisir un responsable.");

  const assignedMember = await prisma.membership.findFirst({
    where: { id: assignedMembershipId, organizationId: membership.organizationId, deletedAt: null },
  });
  if (!assignedMember) throw new Error("Cette personne ne fait pas partie de votre organisation.");

  const lastTask = await prisma.task.findFirst({
    where: { employeeEventId, organizationId: membership.organizationId },
    orderBy: { stepOrder: "desc" },
  });
  const nextStepOrder = (lastTask?.stepOrder ?? 0) + 1;

  await prisma.$transaction([
    prisma.task.create({
      data: {
        organizationId: membership.organizationId,
        employeeEventId,
        taskTemplateId: null,
        label,
        stepOrder: nextStepOrder,
        dueDate: new Date(dueDateRaw),
        deadlineType: "USER_DEFINED",
        resolutionRole: "MANAGER_DIRECT", // jamais affiché : la tâche est toujours déjà assignée
        assignedMembershipId,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "task.added_manually",
        entityType: "EmployeeEvent",
        entityId: employeeEventId,
        metadata: { label },
      },
    }),
  ]);

  redirect(`/dashboard/events/${employeeEventId}?flash=${encodeURIComponent("Tâche ajoutée")}`);
}

/**
 * Réordonnancement par échange avec la tâche voisine (flèches
 * monter/descendre) plutôt qu'un vrai glisser-déposer — plus simple,
 * plus sûr, sans nouvelle dépendance, largement suffisant pour un
 * parcours qui compte rarement plus de 10 étapes.
 */
export async function moveTask(taskId: string, direction: "up" | "down") {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: membership.organizationId },
  });
  if (!task) throw new Error("Tâche introuvable dans cette organisation");

  const siblings = await prisma.task.findMany({
    where: { employeeEventId: task.employeeEventId, organizationId: membership.organizationId },
    orderBy: { stepOrder: "asc" },
  });

  const currentIndex = siblings.findIndex((t) => t.id === taskId);
  const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return; // déjà en haut/bas, rien à faire

  const swapWith = siblings[swapIndex];

  await prisma.$transaction([
    prisma.task.update({ where: { id: task.id }, data: { stepOrder: swapWith.stepOrder } }),
    prisma.task.update({ where: { id: swapWith.id }, data: { stepOrder: task.stepOrder } }),
  ]);

  revalidatePath(`/dashboard/events/${task.employeeEventId}`);
}

/**
 * Modifier une étape, qu'elle vienne d'un gabarit standard ou d'un
 * ajout manuel — l'esprit copilote signifie qu'aucun parcours n'est
 * figé : si "Entretien d'intégration +30j" ne correspond pas à la
 * façon de faire d'une entreprise, le RH garde toujours la main pour
 * l'ajuster. Ne modifie jamais le gabarit lui-même, seulement cette
 * tâche précise, pour ce salarié précis.
 */
export async function updateCustomTask(taskId: string, formData: FormData) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: membership.organizationId },
    include: { employeeEvent: true },
  });
  if (!task) throw new Error("Tâche introuvable dans cette organisation");

  const label = String(formData.get("label") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const assignedMembershipId = String(formData.get("assignedMembershipId") ?? "").trim();
  const rememberForFuture = formData.get("rememberForFuture") === "on";

  if (!label) throw new Error("Le libellé de la tâche est obligatoire.");
  if (!dueDateRaw || Number.isNaN(new Date(dueDateRaw).getTime())) {
    throw new Error("L'échéance n'est pas valide.");
  }
  if (!assignedMembershipId) throw new Error("Veuillez choisir un responsable.");

  const assignedMember = await prisma.membership.findFirst({
    where: { id: assignedMembershipId, organizationId: membership.organizationId, deletedAt: null },
  });
  if (!assignedMember) throw new Error("Cette personne ne fait pas partie de votre organisation.");

  const newDueDate = new Date(dueDateRaw);

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.task.update({
      where: { id: taskId },
      data: { label, dueDate: newDueDate, assignedMembershipId },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "task.edited_manually",
        entityType: "Task",
        entityId: taskId,
        metadata: { newLabel: label },
      },
    }),
  ];

  // Mémoriser cette personnalisation pour les futurs parcours de ce
  // type — uniquement possible pour une étape issue d'un vrai gabarit
  // (une étape déjà manuelle n'a aucun gabarit à personnaliser), et
  // uniquement si le RH l'a explicitement demandé.
  if (rememberForFuture && task.taskTemplateId) {
    const offsetDays = Math.round(
      (newDueDate.getTime() - task.employeeEvent.triggerDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    operations.push(
      prisma.taskTemplateOverride.upsert({
        where: {
          organizationId_taskTemplateId: {
            organizationId: membership.organizationId,
            taskTemplateId: task.taskTemplateId,
          },
        },
        create: {
          organizationId: membership.organizationId,
          taskTemplateId: task.taskTemplateId,
          action: "MODIFIED",
          label,
          dueOffsetDays: offsetDays,
        },
        update: { action: "MODIFIED", label, dueOffsetDays: offsetDays },
      })
    );
  }

  await prisma.$transaction(operations);

  revalidatePath(`/dashboard/events/${task.employeeEventId}`);
  revalidatePath("/dashboard/configuration");
}

/**
 * Supprimer une étape, gabarit ou personnalisée — un vrai retrait,
 * pas juste un statut "Annulée" (toujours disponible séparément si un
 * RH préfère garder la trace qu'une étape existait sans être faite).
 * Le journal d'audit garde le libellé supprimé, pour ne jamais perdre
 * complètement la trace de ce qui a été retiré.
 */
export async function deleteCustomTask(taskId: string, rememberForFuture: boolean) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: membership.organizationId },
  });
  if (!task) throw new Error("Tâche introuvable dans cette organisation");

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.task.delete({ where: { id: taskId } }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "task.deleted_manually",
        entityType: "EmployeeEvent",
        entityId: task.employeeEventId,
        metadata: { deletedLabel: task.label },
      },
    }),
  ];

  // Ne plus jamais générer cette étape pour les futurs parcours de ce
  // type — uniquement pour une étape issue d'un vrai gabarit, et
  // uniquement si le RH l'a explicitement demandé.
  if (rememberForFuture && task.taskTemplateId) {
    operations.push(
      prisma.taskTemplateOverride.upsert({
        where: {
          organizationId_taskTemplateId: {
            organizationId: membership.organizationId,
            taskTemplateId: task.taskTemplateId,
          },
        },
        create: {
          organizationId: membership.organizationId,
          taskTemplateId: task.taskTemplateId,
          action: "REMOVED",
        },
        update: { action: "REMOVED", label: null, dueOffsetDays: null },
      })
    );
  }

  await prisma.$transaction(operations);

  revalidatePath(`/dashboard/events/${task.employeeEventId}`);
  revalidatePath("/dashboard/configuration");
}
