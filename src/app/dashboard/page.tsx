import Link from "next/link";
import {
  TriangleAlert,
  Clock,
  UserRoundX,
  CircleCheck,
  Sparkles,
  Rocket,
  CheckCircle2,
  Circle,
  History,
} from "lucide-react";
import { getCurrentMemberships } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRelativeDueDate, isOverdue } from "@/lib/urgency";
import { getAnomalies } from "@/lib/anomalies";
import { triggerEventQuick } from "./events/actions";
import { getUserDisplayName } from "@/lib/displayName";

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

// Libellés humains pour chaque action réellement journalisée dans le
// produit — jamais un exemple inventé, uniquement ce qui existe pour
// de vrai dans le journal d'audit.
const AUDIT_LABELS: Record<string, (metadata: unknown) => string> = {
  "organization.created": () => "Organisation créée",
  "organization.demo_generated": () => "Entreprise de démonstration générée",
  "employee.created": () => "Nouveau salarié ajouté",
  "employee.updated": () => "Fiche salarié modifiée",
  "employee.archived": () => "Salarié archivé",
  "employee.reactivated": () => "Salarié réactivé",
  "employees.imported": (m) => `Import CSV (${(m as { count?: number })?.count ?? "?"} salariés)`,
  "employees.bulk_archived": (m) => `Archivage groupé (${(m as { count?: number })?.count ?? "?"} salariés)`,
  "employee_event.created": () => "Parcours RH déclenché",
  "employeeEvent.archived": () => "Parcours archivé",
  "task.status_updated": () => "Statut d'une tâche mis à jour",
  "task.added_manually": () => "Étape ajoutée manuellement à un parcours",
  "task.edited_manually": () => "Étape d'un parcours modifiée",
  "task.deleted_manually": () => "Étape supprimée d'un parcours",
  "task.assigned_manually": () => "Tâche assignée manuellement",
  "invitation.created": () => "Invitation envoyée",
  "invitation.accepted": () => "Invitation acceptée",
  "invitation.accepted_via_code": () => "Invitation acceptée (via lien)",
  "membership.left_for_another_org": () => "A quitté cette organisation",
};

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

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
  const organization = memberships[0].organization;
  const view = searchParams.view === "tasks" ? "tasks" : "employee";

  const [
    employeeCount,
    eventCount,
    doneCount,
    openTasks,
    anomalies,
    newTasksThisWeek,
    completedThisWeek,
    membersInOrgCount,
    recentActivity,
  ] = await Promise.all([
    prisma.employee.count({ where: { organizationId, deletedAt: null } }),
    prisma.employeeEvent.count({ where: { organizationId, employee: { deletedAt: null }, deletedAt: null } }),
    prisma.task.count({
      where: {
        organizationId,
        status: "DONE",
        employeeEvent: { employee: { deletedAt: null } },
      },
    }),
    getOpenTasks(organizationId),
    getAnomalies(organizationId),
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
    prisma.membership.count({ where: { organizationId, deletedAt: null } }),
    prisma.auditLog.findMany({
      where: { organizationId },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const flagged = openTasks
    .map((task) => ({ task, reason: getReason(task) }))
    .filter((entry): entry is { task: OpenTask; reason: AttentionReason } => entry.reason !== null);

  const overdueCount = flagged.filter((e) => e.reason === "overdue").length;
  const soonCount = flagged.filter((e) => e.reason === "soon").length;

  const attentionTasks = [...flagged]
    .sort((a, b) => {
      if (a.reason !== b.reason) return REASON_PRIORITY[a.reason] - REASON_PRIORITY[b.reason];
      return a.task.dueDate.getTime() - b.task.dueDate.getTime();
    })
    .slice(0, 10);

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

  const overdueEmployeeEventIds = new Set(
    flagged.filter((f) => f.reason === "overdue").map((f) => f.task.employeeEventId)
  );
  const percentUpToDate =
    eventCount > 0 ? Math.round(((eventCount - overdueEmployeeEventIds.size) / eventCount) * 100) : 100;

  const isEmpty = employeeCount === 0;

  // Checklist de démarrage — entièrement dérivée de vraies données,
  // jamais de cases cochées artificiellement. Reste affichée tant que
  // tout n'est pas fait, disparaît une fois complète.
  const onboardingSteps = [
    { label: "Créer votre organisation", done: true },
    { label: "Définir votre convention collective", done: !!organization.conventionCollective },
    { label: "Ajouter votre premier salarié", done: employeeCount > 0 },
    { label: "Déclencher un premier parcours", done: eventCount > 0 },
    { label: "Inviter un collègue", done: membersInOrgCount > 1 },
  ];
  const allStepsDone = onboardingSteps.every((s) => s.done);

  // Un seul conseil à la fois, jamais plusieurs en même temps — le
  // premier point non réglé de cette liste, dans cet ordre précis.
  // "Ajouter un salarié" n'y figure pas : la grande carte d'accueil
  // s'en charge déjà quand l'organisation est vide, pas la peine de
  // le répéter.
  let tip: string | null = null;
  if (!organization.conventionCollective) {
    tip =
      "Pensez à renseigner votre convention collective. Cela permettra à RH Pilot de vous orienter vers les bonnes ressources lors des embauches et périodes d'essai.";
  } else if (membersInOrgCount === 1) {
    tip = "Invitez un collègue afin de pouvoir lui assigner automatiquement des tâches.";
  } else if (employeeCount > 0 && eventCount === 0) {
    tip = "Déclenchez votre premier parcours RH depuis la fiche d'un salarié pour voir RH Pilot en action.";
  }

  return (
    <div className="max-w-4xl">
      {isEmpty ? (
        <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/[0.04] to-brand-violet/[0.04]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Rocket size={20} className="text-brand-blue" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-ink">Votre espace RH Pilot est prêt.</h1>
              <p className="mt-1 text-sm text-ink-soft">
                Commencez par ajouter votre premier salarié, ou explorez le logiciel pour voir
                comment un événement RH devient un parcours complet.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/dashboard/employees/new">
                  <Button data-tour="add-employee">Ajouter un salarié</Button>
                </Link>
                <Link href="/dashboard/employees">
                  <Button variant="secondary">Découvrir RH Pilot</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <h1 data-tour="dashboard-attention" className="text-2xl font-semibold text-ink">
            Aujourd&apos;hui
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Ce qui mérite votre attention, avant le reste.</p>
        </>
      )}

      {!allStepsDone && (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-ink">Premiers pas</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {onboardingSteps.map((step) => (
              <li key={step.label} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <CheckCircle2 size={16} className="shrink-0 text-accent-teal" />
                ) : (
                  <Circle size={16} className="shrink-0 text-ink-faint" />
                )}
                <span className={step.done ? "text-ink-faint line-through" : "text-ink-soft"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tip && (
        <Card className="mt-4 flex items-start gap-2.5 border-brand-violet/20 bg-brand-violet/5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-violet" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-violet">
              RH Pilot vous conseille
            </p>
            <p className="mt-1 text-sm text-ink-soft">{tip}</p>
          </div>
        </Card>
      )}

      {!isEmpty && anomalies.length > 0 && (
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

      {isEmpty ? (
        <Card className="mt-6">
          <p className="text-sm text-ink-soft">
            Aucun événement RH en cours. Lorsque vous ajouterez un salarié ou déclencherez un
            parcours, RH Pilot centralisera automatiquement toutes les échéances ici.
          </p>
        </Card>
      ) : (
        <>
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
                <h2 className="text-sm font-semibold text-ink">Priorités du jour</h2>
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
                Tout est sous contrôle. Aucune action urgente aujourd&apos;hui.
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
        </>
      )}

      {recentActivity.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-ink-faint" />
            <h2 className="text-sm font-semibold text-ink">Activité récente</h2>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-surface-border">
            {recentActivity.map((entry) => {
              const label = AUDIT_LABELS[entry.action]?.(entry.metadata) ?? entry.action;
              return (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-ink-soft">{label}</span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {timeAgo(entry.createdAt)}
                    {entry.actor && <> · {getUserDisplayName(entry.actor)}</>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

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
