import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { authState } from "@/test/mockAuth";

// Préfixe unique à cette exécution de test, pour ne jamais entrer en
// collision avec de vraies données si ce test tournait par erreur
// contre la mauvaise base, et pour identifier facilement les
// enregistrements à nettoyer.
const RUN_ID = `test-${Date.now()}`;

type Fixtures = Awaited<ReturnType<typeof createFixtures>>;

async function createFixtures() {
  const orgA = await prisma.organization.create({ data: { name: `${RUN_ID}-org-A` } });
  const orgB = await prisma.organization.create({ data: { name: `${RUN_ID}-org-B` } });

  const userA = await prisma.user.create({
    data: { email: `${RUN_ID}-a@example.test`, authProviderId: `${RUN_ID}-clerk-A` },
  });
  const userB = await prisma.user.create({
    data: { email: `${RUN_ID}-b@example.test`, authProviderId: `${RUN_ID}-clerk-B` },
  });

  const membershipA = await prisma.membership.create({
    data: { userId: userA.id, organizationId: orgA.id, accessRole: "OWNER" },
  });
  const membershipB = await prisma.membership.create({
    data: { userId: userB.id, organizationId: orgB.id, accessRole: "OWNER" },
  });

  const eventTemplate = await prisma.eventTemplate.create({
    data: { key: `${RUN_ID}-embauche`, label: "Embauche (test)" },
  });
  const taskTemplate = await prisma.taskTemplate.create({
    data: {
      key: `${RUN_ID}-tache-1`,
      eventTemplateId: eventTemplate.id,
      label: "Tâche de test",
      stepOrder: 1,
      dueOffsetDays: 7,
      defaultFunctionalRole: "RH",
    },
  });

  const employeeA = await prisma.employee.create({
    data: {
      organizationId: orgA.id,
      firstName: "Julie",
      lastName: "Test",
      hireDate: new Date(),
    },
  });

  const employeeEventA = await prisma.employeeEvent.create({
    data: { organizationId: orgA.id, employeeId: employeeA.id, eventTemplateId: eventTemplate.id, triggerDate: new Date() },
  });

  const taskA = await prisma.task.create({
    data: {
      organizationId: orgA.id,
      employeeEventId: employeeEventA.id,
      taskTemplateId: taskTemplate.id,
      label: "Tâche de test",
      stepOrder: 1,
      dueDate: new Date(),
      deadlineType: "ORGANIZATIONAL_DEFAULT",
      resolutionRole: "RH",
      status: "TODO",
    },
  });

  return { orgA, orgB, userA, userB, membershipA, membershipB, eventTemplate, taskTemplate, employeeA, employeeEventA, taskA };
}

async function cleanupFixtures(f: Fixtures) {
  // Ordre inverse des dépendances (Restrict empêche de supprimer un
  // parent tant qu'un enfant existe).
  await prisma.task.deleteMany({ where: { organizationId: { in: [f.orgA.id, f.orgB.id] } } });
  await prisma.employeeEvent.deleteMany({ where: { organizationId: { in: [f.orgA.id, f.orgB.id] } } });
  await prisma.employee.deleteMany({ where: { organizationId: { in: [f.orgA.id, f.orgB.id] } } });
  await prisma.taskTemplate.deleteMany({ where: { id: f.taskTemplate.id } });
  await prisma.eventTemplate.deleteMany({ where: { id: f.eventTemplate.id } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: [f.orgA.id, f.orgB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [f.userA.id, f.userB.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [f.orgA.id, f.orgB.id] } } });
}

describe("Isolation multi-tenant — mutations critiques", () => {
  let fixtures: Fixtures;

  beforeAll(async () => {
    fixtures = await createFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures(fixtures);
  });

  beforeEach(() => {
    authState.userId = null;
    vi.resetModules();
  });

  it("updateTaskStatus : l'organisation B ne peut pas modifier une tâche de l'organisation A", async () => {
    authState.userId = fixtures.userB.authProviderId!;
    const { updateTaskStatus } = await import("@/app/dashboard/events/actions");

    const formData = new FormData();
    formData.set("status", "DONE");

    await expect(updateTaskStatus(fixtures.taskA.id, formData)).rejects.toThrow(/introuvable/i);

    const stillUnchanged = await prisma.task.findUnique({ where: { id: fixtures.taskA.id } });
    expect(stillUnchanged?.status).toBe("TODO");
  });

  it("updateTaskStatus : l'organisation A peut modifier sa propre tâche (test témoin)", async () => {
    authState.userId = fixtures.userA.authProviderId!;
    const { updateTaskStatus } = await import("@/app/dashboard/events/actions");

    const formData = new FormData();
    formData.set("status", "DONE");

    await expect(updateTaskStatus(fixtures.taskA.id, formData)).rejects.toThrow("NEXT_REDIRECT");

    const updated = await prisma.task.findUnique({ where: { id: fixtures.taskA.id } });
    expect(updated?.status).toBe("DONE");

    // Remise en état pour ne pas influencer d'autres tests de ce fichier.
    await prisma.task.update({ where: { id: fixtures.taskA.id }, data: { status: "TODO", completedAt: null } });
  });

  it("assignTask : l'organisation B ne peut pas assigner une tâche de l'organisation A, même à l'un de ses propres membres", async () => {
    authState.userId = fixtures.userB.authProviderId!;
    const { assignTask } = await import("@/app/dashboard/events/actions");

    const formData = new FormData();
    formData.set("assignedMembershipId", fixtures.membershipB.id);

    await expect(assignTask(fixtures.taskA.id, formData)).rejects.toThrow(/introuvable/i);

    const stillUnassigned = await prisma.task.findUnique({ where: { id: fixtures.taskA.id } });
    expect(stillUnassigned?.assignedMembershipId).toBeNull();
  });

  it("createEmployee : refuse un managerMembershipId appartenant à une autre organisation", async () => {
    authState.userId = fixtures.userA.authProviderId!;
    const { createEmployee } = await import("@/app/dashboard/employees/actions");

    const before = await prisma.employee.count({ where: { organizationId: fixtures.orgA.id } });

    const formData = new FormData();
    formData.set("firstName", "Karim");
    formData.set("lastName", "Test");
    formData.set("hireDate", "2026-01-15");
    formData.set("managerMembershipId", fixtures.membershipB.id); // appartient à l'organisation B

    const result = await createEmployee(undefined, formData);

    expect(result?.error).toMatch(/manager ne fait pas partie/i);

    const after = await prisma.employee.count({ where: { organizationId: fixtures.orgA.id } });
    expect(after).toBe(before); // aucun salarié créé malgré la tentative
  });

  it("createEmployee : accepte un managerMembershipId appartenant à la bonne organisation (test témoin)", async () => {
    authState.userId = fixtures.userA.authProviderId!;
    const { createEmployee } = await import("@/app/dashboard/employees/actions");

    const formData = new FormData();
    formData.set("firstName", "Karim");
    formData.set("lastName", "Test2");
    formData.set("hireDate", "2026-01-15");
    formData.set("managerMembershipId", fixtures.membershipA.id); // appartient bien à l'organisation A

    const result = await createEmployee(undefined, formData);

    expect(result?.error).toBeUndefined();

    const created = await prisma.employee.findFirst({
      where: { organizationId: fixtures.orgA.id, firstName: "Karim", lastName: "Test2" },
    });
    expect(created?.managerMembershipId).toBe(fixtures.membershipA.id);

    // Nettoyage immédiat, ce salarié n'est pas géré par cleanupFixtures.
    if (created) await prisma.employee.delete({ where: { id: created.id } });
  });
});
