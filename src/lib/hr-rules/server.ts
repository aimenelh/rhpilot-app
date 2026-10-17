/**
 * Règles maison côté serveur : lecture des règles et des données, verdicts
 * des demandes, traces des décisions. Le calcul lui-même vit dans engine.ts.
 */

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateAbsenceInTransaction } from "@/lib/absences/validation";
import { evaluateRequest, parisDayKey, PENDING_STATUSES, type EngineAbsence, type EngineEmployee, type EngineRule, type RequestVerdict } from "./engine";
import { GOVERNED_ABSENCE_TYPES, parseLeaveRuleSpec } from "./spec";
import type { LegalContext } from "./legal";
import { buildComplianceTrackingFromAuditLogs } from "@/lib/compliance/obligations";

export type RuleMode = "PROPOSE" | "AUTO_APPROVE";
export type ActiveRule = EngineRule & { lineageId: string; mode: RuleMode; effectiveFrom: Date };

const DAY_MS = 86_400_000;

/** Les règles en vigueur à une date (par défaut aujourd'hui, à Paris). */
export async function loadActiveRules(organizationId: string, at = new Date()): Promise<ActiveRule[]> {
  const rows = await prisma.hr_rules.findMany({
    where: { organizationId, status: "ACTIVE", domain: "LEAVE", effectiveFrom: { lte: new Date(`${parisDayKey(at)}T00:00:00.000Z`) } },
    orderBy: { createdAt: "asc" },
  });
  return rows.flatMap((row) => {
    const parsed = parseLeaveRuleSpec(row.spec);
    // Une règle illisible n'est jamais appliquée à moitié : elle est ignorée.
    if (!parsed.ok) return [];
    return [{ id: row.id, lineageId: row.lineageId, title: row.title, version: row.version, spec: parsed.spec, mode: row.mode === "AUTO_APPROVE" ? "AUTO_APPROVE" : "PROPOSE", effectiveFrom: row.effectiveFrom }];
  });
}

export async function loadEngineEmployees(organizationId: string): Promise<EngineEmployee[]> {
  return prisma.employee.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, hireDate: true, managerMembershipId: true, position: true, professionalCategory: true, contractType: true, dependentChildren: true },
  });
}

/** Les absences utiles autour d'une plage : de quoi compter les absents et chercher d'autres dates. */
export async function loadEngineAbsences(organizationId: string, from: Date, to: Date): Promise<EngineAbsence[]> {
  return prisma.absence.findMany({
    where: { organizationId, status: { not: "REJECTED" }, startDate: { lte: new Date(to.getTime() + 100 * DAY_MS) }, endDate: { gte: new Date(from.getTime() - DAY_MS) } },
    select: { id: true, employeeId: true, type: true, startDate: true, endDate: true, status: true, createdAt: true },
    take: 5000,
  });
}

type AbsenceForVerdict = { id: string; employeeId: string; type: string; startDate: Date; endDate: Date; createdAt: Date };

export function isGovernedType(type: string): boolean {
  return (GOVERNED_ABSENCE_TYPES as readonly string[]).includes(type);
}

/** Verdict d'une seule demande, avec les règles en vigueur. */
export async function verdictForAbsence(organizationId: string, absence: AbsenceForVerdict, rules?: ActiveRule[]): Promise<{ verdict: RequestVerdict; rules: ActiveRule[] } | null> {
  if (!isGovernedType(absence.type)) return null;
  const activeRules = rules ?? (await loadActiveRules(organizationId));
  if (activeRules.length === 0) return null;
  const [employees, absences] = await Promise.all([loadEngineEmployees(organizationId), loadEngineAbsences(organizationId, absence.startDate, absence.endDate)]);
  const verdict = evaluateRequest({
    request: { absenceId: absence.id, employeeId: absence.employeeId, type: absence.type, startDate: absence.startDate, endDate: absence.endDate, createdAt: absence.createdAt },
    rules: activeRules,
    employees,
    absences,
  });
  return verdict.outcome === "NO_RULE" ? null : { verdict, rules: activeRules };
}

