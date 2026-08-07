import Link from "next/link";
import {
  TriangleAlert,
  Clock,
  UserRoundX,
  CircleCheck,
  Circle,
  Sparkles,
  History,
  CalendarDays,
  Users,
  ClipboardCheck,
  ShieldCheck,
  Plus,
  Play,
} from "lucide-react";
import { getCurrentMemberships } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRelativeDueDate, isOverdue } from "@/lib/urgency";
import { getAnomalies } from "@/lib/anomalies";
import { triggerEventQuick } from "./events/actions";
import { dismissAnomaly } from "./anomalyActions";
import { getUserDisplayName } from "@/lib/displayName";
import { DidYouKnowCard } from "@/components/DidYouKnowCard";
import { AnomalyReasoning } from "@/components/AnomalyReasoning";
import { AskAboutOrganization } from "@/components/AskAboutOrganization";
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
type Anomaly = Awaited<ReturnType<typeof getAnomalies>>[number];
function AnomalyRow({ anomaly, severityDot }: { anomaly: Anomaly; severityDot: Record<string, string> }) {
  return (
    <li className="py-3 first:pt-0">
      <p className="flex items-start gap-2 text-sm text-ink">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot[anomaly.severity]}`} />
        {anomaly.message}
      </p>
      <div className="pl-3.5">
        <AnomalyReasoning reasoning={anomaly.reasoning} />
        {anomaly.consequence && (
          <p className="mt-1 text-xs italic text-ink-faint">{anomaly.consequence}</p>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 pl-3.5">
        {anomaly.action && (
          <form action={triggerEventQuick} className="flex-1">
            <input type="hidden" name="employeeId" value={anomaly.action.employeeId} />
            <input type="hidden" name="eventTemplateKey" value={anomaly.action.eventTemplateKey} />
            <input type="hidden" name="triggerDate" value={anomaly.action.triggerDate} />
            <Button type="submit" variant="secondary" className="w-full text-xs">
              {anomaly.action.label}
            </Button>
          </form>
        )}
        {anomaly.link && (
          <Link href={anomaly.link.href} className="flex-1">
            <Button variant="secondary" type="button" className="w-full text-xs">
              {anomaly.link.label}
            </Button>
          </Link>
        )}
        <form action={dismissAnomaly.bind(null, anomaly.key, "later")}>
          <button type="submit" className="whitespace-nowrap text-xs text-ink-faint hover:text-ink-soft">
            Plus tard
          </button>
        </form>
        <form action={dismissAnomaly.bind(null, anomaly.key, "ignore")}>
          <button type="submit" className="whitespace-nowrap text-xs text-ink-faint hover:text-accent-rose">
            Ignorer
          </button>
        </form>
      </div>
    </li>
  );
}
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const { user, memberships } = await getCurrentMemberships();
  if (memberships.length === 0) {
    return <CreateOrganizationForm />;
  }
  const organizationId = memberships[0].organizationId;
  const organization = memberships[0].organization;
  const view = searchParams.view === "tasks" ? "tasks" : "employee";
  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
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
      where: { organizationId, status: "DONE", employeeEvent: { employee: { deletedAt: null } } },
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
    { employeeId: string; employeeName: string; overdueCount: number; unassignedCount: number; soonCount: number; earliestDue: Date }
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
  const SUGGESTIONS_LIMIT = 3;
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
  const onboardingSteps = [
    { label: "Créer votre organisation", done: true },
    { label: "Définir votre convention collective", done: !!organization.conventionCollective },
    { label: "Ajouter votre premier salarié", done: employeeCount > 0 },
    { label: "Déclencher un premier parcours", done: eventCount > 0 },
    { label: "Inviter un collègue", done: membersInOrgCount > 1 },
  ];
  const doneStepsCount = onboardingSteps.filter((s) => s.done).length;
  const allStepsDone = doneStepsCount === onboardingSteps.length;
  let tip: { heading: string; description: string; ctaLabel: string; ctaHref: string } | null = null;
  if (!organization.conventionCollective) {
    tip = {
      heading: "Renseignez votre convention collective",
      description:
        "Cela permet à RH Pilot de vous orienter vers les bonnes sources officielles lors des embauches, périodes d'essai et visites médicales.",
      ctaLabel: "Configurer maintenant",
      ctaHref: "/dashboard/configuration/organisation",
    };
  } else if (membersInOrgCount === 1) {
    tip = {
      heading: "Invitez votre équipe",
      description: "Ajoutez un collègue afin de pouvoir lui assigner automatiquement des tâches.",
      ctaLabel: "Inviter un collègue",
      ctaHref: "/dashboard/team",
    };
  } else if (employeeCount > 0 && eventCount === 0) {
    tip = {
      heading: "Lancez votre premier parcours",
      description: "Déclenchez un parcours RH depuis la fiche d'un salarié pour voir RH Pilot en action.",
      ctaLabel: "Voir mes salariés",
      ctaHref: "/dashboard/employees",
    };
  }
  let synthesis: string;
  if (isEmpty) {
    synthesis =
      "Votre espace RH Pilot est prêt à vous accompagner. Commencez par ajouter votre premier salarié ou explorez les fonctionnalités.";
  } else if (overdueCount > 0) {
    synthesis = `${overdueCount} tâche${overdueCount > 1 ? "s" : ""} en retard nécessite${overdueCount > 1 ? "nt" : ""} votre attention.`;
  } else if (soonCount > 0) {
    synthesis = `${soonCount} échéance${soonCount > 1 ? "s" : ""} arrive${soonCount > 1 ? "nt" : ""} cette semaine.`;
  } else {
    synthesis = "Aucune échéance critique aujourd'hui. Tout est sous contrôle.";
  }
  const firstName = user!.firstName || user!.email.split("@")[0];
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 data-tour="dashboard-attention" className="text-2xl font-semibold text-ink">
            Bonjour {firstName} 👋
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">{synthesis}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          {employeeCount === 0 && (
            <Link href="/dashboard/employees/new">
              <Button data-tour="add-employee">
                <span className="inline-flex items-center gap-1.5">
                  <Plus size={16} /> Ajouter un salarié
                </span>
              </Button>
            </Link>
          )}
          {isEmpty && (
            <Link href="/dashboard/employees">
              <Button variant="secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Play size={14} /> Découvrir RH Pilot
                </span>
              </Button>
            </Link>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet">
              <Users size={20} />
            </span>
            <div>
              <p className="text-2xl font-semibold text-ink">{employeeCount}</p>
              <p className="text-xs text-ink-faint">Salariés</p>
            </div>
          </div>
          <Link
            href={isEmpty ? "/dashboard/employees/new" : "/dashboard/employees"}
            className="mt-3 inline-block text-xs font-medium text-brand-blue hover:underline"
          >
            {isEmpty ? "Ajouter un salarié →" : "Voir les salariés →"}
          </Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-teal/10 text-accent-teal">
              <ClipboardCheck size={20} />
            </span>
            <div>
              <p className="text-2xl font-semibold text-ink">{eventCount}</p>
              <p className="text-xs text-ink-faint">Parcours actifs</p>
            </div>
          </div>
          <Link href="/dashboard/events" className="mt-3 inline-block text-xs font-medium text-brand-blue hover:underline">
            Voir les parcours →
          </Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-amber/10 text-accent-amber">
              <CalendarDays size={20} />
            </span>
            <div>
              <p className="text-2xl font-semibold text-ink">{soonCount}</p>
              <p className="text-xs text-ink-faint">Échéances cette semaine</p>
            </div>
          </div>
          <Link href="/dashboard/calendar" className="mt-3 inline-block text-xs font-medium text-brand-blue hover:underline">
            Voir le calendrier →
          </Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                percentUpToDate === 100 ? "bg-accent-teal/10 text-accent-teal" : "bg-accent-amber/10 text-accent-amber"
              }`}
            >
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="text-2xl font-semibold text-ink">{percentUpToDate}%</p>
              <p className="text-xs text-ink-faint">Parcours à jour</p>
            </div>
          </div>
          <p className={`mt-3 text-xs font-medium ${percentUpToDate === 100 ? "text-ink-soft" : "text-accent-amber"}`}>
            {percentUpToDate === 100 ? "Très bien !" : "À surveiller"}
          </p>
        </Card>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`self-start lg:sticky lg:top-4 ${!isEmpty && anomalies.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <AskAboutOrganization aiEnabled={aiEnabled} />
        </div>
        {!isEmpty && anomalies.length > 0 && (
          <Card className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-blue" />
              <h2 className="text-sm font-semibold text-ink">
                RH Pilot a observé {anomalies.length} point{anomalies.length > 1 ? "s" : ""}{" "}
                nécessitant votre attention
              </h2>
            </div>
            <ul className="mt-2 flex flex-col divide-y divide-surface-border">
              {visibleAnomalies.map((anomaly) => (
                <AnomalyRow key={anomaly.key} anomaly={anomaly} severityDot={SEVERITY_DOT} />
              ))}
            </ul>
            {hiddenAnomaliesCount > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer py-2 text-xs font-medium text-brand-blue">
                  Voir les {hiddenAnomaliesCount} autre{hiddenAnomaliesCount > 1 ? "s" : ""} suggestion
                  {hiddenAnomaliesCount > 1 ? "s" : ""}
                </summary>
                <ul className="flex flex-col divide-y divide-surface-border border-t border-surface-border">
                  {hiddenAnomalies.map((anomaly) => (
                    <AnomalyRow key={anomaly.key} anomaly={anomaly} severityDot={SEVERITY_DOT} />
                  ))}
                </ul>
              </details>
            )}
          </Card>
        )}
      </div>
      {!isEmpty && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        </>
      )}
      {flagged.length === 0 ? (
        <Card className="mt-4">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-teal/10 text-accent-teal">
                <CircleCheck size={22} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink">Tout est sous contrôle</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {isEmpty ? "Aucun événement RH en cours." : "Aucune action urgente aujourd'hui."}
                </p>
                <p className="mt-2 max-w-sm text-sm text-ink-faint">
                  Lorsque vous ajouterez un salarié ou déclencherez un parcours, RH Pilot centralisera
                  automatiquement toutes les échéances ici.
                </p>
              </div>
            </div>
            <div className="relative hidden h-28 w-40 shrink-0 sm:block" aria-hidden>
              <div className="absolute inset-0 rounded-xl border border-surface-border bg-surface-subtle shadow-sm">
                <div className="flex gap-1 border-b border-surface-border px-2 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-rose/40" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-amber/40" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-teal/40" />
                </div>
                <div className="space-y-1.5 px-3 py-3">
                  <div className="h-1.5 w-3/4 rounded-full bg-brand-blue/15" />
                  <div className="h-1.5 w-1/2 rounded-full bg-surface-border" />
                  <div className="h-1.5 w-2/3 rounded-full bg-surface-border" />
                </div>
              </div>
              <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent-teal text-white shadow-md">
                <CircleCheck size={16} />
              </span>
            </div>
          </div>
        </Card>
      ) : (
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
          {view === "employee" ? (
            <>
              <ul className="mt-4 flex flex-col divide-y divide-surface-border">
                {visibleEmployeeGroups.map((group) => (
                  <li key={group.employeeId} className="flex items-center justify-between gap-4 py-3">
                    <Link href={`/dashboard/employees/${group.employeeId}`} className="flex-1 hover:text-brand-blue">
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
                    <Link href={`/dashboard/employees/${group.employeeId}`} className="shrink-0 text-xs font-medium text-brand-blue hover:underline">
                      Voir le parcours →
                    </Link>
                  </li>
                ))}
              </ul>
              {hiddenEmployeeGroupsCount > 0 && (
                <p className="mt-3 text-xs text-ink-faint">
                  + {hiddenEmployeeGroupsCount} autre{hiddenEmployeeGroupsCount > 1 ? "s" : ""}{" "}
                  salarié{hiddenEmployeeGroupsCount > 1 ? "s" : ""} nécessitant votre attention, affinez via{" "}
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
                  <Link href={`/dashboard/events/${task.employeeEventId}`} className="flex items-center gap-3">
                    {reason === "overdue" && <TriangleAlert size={16} className="shrink-0 text-accent-rose" />}
                    {reason === "unassigned" && <UserRoundX size={16} className="shrink-0 text-brand-blue" />}
                    {reason === "soon" && <Clock size={16} className="shrink-0 text-accent-amber" />}
                    <div>
                      <p className="text-sm font-medium text-ink hover:text-brand-blue">
                        {task.label} ({task.employeeEvent.employee.firstName} {task.employeeEvent.employee.lastName})
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
      )}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {!allStepsDone && (
          <Card>
            <h2 className="text-sm font-semibold text-ink">Premiers pas</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {onboardingSteps.map((step) => (
                <li key={step.label} className="flex items-center gap-2.5 text-sm">
                  {step.done ? (
                    <CircleCheck size={16} className="shrink-0 text-accent-teal" />
                  ) : (
                    <Circle size={16} className="shrink-0 text-ink-faint" />
                  )}
                  <span className={step.done ? "text-ink-faint line-through" : "text-ink"}>{step.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles size={15} className="text-brand-violet" /> RH Pilot vous conseille
          </p>
          {tip ? (
            <div className="mt-3 rounded-lg bg-brand-violet/5 p-3">
              <p className="text-sm font-medium text-ink">{tip.heading}</p>
              <p className="mt-1 text-sm text-ink-soft">{tip.description}</p>
              <Link href={tip.ctaHref} className="mt-3 inline-block">
                <Button variant="secondary" className="text-xs">
                  {tip.ctaLabel}
                </Button>
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Aucun conseil aujourd&apos;hui. Votre organisation est bien configurée.</p>
          )}
        </Card>
        {recentActivity.length > 0 && (
          <Card>
            <div className="flex items-center gap-2">
              <History size={15} className="text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Activité récente</h2>
            </div>
            <ul className="mt-3 flex flex-col">
              {recentActivity.map((entry, index) => {
                const label = AUDIT_LABELS[entry.action]?.(entry.metadata) ?? entry.action;
                const isLast = index === recentActivity.length - 1;
                return (
                  <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {!isLast && <span className="absolute left-[4px] top-3 h-full w-px bg-surface-border" />}
                    <span className="relative mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-brand-blue bg-white" />
                    <div className="flex-1">
                      <p className="text-xs text-ink-soft">{label}</p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {timeAgo(entry.createdAt)}
                        {entry.actor && <> · {getUserDisplayName(entry.actor)}</>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
      <DidYouKnowCard />
    </div>
  );
}
