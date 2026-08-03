import Link from "next/link";
import { TriangleAlert, Clock, UserRoundX, CircleCheck, Sparkles } from "lucide-react";
import { getCurrentMemberships } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRelativeDueDate, isOverdue } from "@/lib/urgency";
import { getAnomalies } from "@/lib/anomalies";
import { triggerEventQuick } from "./events/actions";

// Le tableau de bord change à chaque action (créer un parcours,
// changer un statut...) — il ne doit jamais servir une version mise en
// cache par le navigateur, même quelques secondes, sous peine
// d'afficher une suggestion déjà traitée comme si elle ne l'était pas.
export const dynamic = "force-dynamic";

type AttentionReason = "overdue" | "unassigned" | "soon";
type OpenTask = Awaited<ReturnType<typeof getOpenTasks>>[number];

async function getOpenTasks(organizationId: string) {
  return prisma.task.findMany({
    where: {
      organizationId,
      status: { notIn: ["DONE", "CANCELLED"] },
      // Un salarié archivé ne doit plus jamais apparaître comme
      // méritant "votre attention" — c'est justement le sens de
      // l'archivage.
      employeeEvent: { employee: { deletedAt: null } },
    },
    include: { employeeEvent: { include: { employee: true } } },
  });
}

function getReason(task: OpenTask): AttentionReason | null {
  if (isOverdue(task.dueDate, task.status)) return "overdue";
  if (!task.assignedMembershipId) return "unassigned";
  const diff = Math.round(
    (task.dueDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );
  if (diff >= 0 && diff <= 7) return "soon";
  return null;
}

const REASON_PRIORITY: Record<AttentionReason, number> = { overdue: 0, unassigned: 1, soon: 2 };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const { memberships } = await getCurrentMemberships();

  if (memberships.length === 0) {
    return <CreateOrganizationForm />;
  }

  const organizationId = memberships[0].organizationId;
  const view = searchParams.view === "tasks" ? "tasks" : "employee";

  const [employeeCount, eventCount, doneCount, openTasks, anomalies, newTasksThisWeek, completedThisWeek] =
    await Promise.all([
      prisma.employee.count({ where: { organizationId, deletedAt: null } }),
      prisma.employeeEvent.count({ where: { organizationId, employee: { deletedAt: null } } }),
      prisma.task.count({
        where: {
          organizationId,
          status: "DONE",
          employeeEvent: { employee: { deletedAt: null } },
        },
      }),
      getOpenTasks(organizationId),
      getAnomalies(organizationId),
      // Chiffres réels, sans comparaison inventée avec une semaine
      // précédente qu'on n'a jamais enregistrée — seulement ce qui
      // est vérifiable dès aujourd'hui.
      prisma.task.count({
        where: {
          organizationId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          employeeEvent: { employee: { deletedAt: null } },
        },
      }),
      prisma.task.count({
        where: {
          organizationId,
          status: "DONE",
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          employeeEvent: { employee: { deletedAt: null } },
        },
      }),
    ]);

  const flagged = openTasks
    .map((task) => ({ task, reason: getReason(task) }))
    .filter((entry): entry is { task: OpenTask; reason: AttentionReason } => entry.reason !== null);

  const overdueCount = flagged.filter((e) => e.reason === "overdue").length;
  const soonCount = flagged.filter((e) => e.reason === "soon").length;

  // Vue "Toutes les tâches" : liste plate, triée par sévérité puis échéance.
  const attentionTasks = [...flagged]
    .sort((a, b) => {
      if (a.reason !== b.reason) return REASON_PRIORITY[a.reason] - REASON_PRIORITY[b.reason];
      return a.task.dueDate.getTime() - b.task.dueDate.getTime();
    })
    .slice(0, 10);

  // Vue "Par salarié" (par défaut) : regroupe pour rester lisible même
  // avec beaucoup de monde — une ligne par personne plutôt qu'une par
  // tâche, cohérent avec le retour produit reçu après test à deux
  // salariés.
  const groupsByEmployee = new Map<
    string,
    {
      employeeId: string;
      employeeName: string;
      overdueCount: number;
      unassignedCount: number;
      soonCount: number;
      earliestDue: Date;
    }
  >();

  for (const { task, reason } of flagged) {
    const employee = task.employeeEvent.employee;
    const existing = groupsByEmployee.get(employee.id);
    const group = existing ?? {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      overdueCount: 0,
      unassignedCount: 0,
      soonCount: 0,
      earliestDue: task.dueDate,
    };
    if (reason === "overdue") group.overdueCount += 1;
    if (reason === "unassigned") group.unassignedCount += 1;
    if (reason === "soon") group.soonCount += 1;
    if (task.dueDate < group.earliestDue) group.earliestDue = task.dueDate;
    groupsByEmployee.set(employee.id, group);
  }

  const employeeGroups = Array.from(groupsByEmployee.values()).sort((a, b) => {
    const severity = (g: typeof a) => (g.overdueCount > 0 ? 0 : g.unassignedCount > 0 ? 1 : 2);
    const sa = severity(a);
    const sb = severity(b);
    if (sa !== sb) return sa - sb;
    return a.earliestDue.getTime() - b.earliestDue.getTime();
  });

  // Plafonné au total, peu importe le niveau — l'ancienne règle
  // ("critique/moyen toujours visibles, seul le faible se replie")
  // ne tenait plus à l'échelle réelle : une entreprise de 50 salariés
  // importés peut légitimement avoir des dizaines d'alertes moyennes
  // en même temps (plusieurs périodes d'essai en cours simultanément,
  // par exemple). anomalies est déjà trié par sévérité, donc les 8
  // premières restent bien les plus urgentes.
  const SUGGESTIONS_LIMIT = 8;
  const visibleAnomalies = anomalies.slice(0, SUGGESTIONS_LIMIT);
  const hiddenAnomalies = anomalies.slice(SUGGESTIONS_LIMIT);
  const hiddenAnomaliesCount = hiddenAnomalies.length;

  const SEVERITY_DOT: Record<string, string> = {
    critical: "bg-accent-rose",
    medium: "bg-accent-amber",
    low: "bg-ink-faint",
  };

  const EMPLOYEE_GROUPS_LIMIT = 8;
  const visibleEmployeeGroups = employeeGroups.slice(0, EMPLOYEE_GROUPS_LIMIT);
  const hiddenEmployeeGroupsCount = employeeGroups.length - visibleEmployeeGroups.length;

  // Dérivé des données déjà chargées, sans requête supplémentaire :
  // un parcours est "à jour" s'il n'a aucune tâche en retard.
  const overdueEmployeeEventIds = new Set(
    flagged.filter((f) => f.reason === "overdue").map((f) => f.task.employeeEventId)
  );
  const percentUpToDate =
    eventCount > 0 ? Math.round(((eventCount - overdueEmployeeEventIds.size) / eventCount) * 100) : 100;

  return (
    <div className="max-w-4xl">
      <h1 data-tour="dashboard-attention" className="text-2xl font-semibold text-ink">Aujourd&apos;hui</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Ce qui mérite votre attention, avant le reste.
      </p>

      {anomalies.length > 0 && (
        <Card className="mt-6 border-brand-blue/20 bg-gradient-to-br from-brand-blue/[0.03] to-brand-violet/[0.03]">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-blue" />
            <h2 className="text-sm font-semibold text-ink">Suggestions</h2>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-surface-border">
            {visibleAnomalies.map((anomaly) => (
              <li key={anomaly.key} className="flex items-center justify-between gap-4 py-3">
                <p className="flex items-start gap-2 text-sm text-ink">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[anomaly.severity]}`} />
                  {anomaly.message}
                </p>
                {anomaly.action && (
                  <form action={triggerEventQuick}>
                    <input type="hidden" name="employeeId" value={anomaly.action.employeeId} />
                    <input type="hidden" name="eventTemplateKey" value={anomaly.action.eventTemplateKey} />
                    <input type="hidden" name="triggerDate" value={anomaly.action.triggerDate} />
                    <Button type="submit" variant="secondary" className="shrink-0">
                      {anomaly.action.label}
                    </Button>
                  </form>
                )}
                {anomaly.link && (
                  <Link href={anomaly.link.href} className="shrink-0">
                    <Button variant="secondary" type="button">
                      {anomaly.link.label}
                    </Button>
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {hiddenAnomaliesCount > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer py-2 text-sm font-medium text-brand-blue">
                Afficher {hiddenAnomaliesCount} suggestion{hiddenAnomaliesCount > 1 ? "s" : ""} de plus
              </summary>
              <ul className="flex flex-col divide-y divide-surface-border border-t border-surface-border">
                {hiddenAnomalies.map((anomaly) => (
                  <li key={anomaly.key} className="flex items-center justify-between gap-4 py-3">
                    <p className="flex items-start gap-2 text-sm text-ink">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[anomaly.severity]}`} />
                      {anomaly.message}
                    </p>
                    {anomaly.action && (
                      <form action={triggerEventQuick}>
                        <input type="hidden" name="employeeId" value={anomaly.action.employeeId} />
                        <input type="hidden" name="eventTemplateKey" value={anomaly.action.eventTemplateKey} />
                        <input type="hidden" name="triggerDate" value={anomaly.action.triggerDate} />
                        <Button type="submit" variant="secondary" className="shrink-0">
                          {anomaly.action.label}
                        </Button>
                      </form>
                    )}
                    {anomaly.link && (
                      <Link href={anomaly.link.href} className="shrink-0">
                        <Button variant="secondary" type="button">
                          {anomaly.link.label}
                        </Button>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-accent-rose/20">
          <p className="text-3xl font-semibold text-accent-rose">{overdueCount}</p>
          <p className="mt-1 text-xs font-medium text-ink-faint">en retard</p>
        </Card>
        <Card className="border-accent-amber/20">
          <p className="text-3xl font-semibold text-accent-amber">{soonCount}</p>
          <p className="mt-1 text-xs font-medium text-ink-faint">cette semaine</p>
        </Card>
        <Card className="border-brand-blue/20">
          <p className="text-3xl font-semibold text-brand-blue">{anomalies.length}</p>
          <p className="mt-1 text-xs font-medium text-ink-faint">à analyser</p>
        </Card>
        <Card className="border-accent-teal/20">
          <p className="text-3xl font-semibold text-accent-teal">{doneCount}</p>
          <p className="mt-1 text-xs font-medium text-ink-faint">terminées</p>
        </Card>
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Cette semaine : {newTasksThisWeek} nouvelle{newTasksThisWeek > 1 ? "s" : ""} tâche
        {newTasksThisWeek > 1 ? "s" : ""} · {completedThisWeek} terminée
        {completedThisWeek > 1 ? "s" : ""} · {percentUpToDate}% des parcours à jour
      </p>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} className="text-accent-amber" />
            <h2 className="text-sm font-semibold text-ink">Votre attention est requise</h2>
          </div>
          <div className="flex gap-1 rounded-lg bg-surface-subtle p-1 text-xs font-medium">
            <Link
              href="/dashboard?view=employee"
              className={`rounded-md px-2.5 py-1 ${view === "employee" ? "bg-white text-ink shadow-sm" : "text-ink-faint"}`}
            >
              Par salarié
            </Link>
            <Link
              href="/dashboard?view=tasks"
              className={`rounded-md px-2.5 py-1 ${view === "tasks" ? "bg-white text-ink shadow-sm" : "text-ink-faint"}`}
            >
              Toutes les tâches
            </Link>
          </div>
        </div>

        {flagged.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <CircleCheck size={16} className="text-accent-teal" />
            Rien d&apos;urgent pour l&apos;instant, tout est sous contrôle.
          </div>
        ) : view === "employee" ? (
          <>
            <ul className="mt-4 flex flex-col divide-y divide-surface-border">
              {visibleEmployeeGroups.map((group) => (
                <li key={group.employeeId} className="flex items-center justify-between gap-4 py-3">
                  <Link
                    href={`/dashboard/employees/${group.employeeId}`}
                    className="flex-1 hover:text-brand-blue"
                  >
                    <p className="text-sm font-medium text-ink">{group.employeeName}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
                      {group.overdueCount > 0 && (
                        <span className="flex items-center gap-1 text-accent-rose">
                          <TriangleAlert size={12} /> {group.overdueCount} en retard
                        </span>
                      )}
                      {group.unassignedCount > 0 && (
                        <span className="flex items-center gap-1 text-brand-blue">
                          <UserRoundX size={12} /> {group.unassignedCount} à assigner
                        </span>
                      )}
                      {group.soonCount > 0 && (
                        <span className="flex items-center gap-1 text-accent-amber">
                          <Clock size={12} /> {group.soonCount} cette semaine
                        </span>
                      )}
                    </p>
                  </Link>
                  <Link
                    href={`/dashboard/employees/${group.employeeId}`}
                    className="shrink-0 text-xs font-medium text-brand-blue hover:underline"
                  >
                    Voir le parcours →
                  </Link>
                </li>
              ))}
            </ul>
            {hiddenEmployeeGroupsCount > 0 && (
              <p className="mt-3 text-xs text-ink-faint">
                + {hiddenEmployeeGroupsCount} autre{hiddenEmployeeGroupsCount > 1 ? "s" : ""}{" "}
                salarié{hiddenEmployeeGroupsCount > 1 ? "s" : ""} nécessitant votre attention,
                affinez via{" "}
                <Link href="/dashboard?view=tasks" className="text-brand-blue hover:underline">
                  Toutes les tâches
                </Link>
                .
              </p>
            )}
          </>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-surface-border">
            {attentionTasks.map(({ task, reason }) => (
              <li key={task.id} className="flex items-center justify-between gap-4 py-3">
                <Link
                  href={`/dashboard/events/${task.employeeEventId}`}
                  className="flex items-center gap-3"
                >
                  {reason === "overdue" && (
                    <TriangleAlert size={16} className="shrink-0 text-accent-rose" />
                  )}
                  {reason === "unassigned" && (
                    <UserRoundX size={16} className="shrink-0 text-brand-blue" />
                  )}
                  {reason === "soon" && <Clock size={16} className="shrink-0 text-accent-amber" />}
                  <div>
                    <p className="text-sm font-medium text-ink hover:text-brand-blue">
                      {task.label} ({task.employeeEvent.employee.firstName}{" "}
                      {task.employeeEvent.employee.lastName})
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {reason === "unassigned" ? "À assigner" : formatRelativeDueDate(task.dueDate)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/dashboard/employees">
          <Card className="transition-colors hover:border-brand-blue/40" compact>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Salariés</p>
            <p className="mt-1 text-xl font-semibold text-ink">{employeeCount}</p>
          </Card>
        </Link>
        <Link href="/dashboard/events">
          <Card className="transition-colors hover:border-brand-blue/40" compact>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Parcours RH actifs
            </p>
            <p className="mt-1 text-xl font-semibold text-ink">{eventCount}</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