export type VerdictSummary = {
  outcome: RequestVerdict["outcome"];
  hrExplanation: string;
  hrDetails: string;
  employeeExplanation: string;
  suggestion: RequestVerdict["suggestion"];
  rules: { title: string; version: number }[];
  missingData: string[];
};

function summarize(verdict: RequestVerdict): VerdictSummary {
  return {
    outcome: verdict.outcome,
    hrExplanation: verdict.hrExplanation,
    hrDetails: verdict.hrDetails,
    employeeExplanation: verdict.employeeExplanation,
    suggestion: verdict.suggestion,
    rules: verdict.evaluations.map((evaluation) => ({ title: evaluation.ruleTitle, version: evaluation.ruleVersion })),
    missingData: [...new Set(verdict.evaluations.flatMap((evaluation) => evaluation.missingData))],
  };
}

/** Verdicts de toutes les demandes en attente, pour le module Absences. */
export async function pendingVerdicts(organizationId: string): Promise<Record<string, VerdictSummary>> {
  const rules = await loadActiveRules(organizationId);
  if (rules.length === 0) return {};
  const pending = await prisma.absence.findMany({
    where: { organizationId, status: { in: [...PENDING_STATUSES] as ("TO_VALIDATE" | "TO_PROVIDE_JUSTIFICATION" | "TO_REVIEW_JUSTIFICATION")[] }, type: { in: [...GOVERNED_ABSENCE_TYPES] } },
    select: { id: true, employeeId: true, type: true, startDate: true, endDate: true, createdAt: true },
    take: 300,
  });
  if (pending.length === 0) return {};
  const from = new Date(Math.min(...pending.map((absence) => absence.startDate.getTime())));
  const to = new Date(Math.max(...pending.map((absence) => absence.endDate.getTime())));
  const [employees, absences] = await Promise.all([loadEngineEmployees(organizationId), loadEngineAbsences(organizationId, from, to)]);
  const result: Record<string, VerdictSummary> = {};
  for (const absence of pending) {
    const verdict = evaluateRequest({
      request: { absenceId: absence.id, employeeId: absence.employeeId, type: absence.type, startDate: absence.startDate, endDate: absence.endDate, createdAt: absence.createdAt },
      rules,
      employees,
      absences,
    });
    if (verdict.outcome !== "NO_RULE") result[absence.id] = summarize(verdict);
  }
  return result;
}

/** Garde la trace d'une décision sur une demande gouvernée : ce que proposaient les règles, ce qui a été décidé. */
export async function recordRuleDecision(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; absenceId: string; employeeId: string; verdict: RequestVerdict; decision: "VALIDATED" | "REJECTED"; decidedBy: "RULE" | "HR"; actorUserId: string | null; employeeExplanation?: string | null },
) {
  if (input.verdict.outcome === "NO_RULE") return;
  const followedRules = input.decision === "VALIDATED" ? input.verdict.outcome === "APPROVE" : input.verdict.outcome === "REFUSE";
  await tx.hr_rule_decisions.create({
    data: {
      id: randomUUID(),
      organizationId: input.organizationId,
      absenceId: input.absenceId,
      employeeId: input.employeeId,
      ruleIds: input.verdict.evaluations.map((evaluation) => evaluation.ruleId),
      ruleOutcome: input.verdict.outcome,
      decision: input.decision,
      decidedBy: input.decidedBy,
      followedRules,
      hrExplanation: input.verdict.hrExplanation,
      employeeExplanation: input.employeeExplanation ?? (input.decision === "VALIDATED" && input.verdict.outcome === "APPROVE" ? input.verdict.employeeExplanation : null),
      evaluation: JSON.parse(JSON.stringify(input.verdict)) as Prisma.InputJsonValue,
      actorUserId: input.actorUserId,
    },
  });
}

/**
 * Juste après une demande du salarié : si toutes les règles applicables
 * l'accordent et sont en validation automatique, elle est validée tout de
 * suite. Un refus n'est jamais envoyé automatiquement. Un échec (paie
 * clôturée, justificatif attendu…) laisse simplement la demande au RH.
 */
