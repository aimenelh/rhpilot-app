import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployeeSession } from "@/lib/employee-space/session";
import { describeRule, parseLeaveRuleSpec } from "@/lib/hr-rules/spec";

export const dynamic = "force-dynamic";
export const metadata = { title: "Règles de congés" };

function formatDay(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).replace(/^1 /, "1er ");
}

/** Les règles de congés en vigueur, publiées telles que l'employeur les a validées. */
export default async function EspaceReglesPage() {
  const { account } = await requireEmployeeSession();
  const rows = await prisma.hr_rules.findMany({
    where: { organizationId: account.organizationId, status: "ACTIVE" },
    select: { id: true, title: true, spec: true, effectiveFrom: true, version: true },
    orderBy: { createdAt: "asc" },
  });
  const rules = rows.flatMap((row) => {
    const parsed = parseLeaveRuleSpec(row.spec);
    return parsed.ok ? [{ ...row, lines: describeRule(parsed.spec) }] : [];
  });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/espace/absences" className="text-sm text-ink-soft underline decoration-surface-border underline-offset-4 hover:text-ink">Mes absences</Link>
        <h1 className="mt-2 text-[22px] font-semibold text-ink">Règles de congés</h1>
        <p className="mt-1 text-sm leading-6 text-ink-soft">
          Les règles que {account.organizationName} applique à toutes les demandes, de la même façon pour chacun. Quand une demande est accordée ou refusée selon une règle, la réponse le précise.
        </p>
      </div>
      {rules.length === 0 ? (
        <p className="rounded-2xl border border-surface-border bg-white px-5 py-8 text-center text-sm text-ink-soft">Aucune règle publiée pour l’instant.</p>
      ) : (
        <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
          {rules.map((rule) => (
            <article key={rule.id} className="px-4 py-4 sm:px-5">
              <h2 className="text-[19px] leading-7 text-ink [font-family:var(--font-newsreader),Georgia,serif]">{rule.title}</h2>
              <ul className="mt-2 space-y-1.5 text-[15px] leading-6 text-ink-soft">
                {rule.lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p className="mt-2 text-xs text-ink-faint">{rule.effectiveFrom > new Date() ? `S’applique à partir du ${formatDay(rule.effectiveFrom)}.` : `En vigueur depuis le ${formatDay(rule.effectiveFrom)}.`}</p>
            </article>
          ))}
        </div>
      )}
      <p className="px-1 text-xs leading-5 text-ink-faint">Ces règles ne s’appliquent jamais aux arrêts maladie, accidents du travail, congés maternité ou paternité, ni aux congés pour événement familial.</p>
    </div>
  );
}
