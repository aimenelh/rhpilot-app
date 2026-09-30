import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function seed(tx: Prisma.TransactionClient) {
  const organizationId = randomUUID();
  const periodId = randomUUID();
  await tx.organization.create({ data: { id: organizationId, name: "Archive DSN test" } });
  await tx.payrollPeriod.create({ data: { id: periodId, organizationId, year: 2026, month: 1, status: "LOCKED" } });
  const archive = await tx.dsn_declarations.create({ data: { id: randomUUID(), organizationId, payrollPeriodId: periodId, version: 1, requestKey: randomUUID(),
    fileName: "test.txt", contentCiphertext: "v1.test.test.test", sha256: "a".repeat(64), sizeBytes: 10, employeeCount: 1, warnings: [], createdByUserId: "test-actor" } });
  return archive;
}
describe.skipIf(!process.env.DATABASE_URL)("archives DSN sur PostgreSQL", () => {
  it("refuse la modification du fichier et annule la transaction", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const archive = await seed(tx);
      await tx.dsn_declarations.update({ where: { id: archive.id }, data: { contentCiphertext: "modified" } });
    })).rejects.toThrow(/immuable/);
  });
  it("refuse la suppression du fichier et annule la transaction", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const archive = await seed(tx);
      await tx.dsn_declarations.delete({ where: { id: archive.id } });
    })).rejects.toThrow(/immuable/);
  });
  it("interdit de rattacher une archive à la période d'une autre entreprise", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const archive = await seed(tx);
      const other = await tx.organization.create({ data: { name: "Autre entreprise test" } });
      await tx.dsn_declarations.create({ data: { ...archive, id: randomUUID(), organizationId: other.id } });
    })).rejects.toThrow(/foreign key|constraint|violates/i);
  });
  it("refuse deux versions identiques sur une période", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const archive = await seed(tx);
      await tx.dsn_declarations.create({ data: { ...archive, id: randomUUID(), requestKey: randomUUID() } });
    })).rejects.toThrow(/unique|constraint/i);
  });
});
