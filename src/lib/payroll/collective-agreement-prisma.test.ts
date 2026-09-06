import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  organization: {
    findUnique: vi.fn(),
  },
  payrollProfile: {
    findFirst: vi.fn(),
  },
  collectiveAgreement: {
    findUnique: vi.fn(),
  },
  collectiveAgreementVersion: {
    findMany: vi.fn(),
  },
  collectiveAgreementRule: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { resolveCollectiveAgreementFromPrisma } from "./collective-agreement-prisma";

describe("résolution conventionnelle depuis Prisma", () => {
  const periodDate = new Date("2026-09-01T00:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.organization.findUnique.mockResolvedValue({
      collectiveAgreementId: "org-agreement",
    });
    prismaMock.payrollProfile.findFirst.mockResolvedValue({
      collectiveAgreementId: "employee-agreement",
    });
    prismaMock.collectiveAgreement.findUnique.mockResolvedValue({
      id: "employee-agreement",
      status: "ACTIVE",
    });
    prismaMock.collectiveAgreementVersion.findMany.mockResolvedValue([
      {
        id: "version-1",
        collectiveAgreementId: "employee-agreement",
        version: 1,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: null,
        status: "VALIDATED",
      },
    ]);
    prismaMock.collectiveAgreementRule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        versionId: "version-1",
        code: "MINIMUM_SALARY",
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: null,
        status: "VALIDATED",
      },
    ]);
  });

  it("utilise la convention du profil salarié lorsqu'elle existe", async () => {
    const result = await resolveCollectiveAgreementFromPrisma({
      organizationId: "org-1",
      employeeId: "employee-1",
      periodDate,
      ruleCode: "MINIMUM_SALARY",
    });

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.collectiveAgreementId).toBe("employee-agreement");
      expect(result.version.id).toBe("version-1");
      expect(result.rule.code).toBe("MINIMUM_SALARY");
    }
  });

  it("retombe sur la convention de l'organisation sans convention salarié", async () => {
    prismaMock.payrollProfile.findFirst.mockResolvedValue({
      collectiveAgreementId: null,
    });
    prismaMock.collectiveAgreement.findUnique.mockResolvedValue({
      id: "org-agreement",
      status: "ACTIVE",
    });
    prismaMock.collectiveAgreementVersion.findMany.mockResolvedValue([
      {
        id: "version-org",
        collectiveAgreementId: "org-agreement",
        version: 3,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: null,
        status: "VALIDATED",
      },
    ]);
    prismaMock.collectiveAgreementRule.findMany.mockResolvedValue([
      {
        id: "rule-org",
        versionId: "version-org",
        code: "MINIMUM_SALARY",
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: null,
        status: "VALIDATED",
      },
    ]);

    const result = await resolveCollectiveAgreementFromPrisma({
      organizationId: "org-1",
      employeeId: "employee-1",
      periodDate,
      ruleCode: "MINIMUM_SALARY",
    });

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.collectiveAgreementId).toBe("org-agreement");
    }
  });

  it("reste UNRESOLVED si aucune version validée n'est disponible", async () => {
    prismaMock.collectiveAgreementVersion.findMany.mockResolvedValue([]);

    const result = await resolveCollectiveAgreementFromPrisma({
      organizationId: "org-1",
      employeeId: "employee-1",
      periodDate,
      ruleCode: "MINIMUM_SALARY",
    });

    expect(result).toEqual({
      status: "UNRESOLVED",
      code: "NO_VALIDATED_VERSION",
      message: expect.stringContaining("Aucune version validée"),
    });
  });
});
