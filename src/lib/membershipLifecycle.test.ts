import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { releaseMembershipResponsibilities } from "@/lib/membershipLifecycle";

describe("releaseMembershipResponsibilities", () => {
  it("libère seulement les responsabilités encore actives", async () => {
    const taskUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const employeeUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      task: { updateMany: taskUpdateMany },
      employee: { updateMany: employeeUpdateMany },
    } as unknown as Prisma.TransactionClient;

    const result = await releaseMembershipResponsibilities(tx, {
      membershipId: "membership-1",
      organizationId: "org-1",
    });

    expect(taskUpdateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        assignedMembershipId: "membership-1",
        status: { notIn: ["DONE", "CANCELLED"] },
        employeeEvent: {
          deletedAt: null,
          employee: { deletedAt: null },
        },
      },
      data: { assignedMembershipId: null },
    });
    expect(employeeUpdateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        managerMembershipId: "membership-1",
        deletedAt: null,
      },
      data: { managerMembershipId: null },
    });
    expect(result).toEqual({
      releasedTaskCount: 2,
      releasedManagerEmployeeCount: 1,
    });
  });
});
