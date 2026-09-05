import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { triggerEmployeeEvent } from "@/lib/eventEngine";

const RUN_ID = `evtest-${Date.now()}`;

type Fixtures = Awaited<ReturnType<typeof createFixtures>>;

async function createFixtures() {
  const orgA = await prisma.organization.create({ data: { name: `${RUN_ID}-org-A` } });
  const orgB = await prisma.organization.create({ data: { name: `${RUN_ID}-org-B` } });

  const userA = await prisma.user.create({ data: { email: `${RUN_ID}-a@example.test` } });
  const managerUser = await prisma.user.create({ data: { email: `${RUN_ID}-manager@example.test` } });
  const rhUser = await prisma.user.create({ data: { email: `${RUN_ID}-rh@example.test` } });

  const managerMembership = await prisma.membership.create({
    data: { userId: managerUser.id, organizationId: orgA.id, accessRole: "MEMBER" },
  });
  const rhMembership = await prisma.membership.create({
    data: { userId: rhUser.id, organizationId: orgA.id, accessRole: "ADMIN", functionalRole: "RH" },
  });

  // Gabarit partagé entre les deux organisations (les gabarits sont
  // globaux, pas propres à une organisation) : 3 étapes, une avec
  // résolution RH, une MANAGER_DIRECT, une déjà archivée (ne doit
  // jamais apparaître dans les tâches générées).
  const eventTemplate = await prisma.eventTemplate.create({
    data: { key: `${RUN_ID}-embauche`, label: "Embauche (test)" },
  });
  const stepRh = await prisma.taskTemplate.create({
    data: {
      key: `${RUN_ID}-etape-rh`,
      eventTemplateId: eventTemplate.id,
      label: "Étape RH",
      stepOrder: 1,
      dueOffsetDays: 3,
      defaultFunctionalRole: "RH",
    },
  });
  const stepManager = await prisma.taskTemplate.create({
    data: {
      key: `${RUN_ID}-etape-manager`,
      eventTemplateId: eventTemplate.id,
      label: "Étape manager",
      stepOrder: 2,
      dueOffsetDays: 7,
      defaultFunctionalRole: "MANAGER_DIRECT",
    },
  });
  const stepArchived = await prisma.taskTemplate.create({
    data: {
      key: `${RUN_ID}-etape-archivee`,
      eventTemplateId: eventTemplate.id,
      label: "Étape archivée",
      stepOrder: 3,
      dueOffsetDays: 1,
      defaultFunctionalRole: "RH",
      archivedAt: new Date(),
    },
  });

  // Org A personnalise l'étape manager (nouveau libellé + délai) ;
  // org B n'a aucune personnalisation, doit recevoir le gabarit tel
  // quel.
  await prisma.taskTemplateOverride.create({
    data: {
      organizationId: orgA.id,
      taskTemplateId: stepManager.id,
      action: "MODIFIED",
      label: "Étape manager personnalisée",
      dueOffsetDays: 14,
    },
  });

  const employeeWithManager = await prisma.employee.create({
    data: {
      organizationId: orgA.id,
      firstName: "Julie",
      lastName: "AvecManager",
      hireDate: new Date("2026-01-01"),
      managerMembershipId: managerMembership.id,
    },
  });

  const employeeNoManager = await prisma.employee.create({
    data: {
      organizationId: orgA.id,
      firstName: "Karim",
      lastName: "SansManager",
      hireDate: new Date("2026-01-01"),
    },
  });

  const employeeOrgB = await prisma.employee.create({
    data: { organizationId: orgB.id, firstName: "Léa", lastName: "OrgB", hireDate: new Date("2026-01-01") },
  });

  return {
    orgA,
    orgB,
    userA,
    managerMembership,
    rhMembership,
    eventTemplate,
    stepRh,
    stepManager,
    stepArchived,
    employeeWithManager,
    employeeNoManager,
    employeeOrgB,
  };
}

