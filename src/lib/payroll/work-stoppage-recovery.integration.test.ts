import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordWorkStoppageRecoveryInTransaction } from "./work-stoppage-recovery";
import { assertAbsenceStartsAfterClosedPayroll, assertCurrentPayrollAbsences, assertPayrollPeriodStatus, invalidateOpenPayrollFrom, lockPayrollAbsenceChanges } from "./period-absence-safety";

async function seed(tx: Prisma.TransactionClient) {
  const organizationId = randomUUID();
  const actorUserId = randomUUID();
  const employeeId = randomUUID();
  await tx.user.create({ data: { id: actorUserId, email: `${actorUserId}@example.test` } });
  await tx.organization.create({ data: { id: organizationId, name: "Recovery test" } });
  await tx.employee.create({ data: { id: employeeId, organizationId, firstName: "Test", lastName: "Recovery", hireDate: new Date("2024-01-01") } });
  const absence = await tx.absence.create({ data: { id: randomUUID(), organizationId, employeeId, type: "SICK_LEAVE", status: "VALIDATED", payrollImpactStatus: "INTEGRATED",
    startDate: new Date("2026-01-20"), endDate: new Date("2026-03-15"), lastWorkedDate: new Date("2026-01-19") } });
  const snapshot = { validatedAbsences: [{ ...absence, absenceId: absence.id }] };
  const closed = await tx.payrollPeriod.create({ data: { id: randomUUID(), organizationId, year: 2026, month: 1, status: "LOCKED" } });
  const open = await tx.payrollPeriod.create({ data: { id: randomUUID(), organizationId, year: 2026, month: 2, status: "REVIEW" } });
  const calculationIds: string[] = [];
  for (const period of [closed, open]) {
    const calc = await tx.payrollCalculation.create({ data: { id: randomUUID(), organizationId, payrollPeriodId: period.id, employeeId, ruleSetVersion: "test", grossAmount: 2500, netBeforeTax: 1900, netPaid: 1900, calculationSnapshot: JSON.parse(JSON.stringify(snapshot)) } });
    calculationIds.push(calc.id);
  }
  return { organizationId, actorUserId, employeeId, absenceId: absence.id, absence, snapshot, closed, open, calculationIds };
}

const recovery = { returnDate: "2026-02-12", returnReasonCode: "01", today: new Date("2026-02-12") };

