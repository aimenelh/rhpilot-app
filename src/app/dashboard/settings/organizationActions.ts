"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

export async function updateConventionCollective(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  }

  const raw = String(formData.get("conventionCollective") ?? "").trim();

  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: { conventionCollective: raw || null },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
}
