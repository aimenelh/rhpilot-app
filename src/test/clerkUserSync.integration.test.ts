import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { authState, clerkUserLookup } from "@/test/mockAuth";
import { getCurrentUser, getCurrentMemberships } from "@/lib/auth";
import { syncClerkUser } from "@/lib/clerkUserSync";
import { activateEmployeeAccount, findInvitationByToken, invitationProblem } from "@/lib/employee-space/invitations";
import { getEmployeeSessionState } from "@/lib/employee-space/session";
import { newInviteToken } from "@/lib/employee-space/tokens";

vi.mock("next/headers", () => ({ cookies: () => ({ get: () => undefined }) }));

const prefix = `sync-${randomUUID()}`;
let sequence = 0;
function identity(email = `${prefix}-${sequence++}@example.test`, verified = true) {
  return { id: `${prefix}-${sequence++}`, primaryEmailAddressId: "primary", emailAddresses: [{ id: "primary", emailAddress: email, verification: { status: verified ? "verified" : "unverified" } }], firstName: "Léa", lastName: "Test" };
}

beforeEach(() => {
  authState.userId = null;
  clerkUserLookup.mockReset();
});

afterAll(async () => {
  authState.userId = null;
  await prisma.employee_accounts.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.employee.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.organization.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix, mode: "insensitive" } } });
});

describe("initialisation d'un compte salarié sans dépendre du webhook", () => {
  it("répare un email déjà en base puis active uniquement l'espace du salarié invité", async () => {
    const remote = identity();
    const local = await prisma.user.create({ data: { email: remote.emailAddresses[0].emailAddress.toUpperCase() } });
    const organization = await prisma.organization.create({ data: { name: `${prefix}-employeur` } });
    const employee = await prisma.employee.create({ data: { id: `${prefix}-employee`, organizationId: organization.id, firstName: "Léa", lastName: "Test", hireDate: new Date("2026-09-01"), contractType: "CDI" } });
    const { token, hash } = newInviteToken();
    const account = await prisma.employee_accounts.create({ data: { id: `${prefix}-account`, organizationId: organization.id, employeeId: employee.id, email: remote.emailAddresses[0].emailAddress, inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + 86400000) } });
    clerkUserLookup.mockResolvedValue(remote);
    authState.userId = remote.id;

    const user = await getCurrentUser();
    expect(user?.id).toBe(local.id);
    expect(user?.authProviderId).toBe(remote.id);
    const invitation = await findInvitationByToken(token);
    expect(invitationProblem(invitation, user!.email)).toBeNull();
    expect(await activateEmployeeAccount(account.id, user!.id, user!.email)).toBe(true);
    expect(await activateEmployeeAccount(account.id, user!.id, user!.email)).toBe(false);
    expect(await findInvitationByToken(token)).toBeNull();
    const session = await getEmployeeSessionState();
    expect(session.state).toBe("ready");
    if (session.state === "ready") expect(session.account.employeeId).toBe(employee.id);
    expect((await getCurrentMemberships()).memberships).toEqual([]);
  });

  it("crée le compte si la première connexion arrive avant le webhook, puis reste idempotent", async () => {
    const remote = identity();
    clerkUserLookup.mockResolvedValue(remote);
    authState.userId = remote.id;
    const first = await getCurrentUser();
    expect((await syncClerkUser(remote.id))?.id).toBe(first?.id);
    expect(await prisma.user.count({ where: { authProviderId: remote.id } })).toBe(1);
  });

  it("arbitre le webhook et la première connexion simultanés", async () => {
    const remote = identity();
    clerkUserLookup.mockResolvedValue(remote);
    const users = await Promise.all(Array.from({ length: 4 }, () => syncClerkUser(remote.id)));
    expect(new Set(users.map((user) => user?.id)).size).toBe(1);
  });

  it("répare une ancienne identité uniquement après confirmation de sa disparition dans Clerk", async () => {
    const remote = identity();
    const old = `${prefix}-old`;
    const local = await prisma.user.create({ data: { email: remote.emailAddresses[0].emailAddress, authProviderId: old } });
    clerkUserLookup.mockImplementation(async (id) => {
      if (id === old) throw { status: 404 };
      return remote;
    });
    expect((await syncClerkUser(remote.id))?.id).toBe(local.id);
    // Une livraison tardive de l'ancien compte ne peut pas reprendre la liaison.
    expect(await syncClerkUser(old)).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: local.id } })).authProviderId).toBe(remote.id);
  });

  it("ne reprend jamais une identité encore active", async () => {
    const remote = identity();
    const old = `${prefix}-active`;
    const local = await prisma.user.create({ data: { email: remote.emailAddresses[0].emailAddress, authProviderId: old } });
    clerkUserLookup.mockImplementation(async (id) => id === old ? { id: old } : remote);
    await expect(syncClerkUser(remote.id)).rejects.toThrow("autre compte");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: local.id } })).authProviderId).toBe(old);
  });

  it("une erreur Clerk ne vaut pas confirmation de suppression", async () => {
    const remote = identity();
    const old = `${prefix}-unavailable`;
    const local = await prisma.user.create({ data: { email: remote.emailAddresses[0].emailAddress, authProviderId: old } });
    clerkUserLookup.mockImplementation(async (id) => {
      if (id === old) throw { status: 503 };
      return remote;
    });
    await expect(syncClerkUser(remote.id)).rejects.toEqual({ status: 503 });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: local.id } })).authProviderId).toBe(old);
  });

  it("refuse un email non vérifié et un compte local désactivé", async () => {
    const unverified = identity(undefined, false);
    clerkUserLookup.mockResolvedValue(unverified);
    await expect(syncClerkUser(unverified.id)).rejects.toThrow("Vérifiez");
    expect(await prisma.user.count({ where: { authProviderId: unverified.id } })).toBe(0);
    const remote = identity();
    const local = await prisma.user.create({ data: { email: remote.emailAddresses[0].emailAddress, deletedAt: new Date() } });
    clerkUserLookup.mockResolvedValue(remote);
    await expect(syncClerkUser(remote.id)).rejects.toThrow("désactivé");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: local.id } })).authProviderId).toBeNull();
  });

  it("ne sollicite pas Clerk pour une session locale existante ou déconnectée", async () => {
    expect(await getCurrentUser()).toBeNull();
    const remote = identity();
    await prisma.user.create({ data: { email: remote.emailAddresses[0].emailAddress, authProviderId: remote.id } });
    authState.userId = remote.id;
    expect(await getCurrentUser()).not.toBeNull();
    expect(clerkUserLookup).not.toHaveBeenCalled();
  });
});
