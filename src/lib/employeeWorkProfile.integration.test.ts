import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveEmployeeWorkProfile } from "./employeeWorkProfile";
import { parseEmployeeCsv } from "./employeeCsv";

describe.skipIf(!process.env.DATABASE_URL)("profil contractuel enregistré sur PostgreSQL", () => {
  const organizationId = `contract-work-${randomUUID()}`;
  let employeeId: string;
  beforeAll(async () => {
    await prisma.organization.create({ data: { id: organizationId, name: "Test horaires contractuels" } });
    const employee = await prisma.employee.create({ data: { organizationId, firstName: "Salarié", lastName: "Test", hireDate: new Date("2026-01-01"), contractType: "CDI" } });
    employeeId = employee.id;
  });
  afterAll(async () => {
    await prisma.payrollProfile.deleteMany({ where: { organizationId } });
    await prisma.employee.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  });

  it("importe une durée connue avec salaire facultatif et conserve un planning inconnu", async () => {
    const parsed = parseEmployeeCsv("prenom,nom,date_embauche,type_contrat,heures_hebdomadaires\nJulie,Martin,2026-01-01,CDI,24");
    const row = parsed.rows[0];
    await prisma.$transaction((tx) => saveEmployeeWorkProfile(tx, { organizationId, employeeId, effectiveFrom: row.hireDate, weeklyHours: row.weeklyHours!, weeklySchedule: row.weeklySchedule, baseSalaryCents: row.baseSalaryCents }));
    const profile = await prisma.payrollProfile.findFirstOrThrow({ where: { organizationId, employeeId } });
    expect(Number(profile.monthlyHours)).toBe(104);
    expect(profile.weeklySchedule).toBeNull();
    expect(profile.baseSalaryCents).toBeNull();
  });

  it("versionne le passage à 39 h et conserve la rémunération lors d'une correction", async () => {
    await prisma.$transaction((tx) => saveEmployeeWorkProfile(tx, { organizationId, employeeId, effectiveFrom: new Date("2026-04-01"), weeklyHours: 39, weeklySchedule: [7.8, 7.8, 7.8, 7.8, 7.8, 0, 0], baseSalaryCents: 320000 }));
    await prisma.$transaction((tx) => saveEmployeeWorkProfile(tx, { organizationId, employeeId, effectiveFrom: new Date("2026-04-01"), weeklyHours: 39, weeklySchedule: [8, 8, 8, 8, 7, 0, 0] }));
    const profiles = await prisma.payrollProfile.findMany({ where: { organizationId, employeeId }, orderBy: { effectiveFrom: "asc" } });
    expect(profiles).toHaveLength(2);
    expect(profiles[0].effectiveUntil?.toISOString().slice(0, 10)).toBe("2026-03-31");
    expect(Number(profiles[1].monthlyHours)).toBe(169);
    expect(Number(profiles[1].structuralOvertimeHours)).toBe(17.33);
    expect(profiles[1].baseSalaryCents).toBe(320000);
    expect(profiles[1].weeklySchedule).toEqual([8, 8, 8, 8, 7, 0, 0]);
  });

  it("refuse un salarié d'une autre entreprise et annule la transaction", async () => {
    await expect(prisma.$transaction((tx) => saveEmployeeWorkProfile(tx, { organizationId: "other-company", employeeId, effectiveFrom: new Date("2026-06-01"), weeklyHours: 35, weeklySchedule: [7, 7, 7, 7, 7, 0, 0] }))).rejects.toThrow(/foreign key|constraint|violates/i);
    expect(await prisma.payrollProfile.count({ where: { employeeId, organizationId } })).toBe(2);
  });
});
