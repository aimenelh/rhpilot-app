import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { latestRuleDecisions } from "@/lib/hr-rules/server";
import { requireEmployeeSession } from "@/lib/employee-space/session";
import { ABSENCE_STATUS_LABELS, ABSENCE_TYPE_LABELS, REQUESTS_CLOSED_MESSAGES, calendarDays, canEmployeeCancelAbsence, formatDateRange, requestsClosedReason } from "@/lib/employee-space/labels";
import { AbsenceRequestForm } from "./AbsenceRequestForm";
import { CancelRequestButton } from "./CancelRequestButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes absences" };

const STATUS_TONE: Record<string, string> = {
  VALIDATED: "text-accent-teal",
  REJECTED: "text-accent-rose",
};

export default async function EspaceAbsencesPage() {
  const { account, user } = await requireEmployeeSession();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 12);
  const absences = await prisma.absence.findMany({
    where: { organizationId: account.organizationId, employeeId: account.employeeId, endDate: { gte: since } },
    select: { id: true, type: true, startDate: true, endDate: true, status: true, payrollImpactStatus: true, rejectedReason: true },
    orderBy: { startDate: "desc" },
    take: 60,
  });
  const ownRequests = new Set((await prisma.auditLog.findMany({
    where: { organizationId: account.organizationId, action: "absence.requested_by_employee", entityType: "Absence", entityId: { in: absences.map((absence) => absence.id) }, actorUserId: user.id, metadata: { path: ["employeeId"], equals: account.employeeId } },
    select: { entityId: true },
  })).map((row) => row.entityId));
  const [ruleDecisions, activeRuleCount] = await Promise.all([
    latestRuleDecisions(account.organizationId, absences.map((absence) => absence.id)).catch(() => new Map()),
    prisma.hr_rules.count({ where: { organizationId: account.organizationId, status: "ACTIVE" } }).catch(() => 0),
  ]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const closed = requestsClosedReason(account);
  const ended = closed !== null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Mes absences</h1>
        <p className="mt-1 text-sm text-ink-soft">Posez vos congés ou déclarez un arrêt. La réponse de {account.organizationName} s’affiche ici.</p>
        {activeRuleCount > 0 ? <p className="mt-2 text-sm"><Link href="/espace/regles" className="font-medium text-ink underline decoration-surface-border underline-offset-4 hover:decoration-ink/40">Les règles de congés de l’entreprise</Link></p> : null}
      </div>

      {ended ? (
        <div className="rounded-2xl border border-surface-border bg-white px-4 py-3.5 text-sm text-ink-soft">{REQUESTS_CLOSED_MESSAGES[closed ?? "contract-ended"]}</div>
      ) : (
        <AbsenceRequestForm today={todayIso} />
      )}

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">Demandes et absences des 12 derniers mois</h2>
        {absences.length === 0 ? (
          <p className="rounded-2xl border border-surface-border bg-white px-5 py-8 text-center text-sm text-ink-soft">Aucune absence sur cette période.</p>
        ) : (
          <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
            {absences.map((absence) => {
              const count = calendarDays(absence.startDate, absence.endDate);
              return (
                <div key={absence.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{ABSENCE_TYPE_LABELS[absence.type] ?? absence.type}</p>
                    <p className="text-[13px] text-ink-soft">{formatDateRange(absence.startDate, absence.endDate)} · {count} jour{count > 1 ? "s" : ""}</p>
                    <p className={`mt-0.5 text-[13px] font-medium ${STATUS_TONE[absence.status] ?? "text-accent-amber"}`}>{ABSENCE_STATUS_LABELS[absence.status] ?? absence.status}</p>
                    {absence.status === "REJECTED" && absence.rejectedReason ? <p className="mt-1 text-[13px] leading-5 text-ink-soft">Motif : {absence.rejectedReason}</p> : null}
                    {absence.status === "VALIDATED" && ruleDecisions.get(absence.id)?.employeeExplanation ? <p className="mt-1 text-[13px] leading-5 text-ink-soft">{ruleDecisions.get(absence.id)?.employeeExplanation}</p> : null}
                  </div>
                  {ownRequests.has(absence.id) && canEmployeeCancelAbsence(absence) ? <CancelRequestButton absenceId={absence.id} /> : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
