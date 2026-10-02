import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ membership: vi.fn(), user: vi.fn(), find: vi.fn(), create: vi.fn(), open: vi.fn() }));
vi.mock("@/lib/payrollAccess", () => ({ getPayrollMembership: mocks.membership }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { dsn_work_events: { findFirst: mocks.find } } }));
vi.mock("./dsn-work-event-server", () => ({ createDsnWorkEventArchive: mocks.create }));
vi.mock("./dsn-work-event-archive", () => ({ openDsnWorkEventArchive: mocks.open }));
import { GET, POST } from "@/app/api/payroll/absences/[absenceId]/dsn/route";

const params = { params: { absenceId: "absence-a" } };
const requestKey = "12345678-1234-4234-8234-123456789012";
const archive = { id: "archive-a", nature: "04", fileName: "arret-test.txt", normVersion: "P26V01", sha256: "a".repeat(64) };
const post = (payload: unknown = { mode: "test", nature: "04", requestKey }, origin = "https://www.rhpilot.fr") => new Request("https://www.rhpilot.fr/api/payroll/absences/absence-a/dsn", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ organizationId: "company-a", accessRole: "ADMIN" });
  mocks.user.mockResolvedValue({ id: "actor-a" });
  mocks.open.mockReturnValue(Buffer.from("exact\r\n", "latin1"));
});
describe("routes des signalements DSN", () => {
  it("exige la session et les droits administratifs", async () => {
    mocks.membership.mockResolvedValueOnce(null);
    expect((await GET(new Request("https://www.rhpilot.fr/api/test"), params)).status).toBe(401);
    mocks.membership.mockResolvedValueOnce({ organizationId: "company-a", accessRole: "MEMBER" });
    expect((await POST(post(), params)).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("filtre le téléchargement par entreprise, absence et version sans regénérer", async () => {
    mocks.find.mockResolvedValue(archive);
    const response = await GET(new Request("https://www.rhpilot.fr/api/test?archiveId=archive-a"), params);
    expect(mocks.find).toHaveBeenCalledWith({ where: { organizationId: "company-a", absenceId: "absence-a", id: "archive-a" }, orderBy: { createdAt: "desc" } });
    expect(response.headers.get("x-rh-pilot-dsn-nature")).toBe("04");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).toBe("exact\r\n");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuse le réel et une origine étrangère", async () => {
    expect((await GET(new Request("https://www.rhpilot.fr/api/test?mode=real"), params)).status).toBe(409);
    expect((await POST(post({ mode: "real", nature: "04", requestKey }), params)).status).toBe(409);
    expect((await POST(post(undefined, "https://other.example"), params)).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("valide la nature et la clé de requête, puis archive avec l'identité authentifiée", async () => {
    expect((await POST(post({ mode: "test", nature: "07", requestKey }), params)).status).toBe(400);
    expect((await POST(post({ mode: "test", nature: "04", requestKey: "invalid" }), params)).status).toBe(400);
    mocks.create.mockResolvedValue(archive);
    expect((await POST(post(), params)).status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith({ organizationId: "company-a", absenceId: "absence-a", nature: "04", requestKey, actorUserId: "actor-a" });
  });
  it("signale une archive absente et un contrôle métier bloquant", async () => {
    mocks.find.mockResolvedValue(null);
    expect((await GET(new Request("https://www.rhpilot.fr/api/test"), params)).status).toBe(404);
    mocks.create.mockRejectedValue(new Error("DSN bloquée : reprise non anticipée."));
    const response = await POST(post(), params);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "DSN bloquée : reprise non anticipée." });
  });
});