export async function applyHouseRulesToNewRequest(organizationId: string, absenceId: string): Promise<{ autoApproved: boolean; employeeExplanation: string | null }> {
  const absence = await prisma.absence.findFirst({ where: { id: absenceId, organizationId }, select: { id: true, employeeId: true, type: true, startDate: true, endDate: true, createdAt: true, status: true } });
  if (!absence || absence.status !== "TO_VALIDATE") return { autoApproved: false, employeeExplanation: null };
  const result = await verdictForAbsence(organizationId, absence);
  if (!result || result.verdict.outcome !== "APPROVE") return { autoApproved: false, employeeExplanation: null };
  const applicable = new Set(result.verdict.evaluations.map((evaluation) => evaluation.ruleId));
  const allAutomatic = result.rules.filter((rule) => applicable.has(rule.id)).every((rule) => rule.mode === "AUTO_APPROVE");
  if (!allAutomatic) return { autoApproved: false, employeeExplanation: null };
  try {
    await prisma.$transaction(async (tx) => {
      const outcome = await validateAbsenceInTransaction(tx, { organizationId, absenceId, actorUserId: null, auditMetadata: { by: "house_rule", ruleIds: [...applicable] } });
      if (outcome.alreadyValidated) return;
      await recordRuleDecision(tx, { organizationId, absenceId, employeeId: absence.employeeId, verdict: result.verdict, decision: "VALIDATED", decidedBy: "RULE", actorUserId: null });
    }, { maxWait: 10000, timeout: 20000 });
  } catch {
    return { autoApproved: false, employeeExplanation: null };
  }
  return { autoApproved: true, employeeExplanation: result.verdict.employeeExplanation };
}

/** Dernière décision fondée sur une règle, par absence (pour l'espace salarié et le dossier RH). */
export async function latestRuleDecisions(organizationId: string, absenceIds: string[]) {
  if (absenceIds.length === 0) return new Map<string, { decision: string; decidedBy: string; followedRules: boolean; hrExplanation: string; employeeExplanation: string | null; createdAt: Date; ruleIds: string[] }>();
  const rows = await prisma.hr_rule_decisions.findMany({
    where: { organizationId, absenceId: { in: absenceIds } },
    select: { absenceId: true, decision: true, decidedBy: true, followedRules: true, hrExplanation: true, employeeExplanation: true, createdAt: true, ruleIds: true },
    orderBy: { createdAt: "desc" },
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!latest.has(row.absenceId)) latest.set(row.absenceId, row);
  return latest;
}

/** Ce que le contrôle juridique doit savoir de l'entreprise. */
export async function loadLegalContext(organizationId: string): Promise<LegalContext> {
  const [organization, employees, trackingLogs] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { conventionCollective: true, collectiveAgreement: { select: { name: true } } } }),
    prisma.employee.findMany({ where: { organizationId, deletedAt: null }, select: { dependentChildren: true } }),
    prisma.auditLog.findMany({ where: { organizationId, action: "compliance.tracking.updated" }, select: { entityId: true, metadata: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const tracking = buildComplianceTrackingFromAuditLogs(trackingLogs);
  return {
    cseStatus: tracking.organization.cseStatus,
    employeeCount: employees.length,
    familyKnownCount: employees.filter((employee) => employee.dependentChildren !== null).length,
    collectiveAgreementName: organization?.collectiveAgreement?.name ?? organization?.conventionCollective ?? null,
  };
}

/** Historique pour le test sur le passé : un an en arrière, un an en avant, refus compris. */
export async function loadSimulationAbsences(organizationId: string): Promise<EngineAbsence[]> {
  const now = Date.now();
  return prisma.absence.findMany({
    where: { organizationId, startDate: { gte: new Date(now - 400 * DAY_MS), lte: new Date(now + 400 * DAY_MS) } },
    select: { id: true, employeeId: true, type: true, startDate: true, endDate: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 3000,
  });
}
