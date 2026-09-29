"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Mémorise sur le compte que la visite de découverte a été vue ou passée. */
export async function markDiscoveryTourCompleted(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { discoveryTourCompletedAt: new Date() } }).catch(() => undefined);
}
