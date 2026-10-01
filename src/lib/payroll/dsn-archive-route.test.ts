import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  membership: vi.fn(), user: vi.fn(), find: vi.fn(), create: vi.fn(), open: vi.fn(),
}));
vi.mock("@/lib/payrollAccess", () => ({ getPayrollMembership: mocks.membership }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { dsn_declarations: { findFirst: mocks.find } } }));
vi.mock("./dsn-archive-server", () => ({ createDsnPrecontrolArchive: mocks.create }));
vi.mock("./dsn-archive", () => ({ openDsnArchive: mocks.open }));
import { GET, POST } from "@/app/api/payroll/periods/[periodId]/dsn/route";

const requestKey = "12345678-1234-4234-8234-123456789012";
const params = { params: { periodId: "period-a" } };
const archived = { id: "archive-a", fileName: "test-v1.txt", normVersion: "P26V01", sha256: "a".repeat(64) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ organizationId: "company-a", accessRole: "ADMIN" });
  mocks.user.mockResolvedValue({ id: "actor-a" });
  mocks.open.mockReturnValue(Buffer.from("exact\\r\\n", "latin1"));
});
const post = (origin = "https://www.rhpilot.fr", mode = "test") => new Request("https://www.rhpilot.fr/api/payroll/periods/period-a/dsn", { method: "POST",
  headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ requestKey, mode }) });
describe("routes des archives DSN", () => {
  it("refuse une session absente et un membre sans droit administratif", async () => {
    mocks.membership.mockResolvedValueOnce(null);
    expect((await GET(new Request("https://www.rhpilot.fr/api/test"), params)).status).toBe(401);
    mocks.membership.mockResolvedValueOnce({ organizationId: "company-a", accessRole: "MEMBER" });
    expect((await POST(post(), params)).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("filtre chaque téléchargement par entreprise, période et archive", async () => {
    mocks.find.mockResolvedValue(archived);
    const response = await GET(new Request("https://www.rhpilot.fr/api/test?archiveId=archive-a"), params);
    expect(mocks.find).toHaveBeenCalledWith({ where: { organizationId: "company-a", payrollPeriodId: "period-a", id: "archive-a" }, orderBy: { version: "desc" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-rh-pilot-dsn-sha256")).toBe(archived.sha256);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("retourne 404 sans générer un nouveau fichier quand une archive est absente", async () => {
    mocks.find.mockResolvedValue(null);
    expect((await GET(new Request("https://www.rhpilot.fr/api/test"), params)).status).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuse une origine étrangère et un dépôt réel", async () => {
    expect((await POST(post("https://other.example"), params)).status).toBe(403);
    expect((await POST(post("https://www.rhpilot.fr", "real"), params)).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("crée uniquement un pré-contrôle avec l'identité de session et une clé de requête", async () => {
    mocks.create.mockResolvedValue(archived);
    const response = await POST(post(), params);
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith({ organizationId: "company-a", periodId: "period-a", actorUserId: "actor-a", requestKey });
  });
});
