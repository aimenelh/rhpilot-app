import type { Membership, Prisma } from "@prisma/client";

export type MembershipAccess = Pick<Membership, "id" | "organizationId" | "accessRole">;

export function isOrganizationAdmin(
  membership: Pick<MembershipAccess, "accessRole">
): boolean {
  return membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
}

export function employeeAccessWhere(
  membership: MembershipAccess
): Prisma.EmployeeWhereInput {
  if (isOrganizationAdmin(membership)) return {};
  return {
    OR: [
      { managerMembershipId: membership.id },
      {
        events: {
          some: {
            deletedAt: null,
            tasks: { some: { assignedMembershipId: membership.id } },
          },
        },
      },
    ],
  };
}

export function eventAccessWhere(
  membership: MembershipAccess
): Prisma.EmployeeEventWhereInput {
  if (isOrganizationAdmin(membership)) return {};
  return {
    OR: [
      { employee: { managerMembershipId: membership.id } },
      { tasks: { some: { assignedMembershipId: membership.id } } },
    ],
  };
}

export function taskAccessWhere(
  membership: MembershipAccess
): Prisma.TaskWhereInput {
  if (isOrganizationAdmin(membership)) return {};
  return {
    OR: [
      { assignedMembershipId: membership.id },
      { employeeEvent: { employee: { managerMembershipId: membership.id } } },
    ],
  };
}

export function canUpdateTask(
  membership: MembershipAccess,
  task: {
    assignedMembershipId: string | null;
    employeeEvent: { employee: { managerMembershipId: string | null } };
  }
): boolean {
  return (
    isOrganizationAdmin(membership) ||
    task.assignedMembershipId === membership.id ||
    task.employeeEvent.employee.managerMembershipId === membership.id
  );
}
