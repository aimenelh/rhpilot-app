"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";

const SNOOZE_DAYS = 3;

/**
 * "Plus tard" ou "Ignorer" sur une suggestion précise. Jamais une
 * suppression : la ligne reste, elle permet à tout moment de revenir
 * en arrière en la supprimant simplement (voir la page Configuration
 * à venir), et elle s'efface d'elle-même dès que la clé change (par
 * exemple une fois l'action réellement faite).
 */
export async function dismissAnomaly(anomalyKey: string, mode: "later" | "ignore") {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");

  const snoozedUntil =
    mode === "later" ? new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000) : null;

  await prisma.anomalyDismissal.upsert({
    where: { organizationId_anomalyKey: { organizationId: membership.organizationId, anomalyKey } },
    create: {
      id: randomUUID(),
      organizationId: membership.organizationId,
      anomalyKey,
      snoozedUntil,
      dismissedByUserId: user.id,
    },
    update: { snoozedUntil, dismissedByUserId: user.id, createdAt: new Date() },
  });

  revalidatePath("/dashboard");
}
