import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ membership: vi.fn(), user: vi.fn(), find: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: mock.membership, getCurrentUser: mock.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { task: { findFirst: mock.find, update: mock.update }, auditLog: { create: mock.audit }, $transaction: mock.transaction } }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
import { completeDashboardTask } from "./events/actions";

describe("terminer une action depuis le tableau de bord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.membership.mockResolvedValue({ id: "member", organizationId: "org", accessRole: "MEMBER" });
    mock.user.mockResolvedValue({ id: "user" });
    mock.find.mockResolvedValue({ id: "task", employeeEventId: "event", assignedMembershipId: "member", proofRequired: false, employeeEvent: { employee: { managerMembershipId: null } } });
    mock.update.mockReturnValue(Promise.resolve({}));
    mock.audit.mockReturnValue(Promise.resolve({}));
    mock.transaction.mockResolvedValue([]);
  });
  it("refuse une session absente avant toute écriture", async () => {
    mock.membership.mockResolvedValue(null);
    expect(await completeDashboardTask("task", undefined, new FormData())).toHaveProperty("error");
    expect(mock.find).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("limite la lecture à l'organisation active et aux dossiers non archivés", async () => {
    mock.find.mockResolvedValue(null);
    expect(await completeDashboardTask("foreign-task", undefined, new FormData())).toHaveProperty("error");
    expect(mock.find.mock.calls[0][0].where).toMatchObject({ id: "foreign-task", organizationId: "org", employeeEvent: { deletedAt: null, employee: { deletedAt: null } } });
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("refuse un membre qui n'est ni responsable du salarié ni assigné à l'étape", async () => {
    mock.find.mockResolvedValue({ id: "task", assignedMembershipId: "another", employeeEvent: { employee: { managerMembershipId: "another" } } });
    expect(await completeDashboardTask("task", undefined, new FormData())).toHaveProperty("error");
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("renvoie les étapes avec preuve vers leur parcours", async () => {
    mock.find.mockResolvedValue({ id: "task", assignedMembershipId: "member", proofRequired: true, employeeEvent: { employee: { managerMembershipId: null } } });
    expect(await completeDashboardTask("task", undefined, new FormData())).toHaveProperty("error");
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("enregistre le statut et l'audit ensemble puis rafraîchit le tableau de bord", async () => {
    const form = new FormData(); form.set("status", "CANCELLED");
    expect(await completeDashboardTask("task", undefined, form)).toBeUndefined();
    expect(mock.update.mock.calls[0][0].data).toMatchObject({ status: "DONE", completedAt: expect.any(Date) });
    expect(mock.audit.mock.calls[0][0].data).toMatchObject({ organizationId: "org", actorUserId: "user", entityId: "task", metadata: { status: "DONE" } });
    expect(mock.transaction).toHaveBeenCalledOnce();
    expect(mock.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
    expect(mock.revalidate).toHaveBeenCalledWith("/dashboard/events/event");
  });
});