describe.skipIf(!process.env.DATABASE_URL)("reprise après intégration sur PostgreSQL", () => {
  it("complète l'arrêt, conserve le mois clôturé et impose un recalcul des périodes ouvertes", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const data = await seed(tx);
      const previous = await tx.payrollCalculation.findUniqueOrThrow({ where: { id: data.calculationIds[0] } });
      const recorded = await recordWorkStoppageRecoveryInTransaction(tx, { ...data, ...recovery });
      expect(recorded).toEqual({ changed: true, invalidatedPeriods: 1 });
      const absence = await tx.absence.findUniqueOrThrow({ where: { id: data.absenceId } });
      expect(absence.returnDate?.toISOString().slice(0, 10)).toBe(recovery.returnDate);
      expect(absence.endDate).toEqual(data.absence.endDate);
      expect(absence.status).toBe("VALIDATED");
      expect(absence.payrollImpactStatus).toBe("INTEGRATED");
      expect(await tx.payrollCalculation.findUniqueOrThrow({ where: { id: previous.id } })).toEqual(previous);
      expect((await tx.payrollPeriod.findUniqueOrThrow({ where: { id: data.closed.id } })).status).toBe("LOCKED");
      expect((await tx.payrollPeriod.findUniqueOrThrow({ where: { id: data.open.id } })).status).toBe("DRAFT");
      expect(await tx.auditLog.count({ where: { organizationId: data.organizationId, action: "absence.recovery.recorded" } })).toBe(1);
      await expect(recordWorkStoppageRecoveryInTransaction(tx, { ...data, ...recovery })).resolves.toEqual({ changed: false, invalidatedPeriods: 0 });
      await expect(recordWorkStoppageRecoveryInTransaction(tx, { ...data, ...recovery, returnDate: "2026-02-11" })).rejects.toThrow(/déjà enregistrée/);
      // Une validation déjà demandée avec l'ancien état et un calcul en vol sont refusés.
      await expect(assertPayrollPeriodStatus(tx, data.organizationId, data.open.id, "REVIEW")).rejects.toThrow(/état de la période/);
      await expect(assertCurrentPayrollAbsences(tx, { ...data, year: 2026, month: 2, calculations: [{ employeeId: data.employeeId, absences: data.snapshot.validatedAbsences }] })).rejects.toThrow(/a changé/);
      await expect(assertCurrentPayrollAbsences(tx, { ...data, year: 2026, month: 2, calculations: [{ employeeId: data.employeeId, absences: [{ ...absence, absenceId: absence.id }] }] })).resolves.toEqual([absence.id]);
      throw new Error("ROLLBACK_VERIFIED");
    }, { timeout: 20000 })).rejects.toThrow("ROLLBACK_VERIFIED");
  });

  it.each([
    [{ returnDate: "2026-01-25" }, /régularisation/],
    [{ returnDate: "2026-02-13" }, /futur/],
    [{ returnDate: "2026-02-30" }, /invalide/],
    [{ returnDate: "2026-01-20" }, /suivre le début/],
    [{ returnDate: "2026-03-17", today: new Date("2026-03-20") }, /fin prescrite/],
    [{ returnReasonCode: "02" }, /thérapeutique/],
    [{ organizationId: "other-company" }, /introuvable/],
  ] as const)("refuse une reprise incohérente ou non autorisée : %j", async (changes, message) => {
    await expect(prisma.$transaction(async (tx) => {
      const data = await seed(tx);
      await recordWorkStoppageRecoveryInTransaction(tx, { ...data, ...recovery, ...changes });
    }, { timeout: 20000 })).rejects.toThrow(message);
  });

  it.each(["modify", "delete", "retroactive", "replace"] as const)("la base interdit une mutation %s contournant l'action", async (operation) => {
    await expect(prisma.$transaction(async (tx) => {
      const data = await seed(tx);
      if (operation === "modify") await tx.absence.update({ where: { id: data.absenceId }, data: { endDate: new Date("2026-03-20") } });
      else if (operation === "delete") await tx.absence.delete({ where: { id: data.absenceId } });
      else if (operation === "retroactive") await tx.absence.update({ where: { id: data.absenceId }, data: { returnDate: new Date("2026-01-25"), returnReasonCode: "01" } });
      else {
        await recordWorkStoppageRecoveryInTransaction(tx, { ...data, ...recovery });
        await tx.absence.update({ where: { id: data.absenceId }, data: { returnReasonCode: "03" } });
      }
    }, { timeout: 20000 })).rejects.toThrow(/figés|supprimée|régularisation|remplacée/);
  });

  it("ne valide ni un snapshot incomplet ni une absence ajoutée après calcul et acquiert un verrou réel", async () => {
    await expect(prisma.$transaction(async (tx) => {
      const data = await seed(tx);
      await lockPayrollAbsenceChanges(tx, data.organizationId);
      const locks = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM pg_locks WHERE pid = pg_backend_pid() AND locktype = 'advisory' AND granted`;
      expect(Number(locks[0].count)).toBeGreaterThan(0);
      await expect(assertAbsenceStartsAfterClosedPayroll(tx, data.organizationId, data.employeeId, new Date("2026-01-25"))).rejects.toThrow(/régularisation/);
      await expect(assertAbsenceStartsAfterClosedPayroll(tx, data.organizationId, data.employeeId, new Date("2026-02-01"))).resolves.toBeUndefined();
      expect((await invalidateOpenPayrollFrom(tx, data.organizationId, data.employeeId, new Date("2026-02-01"))).count).toBe(1);
      await expect(assertCurrentPayrollAbsences(tx, { ...data, year: 2026, month: 2, calculations: [{ employeeId: data.employeeId, absences: undefined }] })).rejects.toThrow(/pas vérifiables/);
      await expect(assertCurrentPayrollAbsences(tx, { ...data, year: 2026, month: 2, calculations: [{ employeeId: data.employeeId, absences: [] }] })).rejects.toThrow(/a changé/);
      throw new Error("ROLLBACK_VERIFIED");
    }, { timeout: 20000 })).rejects.toThrow("ROLLBACK_VERIFIED");
  });
});
