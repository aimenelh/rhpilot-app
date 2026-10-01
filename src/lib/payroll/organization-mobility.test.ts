import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), fetch: vi.fn(), lookup: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mocks.query, $executeRaw: mocks.execute } }));
vi.mock("@/lib/company-registry", () => ({ lookupCommuneCode: mocks.lookup }));
vi.mock("./mobility-rate", () => ({ fetchMobilityRate: mocks.fetch, describeMobilityRate: () => "Barème test" }));
import { resolvePeriodMobilityRate } from "./organization-mobility";

const input = { organizationId: "company-a", periodFirstDay: "2026-01-01", headcount: 15 };
const row = { mobilityRate: 1.85, mobilityRateSource: "URSSAF", mobilityRateCheckedAt: new Date("2026-01-01"), payrollCommuneCode: "75101", payrollCity: "Paris", payrollPostalCode: "75001" };
beforeEach(() => { vi.clearAllMocks(); mocks.query.mockResolvedValue([row]); });
describe("provenance mobilité conservée pour la DSN", () => {
  it("conserve la ventilation Urssaf et l'arrondissement de travail malgré le barème de la ville parente", async () => {
    mocks.fetch.mockResolvedValue({ status: "RESOLVED", ratePercent: 1.85, communeCode: "75056", communeName: "Paris", validFrom: "2026-01-01", validUntil: null,
      components: { vm: 1.2, vma: 0.5, vmr: 0.15 }, applicable: true });
    const result = await resolvePeriodMobilityRate(input);
    expect(result.dsnDetails).toEqual({ source: "URSSAF", communeCode: "75101", validFrom: "2026-01-01", validUntil: null, components: { vm: 1.2, vma: 0.5, vmr: 0.15 } });
    expect(result.ratePercent).toBe(1.85);
    expect(mocks.fetch).toHaveBeenCalledWith("75101", "2026-01-01");
  });
  it("ne fabrique pas une ventilation à partir du seul taux manuel", async () => {
    mocks.query.mockResolvedValue([{ ...row, mobilityRateSource: "MANUEL" }]);
    expect(await resolvePeriodMobilityRate(input)).toEqual({ ratePercent: 1.85, warning: null, dsnDetails: null });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("préserve le calcul de repli mais signale que la ventilation déclarative manque", async () => {
    mocks.fetch.mockResolvedValue({ status: "UNAVAILABLE", message: "Indisponible" });
    const result = await resolvePeriodMobilityRate(input);
    expect(result.ratePercent).toBe(1.85);
    expect(result.warning).toMatch(/dernier taux connu/);
    expect(result.dsnDetails).toBeNull();
  });
});