async function cleanupFixtures(f: Fixtures) {
  const orgIds = [f.orgA.id, f.orgB.id];
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.task.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.employeeEvent.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.employee.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.taskTemplateOverride.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.taskTemplate.deleteMany({ where: { eventTemplateId: f.eventTemplate.id } });
  await prisma.eventTemplate.deleteMany({ where: { id: f.eventTemplate.id } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [f.userA.id, f.managerMembership.userId, f.rhMembership.userId] } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
}

describe("eventEngine.triggerEmployeeEvent", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  it("refuse un salarié appartenant à une autre organisation", async () => {
    await expect(
      triggerEmployeeEvent({
        organizationId: f.orgA.id,
        employeeId: f.employeeOrgB.id,
        eventTemplateKey: f.eventTemplate.key,
        triggerDate: new Date("2026-02-01"),
        actorUserId: f.userA.id,
      })
    ).rejects.toThrow(/salarié introuvable/i);

    const events = await prisma.employeeEvent.findMany({ where: { employeeId: f.employeeOrgB.id } });
    expect(events).toHaveLength(0);
  });

  it("refuse un gabarit d'événement inexistant ou désactivé", async () => {
    await expect(
      triggerEmployeeEvent({
        organizationId: f.orgA.id,
        employeeId: f.employeeNoManager.id,
        eventTemplateKey: "ce-gabarit-n-existe-pas",
        triggerDate: new Date("2026-02-01"),
        actorUserId: f.userA.id,
      })
    ).rejects.toThrow(/introuvable ou désactivé/i);
  });

  it("n'inclut jamais une étape archivée dans les tâches générées", async () => {
    const event = await triggerEmployeeEvent({
      organizationId: f.orgA.id,
      employeeId: f.employeeNoManager.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate: new Date("2026-02-01"),
      actorUserId: f.userA.id,
    });

    const tasks = await prisma.task.findMany({ where: { employeeEventId: event.id } });
    const stillHasArchivedStep = tasks.find(
      (t: { taskTemplateId: string | null }) => t.taskTemplateId === f.stepArchived.id
    );
    expect(stillHasArchivedStep).toBeUndefined();
  });

  it("calcule correctement l'échéance à partir de la date de déclenchement + délai du gabarit", async () => {
    const triggerDate = new Date("2026-03-01");
    const event = await triggerEmployeeEvent({
      organizationId: f.orgA.id,
      employeeId: f.employeeNoManager.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate,
      actorUserId: f.userA.id,
    });

    const rhTask = await prisma.task.findFirst({ where: { employeeEventId: event.id, taskTemplateId: f.stepRh.id } });
    expect(rhTask?.dueDate.toISOString().slice(0, 10)).toBe("2026-03-04");
  });

  it("applique la personnalisation (label + délai) mémorisée par l'organisation, sans affecter le gabarit global", async () => {
    const triggerDate = new Date("2026-03-01");

    const eventOrgA = await triggerEmployeeEvent({
      organizationId: f.orgA.id,
      employeeId: f.employeeNoManager.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate,
      actorUserId: f.userA.id,
    });
    const eventOrgB = await triggerEmployeeEvent({
      organizationId: f.orgB.id,
      employeeId: f.employeeOrgB.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate,
      actorUserId: f.userA.id,
    });

    const taskOrgA = await prisma.task.findFirst({
      where: { employeeEventId: eventOrgA.id, taskTemplateId: f.stepManager.id },
    });
    const taskOrgB = await prisma.task.findFirst({
      where: { employeeEventId: eventOrgB.id, taskTemplateId: f.stepManager.id },
    });

    expect(taskOrgA?.label).toBe("Étape manager personnalisée");
    expect(taskOrgA?.dueDate.toISOString().slice(0, 10)).toBe("2026-03-15");

    expect(taskOrgB?.label).toBe("Étape manager");
    expect(taskOrgB?.dueDate.toISOString().slice(0, 10)).toBe("2026-03-08");
  });

  it("résout le responsable MANAGER_DIRECT via Employee.managerMembershipId", async () => {
    const event = await triggerEmployeeEvent({
      organizationId: f.orgA.id,
      employeeId: f.employeeWithManager.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate: new Date("2026-04-01"),
      actorUserId: f.userA.id,
    });

    const managerTask = await prisma.task.findFirst({
      where: { employeeEventId: event.id, taskTemplateId: f.stepManager.id },
    });
    expect(managerTask?.assignedMembershipId).toBe(f.managerMembership.id);
  });

  it("laisse la tâche non assignée si le salarié n'a pas de manager (jamais de devinette)", async () => {
    const event = await triggerEmployeeEvent({
      organizationId: f.orgA.id,
      employeeId: f.employeeNoManager.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate: new Date("2026-04-01"),
      actorUserId: f.userA.id,
    });

    const managerTask = await prisma.task.findFirst({
      where: { employeeEventId: event.id, taskTemplateId: f.stepManager.id },
    });
    expect(managerTask?.assignedMembershipId).toBeNull();
  });

  it("résout le responsable RH quand une seule personne a ce rôle fonctionnel dans l'organisation", async () => {
    const event = await triggerEmployeeEvent({
      organizationId: f.orgA.id,
      employeeId: f.employeeNoManager.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate: new Date("2026-04-01"),
      actorUserId: f.userA.id,
    });

    const rhTask = await prisma.task.findFirst({ where: { employeeEventId: event.id, taskTemplateId: f.stepRh.id } });
    expect(rhTask?.assignedMembershipId).toBe(f.rhMembership.id);
  });

  it("ne modifie jamais rétroactivement une tâche déjà générée quand le gabarit change ensuite", async () => {
    const event = await triggerEmployeeEvent({
      organizationId: f.orgA.id,
      employeeId: f.employeeNoManager.id,
      eventTemplateKey: f.eventTemplate.key,
      triggerDate: new Date("2026-05-01"),
      actorUserId: f.userA.id,
    });

    const before = await prisma.task.findFirst({ where: { employeeEventId: event.id, taskTemplateId: f.stepRh.id } });

    await prisma.taskTemplate.update({ where: { id: f.stepRh.id }, data: { label: "Nouveau libellé du gabarit" } });

    const after = await prisma.task.findUnique({ where: { id: before!.id } });
    expect(after?.label).toBe(before?.label);

    await prisma.taskTemplate.update({ where: { id: f.stepRh.id }, data: { label: "Étape RH" } });
  });
});
