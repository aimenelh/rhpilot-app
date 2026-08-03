"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { triggerEmployeeEvent } from "@/lib/eventEngine";
import type { TaskStatus } from "@prisma/client";

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
