import { describe, expect, it } from "vitest";
import { resolveCollectiveAgreement } from "./collective-agreement-resolver";

describe("résolveur des conventions collectives", () => {
  const agreementId = "agreement-1";
  const version2026 = {
    id: "agreement-1-v2",
    collectiveAgreementId: agreementId,
    version: 2,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    status: "VALIDATED" as const,
  };
  const draftVersion = {
    id: "agreement-1-draft",
    collectiveAgreementId: agreementId,
    version: 99,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    status: "DRAFT" as const,
  };
  const rule = {
    id: "rule-1",
    versionId: version2026.id,
    code: "MINIMUM_SALARY",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    status: "VALIDATED" as const,
  };

  it("privilégie la convention du profil salarié", () => {
    const result = resolveCollectiveAgreement({
      organizationCollectiveAgreementId: "agreement-org",
      employeeCollectiveAgreementId: agreementId,
      periodDate: new Date("2026-06-01T00:00:00.000Z"),
      ruleCode: rule.code,
      versions: [version2026],
      rules: [rule],
    });

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.collectiveAgreementId).toBe(agreementId);
      expect(result.version.id).toBe(version2026.id);
      expect(result.rule.id).toBe(rule.id);
    }
  });

  it("utilise la convention de l'organisation en l'absence de convention sur le profil", () => {
    const result = resolveCollectiveAgreement({
      organizationCollectiveAgreementId: agreementId,
      employeeCollectiveAgreementId: null,
      periodDate: new Date("2026-06-01T00:00:00.000Z"),
      ruleCode: rule.code,
      versions: [version2026],
      rules: [rule],
    });

    expect(result.status).toBe("RESOLVED");
  });

  it("refuse de résoudre sans convention", () => {
    const result = resolveCollectiveAgreement({
      organizationCollectiveAgreementId: null,
      employeeCollectiveAgreementId: null,
      periodDate: new Date("2026-06-01T00:00:00.000Z"),
      ruleCode: rule.code,
      versions: [version2026],
      rules: [rule],
    });

    expect(result).toMatchObject({
      status: "UNRESOLVED",
      code: "NO_COLLECTIVE_AGREEMENT",
    });
  });

  it("ignore les versions non validées", () => {
    const result = resolveCollectiveAgreement({
      organizationCollectiveAgreementId: agreementId,
      periodDate: new Date("2026-06-01T00:00:00.000Z"),
      ruleCode: rule.code,
      versions: [draftVersion],
      rules: [rule],
    });

    expect(result).toMatchObject({
      status: "UNRESOLVED",
      code: "NO_VALIDATED_VERSION",
    });
  });

  it("respecte les bornes de validité des versions", () => {
    const historicalVersion = {
      ...version2026,
      id: "agreement-1-v1",
      version: 1,
      validFrom: new Date("2025-01-01T00:00:00.000Z"),
      validUntil: new Date("2025-12-31T00:00:00.000Z"),
    };

    const result = resolveCollectiveAgreement({
      organizationCollectiveAgreementId: agreementId,
      periodDate: new Date("2025-06-01T00:00:00.000Z"),
      ruleCode: rule.code,
      versions: [historicalVersion, version2026],
      rules: [rule],
    });

    expect(result).toMatchObject({
      status: "UNRESOLVED",
      code: "NO_VALIDATED_RULE",
    });
  });

  it("ignore les règles non validées", () => {
    const result = resolveCollectiveAgreement({
      organizationCollectiveAgreementId: agreementId,
      periodDate: new Date("2026-06-01T00:00:00.000Z"),
      ruleCode: rule.code,
      versions: [version2026],
      rules: [{ ...rule, status: "DRAFT" }],
    });

    expect(result).toMatchObject({
      status: "UNRESOLVED",
      code: "NO_VALIDATED_RULE",
    });
  });

  it("sélectionne la version validée la plus récente applicable", () => {
    const version2027 = {
      ...version2026,
      id: "agreement-1-v3",
      version: 3,
      validFrom: new Date("2027-01-01T00:00:00.000Z"),
    };

    const result = resolveCollectiveAgreement({
      organizationCollectiveAgreementId: agreementId,
      periodDate: new Date("2027-06-01T00:00:00.000Z"),
      ruleCode: rule.code,
      versions: [version2026, version2027],
      rules: [{ ...rule, versionId: version2027.id }],
    });

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.version.version).toBe(3);
      expect(result.rule.versionId).toBe(version2027.id);
    }
  });
});
