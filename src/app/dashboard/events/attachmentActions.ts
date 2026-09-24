"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { storeTaskAttachment } from "@/lib/task-attachment-storage";
import { taskAccessWhere } from "@/lib/accessPolicy";

export type TaskAttachmentActionState =
  | { success?: string; error?: string }
  | undefined;

export async function uploadTaskAttachment(
  taskId: string,
  _prevState: TaskAttachmentActionState,
  formData: FormData,
): Promise<TaskAttachmentActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    return { error: "Session expirée, veuillez recharger la page." };
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: membership.organizationId,
      employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
      ...taskAccessWhere(membership),
    },
    select: {
      id: true,
      employeeEventId: true,
      status: true,
      proofLabel: true,
    },
  });

  if (!task) return { error: "Cette tâche n'est plus active." };
  if (task.status === "CANCELLED") {
    return { error: "Impossible d'ajouter une pièce à une tâche annulée." };
  }
  if (!task.proofLabel) {
    return { error: "Aucune pièce n'est attendue pour cette tâche." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Sélectionnez un fichier." };

  let stored: ReturnType<typeof storeTaskAttachment>;
  try {
    stored = storeTaskAttachment(Buffer.from(await file.arrayBuffer()), file.type);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Le document n'a pas pu être enregistré.",
    };
  }

  try {
    await prisma.$transaction([
      prisma.attachment.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organizationId,
          taskId: task.id,
          storageKey: stored.storageKey,
          fileName: file.name.slice(0, 255) || "document",
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          uploadedByMembershipId: membership.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organizationId,
          actorUserId: user.id,
          action: "task.attachment_uploaded",
          entityType: "Task",
          entityId: task.id,
          metadata: {
            fileName: file.name.slice(0, 255),
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
          },
        },
      }),
    ]);
  } catch (error) {
    console.error("Dépôt de pièce de tâche échoué :", error);
    return { error: "La pièce n'a pas pu être enregistrée. Réessayez dans un instant." };
  }

  revalidatePath(`/dashboard/events/${task.employeeEventId}`);
  return { success: "Pièce ajoutée." };
}

export async function deleteTaskAttachment(attachmentId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const attachment = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      organizationId: membership.organizationId,
      task: taskAccessWhere(membership),
    },
    include: {
      task: { select: { id: true, employeeEventId: true } },
    },
  });

  if (!attachment) throw new Error("Pièce introuvable dans cette organisation.");

  const isAdmin = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const isUploader = attachment.uploadedByMembershipId === membership.id;
  if (!isAdmin && !isUploader) {
    throw new Error("Vous ne pouvez supprimer que les pièces que vous avez déposées.");
  }

  await prisma.$transaction([
    prisma.attachment.delete({ where: { id: attachment.id } }),
    prisma.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "task.attachment_deleted",
        entityType: "Task",
        entityId: attachment.task.id,
        metadata: {
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        },
      },
    }),
  ]);

  revalidatePath(`/dashboard/events/${attachment.task.employeeEventId}`);
}
