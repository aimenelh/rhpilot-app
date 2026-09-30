import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { prepareDsnP26V01 } from "./dsn-preparation";
import { sealDsnArchive } from "./dsn-archive";

export async function createDsnPrecontrolArchive(input: { organizationId: string; periodId: string; actorUserId: string; requestKey: string }) {
  const previous = await prisma.dsn_declarations.findFirst({ where: { organizationId: input.organizationId, requestKey: input.requestKey } });
  if (previous) {
    if (previous.payrollPeriodId !== input.periodId) throw new Error("DSN bloquée : cette requête appartient à une autre période.");
    return previous;
  }
  const initialPeriod = await prisma.payrollPeriod.findFirst({ where: { id: input.periodId, organizationId: input.organizationId }, select: { updatedAt: true } });
  if (!initialPeriod) throw new Error("DSN bloquée : période introuvable.");
  const prepared = await prepareDsnP26V01({ organizationId: input.organizationId, periodId: input.periodId, testMode: true });
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([input.organizationId, input.periodId])}, 0))`;
    const periodRows = await tx.$queryRaw<Array<{ status: string; updatedAt: Date }>>`
      SELECT "status", "updatedAt" FROM "payroll_periods"
      WHERE "organizationId" = ${input.organizationId} AND "id" = ${input.periodId} FOR SHARE
    `;
    if (periodRows[0]?.status !== "LOCKED" || periodRows[0].updatedAt.getTime() !== initialPeriod.updatedAt.getTime()) throw new Error("DSN bloquée : la période a été modifiée pendant la préparation. Relancez le contrôle.");
    const existing = await tx.dsn_declarations.findFirst({ where: { organizationId: input.organizationId, requestKey: input.requestKey } });
    if (existing) {
      if (existing.payrollPeriodId !== input.periodId) throw new Error("DSN bloquée : cette requête appartient à une autre période.");
      return existing;
    }
    const latest = await tx.dsn_declarations.findFirst({ where: { organizationId: input.organizationId, payrollPeriodId: input.periodId }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (latest?.version ?? 0) + 1;
    const archive = sealDsnArchive({ id: randomUUID(), organizationId: input.organizationId, payrollPeriodId: input.periodId }, prepared.content);
    const saved = await tx.dsn_declarations.create({ data: { ...archive, version, requestKey: input.requestKey, normVersion: prepared.normVersion, mode: "PRECONTROL",
      fileName: prepared.fileName.replace(/\\.txt$/, `-v${version}.txt`), employeeCount: prepared.employeeCount, warnings: prepared.warnings, createdByUserId: input.actorUserId } });
    await tx.auditLog.create({ data: { id: randomUUID(), organizationId: input.organizationId, actorUserId: input.actorUserId, action: "dsn.precontrol.archived",
      entityType: "DsnDeclaration", entityId: saved.id, metadata: { periodId: input.periodId, version, sha256: saved.sha256, normVersion: saved.normVersion, employeeCount: saved.employeeCount } } });
    return saved;
  });
}
