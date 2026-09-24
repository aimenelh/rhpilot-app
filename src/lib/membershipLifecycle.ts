import type { Prisma } from "@prisma/client";
import { ACTIVE_TASK_SCOPE } from "@/lib/activeTaskScope";

export async function releaseMembershipResponsibilities(
  tx: Prisma.TransactionClient,
  {
    membershipId,
    organizationId,
  }: {
    membershipId: string;
    organizationId: string;
  }
): Promise<{ releasedTaskCount: number; releasedManagerEmployeeCount: number }> {
  // Les tâches terminées/annulées conservent leur responsable historique.
  // Seules les responsabilités encore opérationnelles sont libérées.
  const releasedTasks = await tx.task.updateMany({
    where: {
      organizationId,
      assignedMembershipId: membershipId,
      status: { notIn: ["DONE", "CANCELLED"] },
      ...ACTIVE_TASK_SCOPE,
    },
    data: { assignedMembershipId: null },
  });

  // Même logique pour le management : les salariés archivés gardent leur
  // historique, mais aucun salarié actif ne doit pointer vers un membre parti.
  const releasedManagers = await tx.employee.updateMany({
    where: {
      organizationId,
      managerMembershipId: membershipId,
      deletedAt: null,
    },
    data: { managerMembershipId: null },
  });

  return {
    releasedTaskCount: releasedTasks.count,
    releasedManagerEmployeeCount: releasedManagers.count,
  };
}
