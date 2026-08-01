"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { sendManualReminder as sendManualReminderLogic, sendDueDigests } from "@/lib/notifications";
import type { NotificationFrequency } from "@prisma/client";

const ALLOWED_FREQUENCIES: NotificationFrequency[] = ["DAILY", "WEEKLY", "OFF"];

export async function updateNotificationPreference(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Aucune organisation active");

  const frequency = String(formData.get("notificationFrequency") ?? "");
  if (!ALLOWED_FREQUENCIES.includes(frequency as NotificationFrequency)) {
    throw new Error("Préférence invalide");
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { notificationFrequency: frequency as NotificationFrequency },
  });

  redirect(
    `/dashboard/settings?flash=${encodeURIComponent("Préférence enregistrée")}`
  );
}

export async function sendManualReminder(taskId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const result = await sendManualReminderLogic({
    taskId,
    organizationId: membership.organizationId,
    actorUserId: user.id,
  });

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: membership.organizationId },
  });

  const message = result.ok
    ? "Rappel envoyé"
    : `Échec de l'envoi : ${result.error}`;

  redirect(
    `/dashboard/events/${task?.employeeEventId ?? ""}?flash=${encodeURIComponent(message)}`
  );
}

export async function sendDigestsNow() {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Aucune organisation active");

  const results = await sendDueDigests(membership.organizationId);

  const message = `${results.sent} résumé(s) envoyé(s), ${results.skippedEmpty} personne(s) sans rien à signaler${results.failed > 0 ? `, ${results.failed} échec(s)` : ""}`;

  redirect(`/dashboard/notifications?flash=${encodeURIComponent(message)}`);
}
