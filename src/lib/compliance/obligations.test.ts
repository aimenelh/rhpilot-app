import { describe, expect, it } from "vitest";
import { buildComplianceSnapshot } from "@/lib/compliance/obligations";

describe("obligations Europe/Paris", () => {
  it("ne classe pas une échéance due aujourd'hui comme déjà en retard", () => {
    const employees = Array.from({ length: 11 }, (_, index) => ({
      id: `employee-${index}`,
      firstName: "Test",
      lastName: String(index),
      hireDate: new Date("2020-01-01T00:00:00.000Z"),
    }));

    const snapshot = buildComplianceSnapshot({
      organizationId: "org-1",
      employees,
      tracking: {
        organization: {
          duerpLastUpdatedAt: "2025-09-24",
          cseThresholdReachedAt: null,
          cseStatus: "UNKNOWN",
          cseLastElectionAt: null,
        },
        employees: {},
      },
      now: new Date("2026-09-23T22:30:00.000Z"),
    });

    const duerp = snapshot.items.find((item) => item.ruleKey === "FR.DUERP.UPDATE");
    expect(duerp?.dueDate).toBe("2026-09-24");
    expect(duerp?.status).toBe("UPCOMING");
  });
});
