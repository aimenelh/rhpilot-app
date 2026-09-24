import { describe, expect, it } from "vitest";
import {
  employeeAccessWhere,
  eventAccessWhere,
  isOrganizationAdmin,
  taskAccessWhere,
} from "@/lib/accessPolicy";

const owner = {
  id: "owner-1",
  organizationId: "org-1",
  accessRole: "OWNER" as const,
};

const member = {
  id: "member-1",
  organizationId: "org-1",
  accessRole: "MEMBER" as const,
};

describe("accessPolicy", () => {
  it("donne le périmètre organisation complet à OWNER/ADMIN", () => {
    expect(isOrganizationAdmin(owner)).toBe(true);
    expect(employeeAccessWhere(owner)).toEqual({});
    expect(eventAccessWhere(owner)).toEqual({});
    expect(taskAccessWhere(owner)).toEqual({});
  });

  it("limite un MEMBER aux salariés managés ou liés à ses tâches", () => {
    expect(employeeAccessWhere(member)).toEqual({
      OR: [
        { managerMembershipId: "member-1" },
        {
          events: {
            some: {
              deletedAt: null,
              tasks: { some: { assignedMembershipId: "member-1" } },
            },
          },
        },
      ],
    });
  });

  it("limite un MEMBER aux tâches assignées ou aux salariés qu'il manage", () => {
    expect(taskAccessWhere(member)).toEqual({
      OR: [
        { assignedMembershipId: "member-1" },
        { employeeEvent: { employee: { managerMembershipId: "member-1" } } },
      ],
    });
  });
});
