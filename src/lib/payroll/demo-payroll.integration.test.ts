import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDemoPayroll } from "./demo-payroll";
import { DEMO_SIRET } from "./demo-payroll-data";
import { createDemoOrganization, ensureTestEncryptionKey, runDemoPayrollScenario } from "../../../scripts/payroll/demo-payroll-scenario";

const today = new Date("2026-10-07T10:00:00.000Z");

async function archiveDsn(organizationId: string, payrollPeriodId: string) {
  await prisma.payrollPeriod.update({ where: { id: payrollPeriodId }, data: { status: "LOCKED", lockedAt: new Date() } });
  await prisma.dsn_declarations.create({ data: { id: randomUUID(), organizationId, payrollPeriodId, version: 1, requestKey: randomUUID(), fileName: "demo.txt",
    contentCiphertext: "v1.test.test.test", sha256: "b".repeat(64), sizeBytes: 10, employeeCount: 1, warnings: [], createdByUserId: "test-actor" } });
}

describe.skipIf(!process.env.DATABASE_URL)("paie de démonstration sur PostgreSQL", () => {
  it("prépare, calcule, clôture et déclare deux mois de démonstration", async () => {
    const result = await runDemoPayrollScenario(today);
    expect(result.months.map((month) => `${month.month}/${month.year}`)).toEqual(["10/2026", "11/2026"]);
    const [october, november] = result.months;
    expect(october.employeeCount).toBe(15);
    expect(november.employeeCount).toBe(15);
    // Professionnalisation (61), apprentis de moins de 11 salariés (64), CDD avec motif de recours.
    expect(october.content).toContain("S21.G00.40.008,'61'");
    expect(october.content).toContain("S21.G00.40.008,'64'");
    expect(october.content).toContain("S21.G00.40.021,'02'");
    // La RGDU du premier mois est ventilée depuis la reprise des cumuls, celle du second depuis le mois clôturé.
    expect(october.content).toContain("S21.G00.23.001,'668'");
    expect(november.content).toContain("S21.G00.23.001,'668'");
    const organization = await prisma.organization.findUnique({ where: { id: result.organizationId }, select: { siret: true } });
    expect(organization?.siret).toBe(DEMO_SIRET);
    const openings = await prisma.employee_payroll_openings.findMany({ where: { organizationId: result.organizationId } });
    expect(openings.length).toBeGreaterThanOrEqual(10);
    expect(openings.every((opening) => opening.throughMonth === 9 && typeof (opening.cumuls as { rgduUrssafAmount?: unknown }).rgduUrssafAmount === "number")).toBe(true);
  }, 180_000);

  it("repart de zéro après une DSN archivée, mais jamais en présence d'un salarié réel", async () => {
    ensureTestEncryptionKey();
    const organizationId = await createDemoOrganization(today, "Démonstration remise à zéro");
    const first = await resetDemoPayroll({ organizationId, actorUserId: null, today });
    await archiveDsn(organizationId, first.periodId);

    const second = await resetDemoPayroll({ organizationId, actorUserId: null, today });
    expect(second.periodId).not.toBe(first.periodId);
    expect(await prisma.dsn_declarations.count({ where: { organizationId } })).toBe(0);
    expect(await prisma.payrollPeriod.count({ where: { organizationId } })).toBe(1);
    expect(await prisma.payrollProfile.count({ where: { organizationId } })).toBe(15);

    await archiveDsn(organizationId, second.periodId);
    await prisma.employee.create({ data: { organizationId, firstName: "Réel", lastName: "Salarié", hireDate: today, isDemoData: false } });
    await expect(resetDemoPayroll({ organizationId, actorUserId: null, today })).rejects.toThrow(/Archivez d'abord : Réel Salarié/);
    // La base refuse aussi : le drapeau de remise à zéro ne suffit pas quand un salarié réel est présent.
    await expect(prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('rhpilot.demo_payroll_reset', ${organizationId}, true)`;
      await tx.dsn_declarations.deleteMany({ where: { organizationId } });
    })).rejects.toThrow(/immuable/);
    expect(await prisma.dsn_declarations.count({ where: { organizationId } })).toBe(1);
  }, 120_000);

  it("ne laisse jamais supprimer l'archive DSN d'une autre organisation", async () => {
    ensureTestEncryptionKey();
    const target = await createDemoOrganization(today, "Démonstration cible");
    const other = await createDemoOrganization(today, "Démonstration voisine");
    const otherReset = await resetDemoPayroll({ organizationId: other, actorUserId: null, today });
    await archiveDsn(other, otherReset.periodId);
    await expect(prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('rhpilot.demo_payroll_reset', ${target}, true)`;
      await tx.dsn_declarations.deleteMany({ where: { organizationId: other } });
    })).rejects.toThrow(/immuable/);
  }, 120_000);
});
