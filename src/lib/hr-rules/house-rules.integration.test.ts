import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { authState } from "@/test/mockAuth";
import { activateRule, archiveRule } from "@/app/dashboard/regles/actions";
import { rejectAbsence, validateAbsence } from "@/app/dashboard/absences/actions";
import { anonymizeEmployee } from "@/app/dashboard/employees/actions";
import { applyHouseRulesToNewRequest, latestRuleDecisions, loadActiveRules, loadLegalContext, pendingVerdicts } from "./server";
import type { LeaveRuleSpec } from "./spec";

const RUN_ID = `test-${Date.now()}-house-rules`;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const nextYear = new Date().getUTCFullYear() + 1;
const summerDay = (monthDay: string) => day(`${nextYear}-${monthDay}`);

const summer: LeaveRuleSpec = {
  version: 1,
  absenceTypes: ["PAID_LEAVE"],
  period: { kind: "YEARLY", from: "06-01", to: "08-31" },
  employees: { contractTypes: [], categories: [] },
  constraints: [{ kind: "MAX_CONCURRENT", max: 2, group: "COMPANY" }],
  priority: ["FAMILY_SITUATION", "SENIORITY"],
  onViolation: "REFUSE",
};

describe.skipIf(!process.env.DATABASE_URL)("règles maison sur PostgreSQL", () => {
  let organizationId = "";
  let userId = "";
  const employees: Record<string, string> = {};

  async function absence(employee: string, start: string, end: string, status: "VALIDATED" | "TO_VALIDATE") {
    const id = randomUUID();
    await prisma.absence.create({ data: { id, organizationId, employeeId: employees[employee], type: "PAID_LEAVE", startDate: summerDay(start), endDate: summerDay(end), status, payrollImpactStatus: status === "VALIDATED" ? "READY" : "PENDING" } });
    return id;
  }

  beforeAll(async () => {
    const organization = await prisma.organization.create({ data: { name: `${RUN_ID}-org` } });
    organizationId = organization.id;
    const user = await prisma.user.create({ data: { email: `${RUN_ID}@example.test`, authProviderId: `${RUN_ID}-clerk` } });
    userId = user.id;
    await prisma.membership.create({ data: { userId, organizationId, accessRole: "OWNER" } });
    for (const [key, firstName, hireDate, children] of [
      ["karim", "Karim", "2019-03-01", 0],
      ["lea", "Léa", "2021-09-01", 1],
      ["tom", "Tom", "2017-01-09", 0],
      ["sarah", "Sarah", "2023-02-01", 2],
    ] as const) {
      const employee = await prisma.employee.create({ data: { organizationId, firstName, lastName: RUN_ID.slice(-8), hireDate: day(hireDate), contractType: "CDI", dependentChildren: children } });
      employees[key] = employee.id;
    }
    authState.userId = `${RUN_ID}-clerk`;
  });

  afterAll(async () => {
    authState.userId = null;
    if (!organizationId) return;
    await prisma.hr_rule_decisions.deleteMany({ where: { organizationId } });
    await prisma.hr_rules.deleteMany({ where: { organizationId } });
    await prisma.absence.deleteMany({ where: { organizationId } });
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.employee.deleteMany({ where: { organizationId } });
    await prisma.membership.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  });

  it("refuse d'activer une règle contraire au Code du travail", async () => {
    const result = await activateRule({ title: "Ancienneté", sourceText: "", spec: { ...summer, constraints: [{ kind: "MIN_SENIORITY_DAYS", days: 90 }] }, mode: "PROPOSE", effectiveFrom: new Date().toISOString().slice(0, 10) });
    expect(result?.error).toBe("Les congés payés se prennent dès l'embauche");
    expect(await prisma.hr_rules.count({ where: { organizationId } })).toBe(0);
  });

  it("active une règle, puis une nouvelle version qui remplace la première", async () => {
    const today = new Date().toISOString().slice(0, 10);
    expect((await activateRule({ title: "Congés d'été", sourceText: "L'été, pas plus de deux absents.", spec: summer, mode: "PROPOSE", effectiveFrom: today }))?.success).toBeTruthy();
    const first = await prisma.hr_rules.findFirstOrThrow({ where: { organizationId } });
    expect((await activateRule({ lineageId: first.lineageId, title: "Congés d'été", sourceText: "", spec: summer, mode: "AUTO_APPROVE", effectiveFrom: today }))?.success).toBeTruthy();
    const versions = await prisma.hr_rules.findMany({ where: { organizationId }, orderBy: { version: "asc" } });
    expect(versions.map((rule) => [rule.version, rule.status, rule.mode])).toEqual([[1, "ARCHIVED", "PROPOSE"], [2, "ACTIVE", "AUTO_APPROVE"]]);
    const active = await loadActiveRules(organizationId);
    expect(active.map((rule) => rule.version)).toEqual([2]);
  });

  it("propose un refus pour une demande au-delà de la limite, avec des dates possibles", async () => {
    await absence("lea", "07-05", "07-09", "VALIDATED");
    await absence("tom", "07-05", "07-09", "VALIDATED");
    const karim = await absence("karim", "07-05", "07-09", "TO_VALIDATE");
    const verdicts = await pendingVerdicts(organizationId);
    expect(verdicts[karim]?.outcome).toBe("REFUSE");
    expect(verdicts[karim]?.suggestion?.startDate).toBe(`${nextYear}-07-10`);
    expect(verdicts[karim]?.employeeExplanation).not.toContain("Tom");

    const rejection = await rejectAbsence(karim, verdicts[karim]!.employeeExplanation);
    expect(rejection?.success).toBe("Absence refusée.");
    const decision = await prisma.hr_rule_decisions.findFirstOrThrow({ where: { organizationId, absenceId: karim } });
    expect([decision.decision, decision.decidedBy, decision.followedRules]).toEqual(["REJECTED", "HR", true]);
  });

  it("valide seule une demande conforme quand la règle est en validation automatique", async () => {
    const sarah = await absence("sarah", "08-10", "08-14", "TO_VALIDATE");
    const outcome = await applyHouseRulesToNewRequest(organizationId, sarah);
    expect(outcome.autoApproved).toBe(true);
    const row = await prisma.absence.findUniqueOrThrow({ where: { id: sarah } });
    expect([row.status, row.payrollImpactStatus, row.validatedByUserId]).toEqual(["VALIDATED", "READY", null]);
    const decisions = await latestRuleDecisions(organizationId, [sarah]);
    expect(decisions.get(sarah)?.decidedBy).toBe("RULE");
    expect(decisions.get(sarah)?.employeeExplanation).toContain("Congés d'été");
  });

  it("garde la trace d'une décision contraire à la règle", async () => {
    const karimAgain = await absence("karim", "07-06", "07-08", "TO_VALIDATE");
    expect((await applyHouseRulesToNewRequest(organizationId, karimAgain)).autoApproved).toBe(false);
    expect((await validateAbsence(karimAgain))?.success).toBeTruthy();
    const decision = await prisma.hr_rule_decisions.findFirstOrThrow({ where: { organizationId, absenceId: karimAgain } });
    expect([decision.decision, decision.decidedBy, decision.followedRules, decision.ruleOutcome]).toEqual(["VALIDATED", "HR", false, "REFUSE"]);
  });

  it("efface le nom d'un salarié anonymisé des explications", async () => {
    const before = await prisma.hr_rule_decisions.count({ where: { organizationId, hrExplanation: { contains: `Tom ${RUN_ID.slice(-8)}` } } });
    expect(before).toBeGreaterThan(0);
    await prisma.employee.update({ where: { id: employees.tom }, data: { deletedAt: new Date() } });
    await expect(anonymizeEmployee(employees.tom)).rejects.toThrow("NEXT_REDIRECT");
    expect(await prisma.hr_rule_decisions.count({ where: { organizationId, hrExplanation: { contains: `Tom ${RUN_ID.slice(-8)}` } } })).toBe(0);
    const decisions = await prisma.hr_rule_decisions.findMany({ where: { organizationId }, select: { evaluation: true } });
    expect(JSON.stringify(decisions)).not.toContain(`Tom ${RUN_ID.slice(-8)}`);
  });

  it("lit le contexte juridique et désactive une règle", async () => {
    const context = await loadLegalContext(organizationId);
    expect(context.employeeCount).toBe(3);
    expect(context.cseStatus).toBe("UNKNOWN");
    const [active] = await loadActiveRules(organizationId);
    expect((await archiveRule(active.id))?.success).toBeTruthy();
    expect(await loadActiveRules(organizationId)).toEqual([]);
  });
});
