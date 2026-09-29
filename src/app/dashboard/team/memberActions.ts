"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { AccessRole, FunctionalRole } from "@prisma/client";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseMembershipResponsibilities } from "@/lib/membershipLifecycle";
import { teamManagementError } from "@/lib/teamManagementPolicy";
import { userFacingError } from "@/lib/userFacingError";
export type MemberActionState = { error?: string; success?: string } | undefined;
export async function manageMember(_previous: MemberActionState, data: FormData): Promise<MemberActionState> {
 try {
  const current = await getCurrentMembership();
  if (!current) return { error: "Session expirée." };
  const memberId = String(data.get("memberId") ?? "");
  const operation = String(data.get("operation") ?? "update");
  if (!["update", "remove"].includes(operation)) return { error: "Action invalide." };
  const accessRole = String(data.get("accessRole") ?? "MEMBER");
  const functionalRole = String(data.get("functionalRole") ?? "");
  if (operation === "update" && !["", "RH", "DIRIGEANT"].includes(functionalRole)) return { error: "Fonction invalide." };
  await prisma.$transaction(async tx => {
   // Serialize changes and re-read permissions inside the transaction.
   await tx.$queryRaw`SELECT "id" FROM "organizations" WHERE "id" = ${current.organizationId} FOR UPDATE`;
   const [actor, target] = await Promise.all([
    tx.membership.findFirst({ where: { id: current.id, organizationId: current.organizationId, deletedAt: null } }),
    tx.membership.findFirst({ where: { id: memberId, organizationId: current.organizationId, deletedAt: null } }),
   ]);
   const error = teamManagementError(actor, target, operation === "update" ? accessRole : undefined);
   if (error) throw new Error(error);
   if (!actor || !target) throw new Error("Membre introuvable.");
   let released: { releasedTaskCount: number; releasedManagerEmployeeCount: number } | undefined;
   if (operation === "remove") {
    released = await releaseMembershipResponsibilities(tx, { organizationId: current.organizationId, membershipId: target.id });
    await tx.membership.update({ where: { id: target.id }, data: { deletedAt: new Date() } });
   } else {
    await tx.membership.update({ where: { id: target.id }, data: { accessRole: accessRole as AccessRole, functionalRole: functionalRole ? functionalRole as FunctionalRole : null } });
   }
   await tx.auditLog.create({ data: { id: randomUUID(), organizationId: current.organizationId, actorUserId: actor.userId, action: operation === "remove" ? "membership.removed" : "membership.role.updated", entityType: "Membership", entityId: target.id, metadata: { previousAccessRole: target.accessRole, previousFunctionalRole: target.functionalRole, ...(operation === "update" ? { accessRole, functionalRole } : released) } } });
  });
  revalidatePath("/dashboard", "layout");
  return { success: operation === "remove" ? "Accès retiré. Les responsabilités actives sont à réattribuer." : "Rôle mis à jour." };
 } catch (error) { return { error: userFacingError(error, "Impossible de modifier ce membre.") }; }
}
