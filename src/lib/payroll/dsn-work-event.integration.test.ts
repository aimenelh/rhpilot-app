import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptDsnSensitiveValue } from "./dsn-pii";
import { archiveWorkEventInTransaction } from "./dsn-work-event-server";
import { openDsnWorkEventArchive } from "./dsn-work-event-archive";
import { mappedDsnFixture } from "../../../scripts/payroll/dsn-fixture";

let priorKey: string | undefined;
beforeEach(() => { priorKey = process.env.DSN_PII_ENCRYPTION_KEY; process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(32, 12).toString("base64"); });
afterEach(() => { if (priorKey === undefined) delete process.env.DSN_PII_ENCRYPTION_KEY; else process.env.DSN_PII_ENCRYPTION_KEY = priorKey; });

async function seed(tx: Prisma.TransactionClient) {
  const base = mappedDsnFixture();
  const employee = base.employees[0];
  const organizationId = randomUUID();
  const employeeId = randomUUID();
  const absenceId = randomUUID();
  const actorUserId = randomUUID();
  await tx.user.create({ data: { id: actorUserId, email: `${actorUserId}@example.test` } });
  await tx.organization.create({ data: { id: organizationId, name: base.emitter.name, siret: base.emitter.siret, payrollAddress: base.emitter.address, payrollPostalCode: base.emitter.postalCode, payrollCity: base.emitter.city, ijssSubrogation: false } });
  await tx.dsn_organization_settings.create({ data: { organizationId, contactName: base.emitter.contactName, contactEmail: base.emitter.contactEmail, contactPhone: base.emitter.contactPhone, declaredContactType: base.emitter.declaredContactType } });
  await tx.employee.create({ data: { id: employeeId, organizationId, firstName: employee.firstName, lastName: employee.lastName, hireDate: employee.contract.startDate, contractType: "CDI" } });
  await tx.dsn_employee_profiles.create({ data: { id: randomUUID(), organizationId, employeeId, nirCiphertext: encryptDsnSensitiveValue(employee.nir), birthDate: employee.birthDate, birthPlace: employee.birthPlace, birthDepartment: employee.birthDepartment,
    addressLine: employee.addressLine, postalCode: employee.postalCode, city: employee.city, contractNumber: employee.contract.contractNumber, contractNatureCode: "01", pcsEsecCode: employee.contract.pcsEsecCode,
    conventionalStatusCode: "04", retirementStatusCode: "01", referenceWorkQuota: 151.67, contractWorkQuota: 151.67, workModalityCode: "10", sicknessRegimeCode: "200", oldAgeRegimeCode: "200", workAccidentRegimeCode: "200", workLocationId: base.emitter.siret } });
  await tx.absence.create({ data: { id: absenceId, organizationId, employeeId, type: "SICK_LEAVE", status: "VALIDATED", startDate: new Date("2026-01-12"), endDate: new Date("2026-01-16"), lastWorkedDate: new Date("2026-01-11"), returnDate: new Date("2026-01-15"), returnReasonCode: "01" } });
  return { organizationId, employeeId, absenceId, actorUserId };
}

describe.skipIf(!process.env.DATABASE_URL)("signalements DSN sur PostgreSQL", () => {
  it("archive un arrêt et une reprise avec une séquence continue, des requêtes idempotentes et des octets figés", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const context = await seed(tx);
      const requestKey = randomUUID();
      const first = await archiveWorkEventInTransaction(tx, { ...context, requestKey, nature: "04", fileDate: new Date("2026-01-20") });
      const retry = await archiveWorkEventInTransaction(tx, { ...context, requestKey, nature: "04", fileDate: new Date("2026-02-20") });
      expect(retry.id).toBe(first.id);
      const second = await archiveWorkEventInTransaction(tx, { ...context, requestKey: randomUUID(), nature: "05", fileDate: new Date("2026-02-20") });
      expect(first.declarationOrder).toBe(BigInt(1));
      expect(second.declarationOrder).toBe(BigInt(2));
      expect(first.version).toBe(1);
      expect(second.version).toBe(1);
      const bytes = openDsnWorkEventArchive(first);
      expect(bytes.toString("latin1")).toContain("S20.G00.05.001,'04'");
      expect(openDsnWorkEventArchive(second).toString("latin1")).toContain("S21.G00.60.010,'15012026'");
      await tx.absence.update({ where: { id: context.absenceId }, data: { endDate: new Date("2026-01-17") } });
      const corrected = await archiveWorkEventInTransaction(tx, { ...context, requestKey: randomUUID(), nature: "04", fileDate: new Date("2026-02-20") });
      expect(corrected.version).toBe(2);
      expect(corrected.sourceDigest).not.toBe(first.sourceDigest);
      expect(openDsnWorkEventArchive(first)).toEqual(bytes);
      expect(await tx.auditLog.count({ where: { organizationId: context.organizationId, action: "dsn.work_event.precontrol.archived" } })).toBe(3);
      throw new Error("ROLLBACK_VERIFIED");
    }, { timeout: 20000 })).rejects.toThrow("ROLLBACK_VERIFIED");
  });
  it.each(["update", "delete"] as const)("interdit la mutation %s d'une archive", async (operation) => {
    await expect(prisma.$transaction(async (tx) => {
      const context = await seed(tx);
      const archive = await archiveWorkEventInTransaction(tx, { ...context, nature: "04", requestKey: randomUUID(), fileDate: new Date("2026-01-20") });
      if (operation === "update") await tx.dsn_work_events.update({ where: { id: archive.id }, data: { contentCiphertext: "modified" } });
      else await tx.dsn_work_events.delete({ where: { id: archive.id } });
    })).rejects.toThrow(/immuable/);
  });
  it("interdit les rattachements à un autre salarié ou entreprise", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const context = await seed(tx);
      const archive = await archiveWorkEventInTransaction(tx, { ...context, nature: "04", requestKey: randomUUID(), fileDate: new Date("2026-01-20") });
      const otherEmployee = await tx.employee.create({ data: { organizationId: context.organizationId, firstName: "Other", lastName: "Test", hireDate: new Date("2024-01-01") } });
      await tx.dsn_work_events.create({ data: { ...archive, id: randomUUID(), employeeId: otherEmployee.id, version: 2, declarationOrder: BigInt(2), businessId: "TESTOTHER", requestKey: randomUUID(), warnings: [] } });
    })).rejects.toThrow(/foreign key|constraint|violates/i);
    await expect(prisma.$transaction(async (tx) => {
      const context = await seed(tx);
      const archive = await archiveWorkEventInTransaction(tx, { ...context, nature: "04", requestKey: randomUUID(), fileDate: new Date("2026-01-20") });
      const other = await tx.organization.create({ data: { name: "Other company" } });
      await tx.dsn_work_events.create({ data: { ...archive, id: randomUUID(), organizationId: other.id, warnings: [] } });
    })).rejects.toThrow(/foreign key|constraint|violates/i);
  });
  it("refuse la réutilisation d'une clé de requête pour un autre type de signalement", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const context = await seed(tx);
      const requestKey = randomUUID();
      await archiveWorkEventInTransaction(tx, { ...context, nature: "04", requestKey, fileDate: new Date("2026-01-20") });
      await archiveWorkEventInTransaction(tx, { ...context, nature: "05", requestKey, fileDate: new Date("2026-01-20") });
    })).rejects.toThrow(/autre arrêt ou signalement/);
  });
});
