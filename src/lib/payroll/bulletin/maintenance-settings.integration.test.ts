import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { LEGAL_SICK_PAY } from "./params";
import { loadOrganizationBulletinSettings } from "./period-loader";

describe.skipIf(!process.env.DATABASE_URL)("paramètres de maintien sur PostgreSQL", () => {
  it("conserve l'effectif décimal et les règles sans les partager entre entreprises", async () => {
    const first = `payroll-maintenance-${randomUUID()}`;
    const second = `payroll-maintenance-${randomUUID()}`;
    const rule = { ...LEGAL_SICK_PAY, fullRate: 1, source: "Accord synthétique du 01/01/2026" };
    try {
      await prisma.organization.create({ data: { id: first, name: "Entreprise test maintien", payrollHeadcount: "10.99", sickPayRule: rule } });
      await prisma.organization.create({ data: { id: second, name: "Entreprise test distincte" } });
      const settings = await loadOrganizationBulletinSettings(first);
      expect(settings.payrollHeadcount).toBe(10.99);
      expect(settings.sickPayRule).toEqual(rule);
      const other = await loadOrganizationBulletinSettings(second);
      expect(other.sickPayRule).toBeUndefined();
      expect(other.workAccidentPayRule).toBeUndefined();
      await prisma.$executeRaw`UPDATE "organizations" SET "sickPayRule" = ${JSON.stringify({ ...rule, waitingDays: 8 })}::jsonb WHERE "id" = ${first}`;
      await expect(loadOrganizationBulletinSettings(first)).rejects.toThrow(/carence/);
    } finally {
      await prisma.organization.deleteMany({ where: { id: { in: [first, second] } } });
    }
  });
});
