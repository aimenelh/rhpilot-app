import { describe, expect, it } from "vitest";
import { billableEmployeeWhere } from "@/lib/billingEmployeeScope";

describe("billableEmployeeWhere", () => {
  it("exclut toujours les salariés de démonstration", () => {
    expect(billableEmployeeWhere("org-1")).toEqual({
      organizationId: "org-1",
      deletedAt: null,
      isDemoData: false,
    });
  });
});
