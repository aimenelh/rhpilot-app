import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { prisma } from "@/lib/prisma";
import { parisDayKey } from "@/lib/hr-rules/engine";
import { loadEngineEmployees, loadLegalContext, loadSimulationAbsences } from "@/lib/hr-rules/server";
import { parseLeaveRuleSpec } from "@/lib/hr-rules/spec";
import { isRuleTranslationEnabled } from "@/lib/hr-rules/translate";
import RulesWorkspace, { type RuleListItem } from "./RulesWorkspace";

export const metadata = { title: "Règles maison" };
export const dynamic = "force-dynamic";

export default async function HouseRulesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  if (!isOrganizationAdmin(membership)) redirect("/dashboard");
  const organizationId = membership.organizationId;

  const [rows, decisions, employees, absences, legalContext] = await Promise.all([
    prisma.hr_rules.findMany({ where: { organizationId }, orderBy: [{ createdAt: "desc" }], take: 200 }),
    prisma.hr_rule_decisions.findMany({ where: { organizationId }, select: { ruleIds: true, decidedBy: true, followedRules: true }, orderBy: { createdAt: "desc" }, take: 5000 }),
    loadEngineEmployees(organizationId),
    loadSimulationAbsences(organizationId),
    loadLegalContext(organizationId),
  ]);

  const stats = new Map<string, { automatic: number; followed: number; overridden: number }>();
  for (const decision of decisions) {
    for (const ruleId of decision.ruleIds) {
      const entry = stats.get(ruleId) ?? { automatic: 0, followed: 0, overridden: 0 };
      if (decision.decidedBy === "RULE") entry.automatic += 1;
      else if (decision.followedRules) entry.followed += 1;
      else entry.overridden += 1;
      stats.set(ruleId, entry);
    }
  }

  const rules: RuleListItem[] = rows.flatMap((row) => {
    const parsed = parseLeaveRuleSpec(row.spec);
    if (!parsed.ok) return [];
    return [{
      id: row.id,
      lineageId: row.lineageId,
      version: row.version,
      title: row.title,
      sourceText: row.sourceText,
      spec: parsed.spec,
      mode: row.mode === "AUTO_APPROVE" ? "AUTO_APPROVE" : "PROPOSE",
      status: row.status === "ACTIVE" ? "ACTIVE" : "ARCHIVED",
      effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
      createdAt: row.createdAt.toISOString(),
      archivedAt: row.archivedAt?.toISOString() ?? null,
      stats: stats.get(row.id) ?? { automatic: 0, followed: 0, overridden: 0 },
    }];
  });

  return (
    <div className="max-w-none">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Gestion RH</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Règles maison</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">
            Écrivez vos règles de congés comme vous les expliqueriez à un salarié. RH Pilot vérifie qu’elles tiennent juridiquement, les teste sur votre passé, puis les applique pareil pour tout le monde.
          </p>
        </div>
      </div>

      <RulesWorkspace
        rules={rules}
        employees={employees.map((employee) => ({ ...employee, hireDate: employee.hireDate.toISOString() }))}
        absences={absences.map((absence) => ({ ...absence, startDate: absence.startDate.toISOString(), endDate: absence.endDate.toISOString(), createdAt: absence.createdAt.toISOString() }))}
        legalContext={legalContext}
        translationEnabled={isRuleTranslationEnabled()}
        today={parisDayKey(new Date())}
      />
    </div>
  );
}
