import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentMemberships: vi.fn() }));

import { canUsePayroll, isPayrollEnabledFor } from "./payrollAccess";

const ORG = { id: "org_allowed", siret: "12345678900012" };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("accès anticipé à la paie", () => {
  it("ouvre la paie aux organisations listées par identifiant", () => {
    vi.stubEnv("PAYROLL_PREVIEW_ORGANIZATIONS", "org_other, org_allowed");
    expect(isPayrollEnabledFor(ORG)).toBe(true);
  });

  it("n'accepte jamais un SIRET dans la liste (public et non unique)", () => {
    vi.stubEnv("PAYROLL_PREVIEW_ORGANIZATIONS", "12345678900012");
    expect(isPayrollEnabledFor(ORG)).toBe(false);
  });

  it("reste fermée sans liste", () => {
    vi.stubEnv("PAYROLL_PREVIEW_ORGANIZATIONS", "");
    expect(isPayrollEnabledFor(ORG)).toBe(false);
  });

  it("s'ouvre à tous avec PAYROLL_ENABLED_FOR_ALL", () => {
    vi.stubEnv("PAYROLL_ENABLED_FOR_ALL", "true");
    expect(isPayrollEnabledFor(ORG)).toBe(true);
  });

  it("reste réservée aux propriétaires et administrateurs", () => {
    vi.stubEnv("PAYROLL_PREVIEW_ORGANIZATIONS", "org_allowed");
    expect(canUsePayroll({ accessRole: "OWNER", organizationId: ORG.id, organization: ORG })).toBe(true);
    expect(canUsePayroll({ accessRole: "ADMIN", organizationId: ORG.id, organization: ORG })).toBe(true);
    expect(canUsePayroll({ accessRole: "MEMBER", organizationId: ORG.id, organization: ORG })).toBe(false);
    expect(canUsePayroll(null)).toBe(false);
  });
});
