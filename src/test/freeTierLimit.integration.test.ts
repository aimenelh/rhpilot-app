import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { checkFreeTierLimit } from "@/app/dashboard/employees/actions";
import { authState } from "@/test/mockAuth";

const RUN_ID = `limittest-${Date.now()}`;

type Fixtures = Awaited<ReturnType<typeof createFixtures>>;

async function createEmployeesInOrg(organizationId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await prisma.employee.create({
      data: {
        organizationId,
        firstName: `Fictif${i}`,
        lastName: RUN_ID,
        hireDate: new Date("2026-01-01"),
      },
    });
  }
}

async function createFixtures() {
  const orgGratuitVide = await prisma.organization.create({ data: { name: `${RUN_ID}-gratuit-vide` } });
  const orgGratuitPresqueAuMax = await prisma.organization.create({ data: { name: `${RUN_ID}-gratuit-2` } });
  const orgGratuitAuMax = await prisma.organization.create({ data: { name: `${RUN_ID}-gratuit-3` } });
  const orgPro = await prisma.organization.create({
    data: { name: `${RUN_ID}-pro`, subscriptionStatus: "active" },
  });

  await createEmployeesInOrg(orgGratuitPresqueAuMax.id, 2);
  await createEmployeesInOrg(orgGratuitAuMax.id, 3);
  await createEmployeesInOrg(orgPro.id, 10);

  const userA = await prisma.user.create({
    data: { email: `${RUN_ID}-a@example.test`, authProviderId: `${RUN_ID}-clerk-a` },
  });
  const membershipGratuit2 = await prisma.membership.create({
    data: { userId: userA.id, organizationId: orgGratuitPresqueAuMax.id, accessRole: "OWNER" },
  });

  return { orgGratuitVide, orgGratuitPresqueAuMax, orgGratuitAuMax, orgPro, userA, membershipGratuit2 };
}

async function cleanupFixtures(f: Fixtures) {
  const orgIds = [f.orgGratuitVide.id, f.orgGratuitPresqueAuMax.id, f.orgGratuitAuMax.id, f.orgPro.id];
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.employee.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: f.userA.id } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
}

describe("checkFreeTierLimit", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  it("autorise l'ajout d'un salarié quand l'organisation est loin de la limite", async () => {
    const error = await checkFreeTierLimit(f.orgGratuitVide.id);
    expect(error).toBeNull();
  });

  it("autorise l'ajout d'un salarié pile à la limite (2 existants + 1 = 3, pas encore au-dessus)", async () => {
    const error = await checkFreeTierLimit(f.orgGratuitPresqueAuMax.id, 1);
    expect(error).toBeNull();
  });

  it("refuse l'ajout d'un salarié qui dépasserait la limite (3 existants + 1 = 4)", async () => {
    const error = await checkFreeTierLimit(f.orgGratuitAuMax.id, 1);
    expect(error).toMatch(/palier gratuit est limité/i);
  });

  it("refuse un ajout multiple (import CSV) qui dépasserait la limite, même si un seul salarié à la fois passerait (2 existants + 2 = 4)", async () => {
    const error = await checkFreeTierLimit(f.orgGratuitPresqueAuMax.id, 2);
    expect(error).toMatch(/palier gratuit est limité/i);
  });

  it("n'applique aucune limite pour une organisation Pro, même très au-dessus de 3 salariés", async () => {
    const error = await checkFreeTierLimit(f.orgPro.id, 5);
    expect(error).toBeNull();
  });
});

describe("importEmployeesCsv — application réelle de la limite via le formulaire d'import", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  beforeEach(() => {
    authState.userId = null;
    vi.resetModules();
  });

  it("refuse d'importer plusieurs salariés qui dépasseraient la limite Gratuit, sans en créer aucun", async () => {
    authState.userId = f.userA.authProviderId!;
    const { importEmployeesCsv } = await import("@/app/dashboard/employees/importActions");

    const before = await prisma.employee.count({ where: { organizationId: f.orgGratuitPresqueAuMax.id } });

    const csv =
      "prenom,nom,civilite,poste,date_embauche,type_contrat,duree_periode_essai,unite_duree,prochaine_visite_medicale\n" +
      "Alice,Import,,,2026-01-15,,,,\n" +
      "Bob,Import,,,2026-01-15,,,,";

    const formData = new FormData();
    formData.set("csvText", csv);

    const result = await importEmployeesCsv(undefined, formData);

    expect(result?.error).toMatch(/palier gratuit est limité/i);

    const after = await prisma.employee.count({ where: { organizationId: f.orgGratuitPresqueAuMax.id } });
    expect(after).toBe(before);
  });
});
