import Link from "next/link";
import {
  TriangleAlert,
  Clock,
  UserRoundX,
  CircleCheck,
  Circle,
  History,
  Users,
  ClipboardCheck,
  ShieldCheck,
  Plus,
  Route,
} from "lucide-react";
import { getCurrentMemberships } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Mascot, type MascotPose } from "@/components/Mascot";
import { formatRelativeDueDate, isOverdue } from "@/lib/urgency";
import { getUserDisplayName } from "@/lib/displayName";
import { DidYouKnowCard } from "@/components/DidYouKnowCard";
import { AskAboutOrganization } from "@/components/AskAboutOrganization";
import { isProbationHistoricalAtEntry } from "@/lib/probationTracking";
import { ACTIVE_TASK_SCOPE } from "@/lib/activeTaskScope";
import { employeeAccessWhere, eventAccessWhere, isOrganizationAdmin, taskAccessWhere, type MembershipAccess } from "@/lib/accessPolicy";

export const dynamic = "force-dynamic";

type AttentionReason = "overdue" | "unassigned" | "soon";
type OpenTask = Awaited<ReturnType<typeof getOpenTasks>>[number];

async function getOpenTasks(membership: MembershipAccess) {
  const organizationId = membership.organizationId;
  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      status: { notIn: ["DONE", "CANCELLED"] },
      AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(membership)],
    },
    include: {
      employeeEvent: { include: { employee: true, eventTemplate: true } },
    },
  });

  return tasks.filter(
    (task) =>
      !(
        task.employeeEvent.eventTemplate.key === "fin_periode_essai" &&
        isProbationHistoricalAtEntry(task.employeeEvent.employee)
      )
  );
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const { user, memberships } = await getCurrentMemberships();
  if (memberships.length === 0) return <CreateOrganizationForm />;

  const organizationId = memberships[0].organizationId;
  const currentMembership = memberships[0];
  const organization = currentMembership.organization;
  const view = searchParams.view === "tasks" ? "tasks" : "employee";
  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);

  const [employeeCount, eventCount, doneCount, openTasks, membersInOrgCount, recentActivity] =
    await Promise.all([
      prisma.employee.count({ where: { organizationId, deletedAt: null, ...employeeAccessWhere(currentMembership) } }),
      prisma.employeeEvent.count({
        where: { organizationId, employee: { deletedAt: null }, deletedAt: null, ...eventAccessWhere(currentMembership) },
      }),
      prisma.task.count({
        where: { organizationId, status: "DONE", AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(currentMembership)] },
      }),
      getOpenTasks(currentMembership),
      prisma.membership.count({ where: { organizationId, deletedAt: null } }),
      isOrganizationAdmin(currentMembership)
        ? prisma.auditLog.findMany({
            where: { organizationId },
            include: { actor: true },
            orderBy: { createdAt: "desc" },
            take: 6,
          })
        : Promise.resolve([]),
    ]);

  const flagged = openTasks
    .map((task) => ({ task, reason: getReason(task) }))
    .filter((entry): entry is { task: OpenTask; reason: AttentionReason } => entry.reason !== null);

  const overdueCount = flagged.filter((entry) => entry.reason === "overdue").length;
  const soonCount = flagged.filter((entry) => entry.reason === "soon").length;
  const unassignedCount = flagged.filter((entry) => entry.reason === "unassigned").length;

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
    const group = groupsByEmployee.get(employee.id) ?? {
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
    const severity = (group: typeof a) =>
      group.overdueCount > 0 ? 0 : group.unassignedCount > 0 ? 1 : 2;
    const severityDifference = severity(a) - severity(b);
    return severityDifference !== 0
      ? severityDifference
      : a.earliestDue.getTime() - b.earliestDue.getTime();
  });

  const visibleEmployeeGroups = employeeGroups.slice(0, 8);
  const hiddenEmployeeGroupsCount = employeeGroups.length - visibleEmployeeGroups.length;
  const overdueEventIds = new Set(
    flagged.filter((entry) => entry.reason === "overdue").map((entry) => entry.task.employeeEventId)
  );
  const percentUpToDate =
    eventCount > 0 ? Math.round(((eventCount - overdueEventIds.size) / eventCount) * 100) : null;

  const isEmpty = employeeCount === 0;
  const onboardingSteps = [
    { label: "Créer votre organisation", done: true },
    { label: "Définir votre convention collective", done: Boolean(organization.conventionCollective) },
    { label: "Ajouter votre premier salarié", done: employeeCount > 0 },
    { label: "Déclencher un premier parcours", done: eventCount > 0 },
    { label: "Inviter un collègue", done: membersInOrgCount > 1 },
  ];
  const allStepsDone = onboardingSteps.every((step) => step.done);

  let tip: { heading: string; description: string; ctaLabel: string; ctaHref: string } | null = null;
  if (!organization.conventionCollective) {
    tip = {
      heading: "Renseignez votre convention collective",
      description: "Elle permet de mieux contextualiser les parcours et les échéances RH.",
      ctaLabel: "Configurer",
      ctaHref: "/dashboard/configuration/organisation",
    };
  } else if (employeeCount > 0 && eventCount === 0) {
    tip = {
      heading: "Lancez votre premier parcours",
      description: "Déclenchez un parcours RH depuis la fiche d’un salarié pour commencer le suivi.",
      ctaLabel: "Voir les salariés",
      ctaHref: "/dashboard/employees",
    };
  } else if (membersInOrgCount === 1) {
    tip = {
      heading: "Invitez votre équipe",
      description: "Ajoutez un collègue pour répartir les responsabilités dans les parcours.",
      ctaLabel: "Inviter un collègue",
      ctaHref: "/dashboard/team",
    };
  }

  let synthesis: string;
  if (isEmpty) {
    synthesis = "Ajoutez votre premier salarié pour commencer à suivre les échéances RH.";
  } else if (overdueCount > 0) {
    synthesis = `${overdueCount} tâche${overdueCount > 1 ? "s" : ""} en retard nécessite${overdueCount > 1 ? "nt" : ""} votre attention.`;
  } else if (soonCount > 0 || unassignedCount > 0) {
    synthesis = `${soonCount + unassignedCount} point${soonCount + unassignedCount > 1 ? "s" : ""} à traiter dans les parcours enregistrés.`;
  } else if (eventCount === 0) {
    synthesis = "Aucun parcours actif : le suivi des échéances n’a pas encore commencé.";
  } else {
    synthesis = "Aucune échéance urgente détectée dans les parcours enregistrés aujourd’hui.";
  }

  let mascotPose: MascotPose = "dashboard";
  if (overdueCount > 0) mascotPose = "urgent";
  else if (soonCount > 0) mascotPose = "deadline";
  else if (!isEmpty) mascotPose = "calm";

  const firstName = user!.firstName || user!.email.split("@")[0];

  return (
    <div className="dashboard-overview">
      <div className="dashboard-heading flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 data-tour="dashboard-attention" className="text-2xl font-semibold text-ink">
            Bonjour {firstName} 👋
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">{synthesis}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href="/dashboard/employees/new">
              <Button data-tour="add-employee">
                <span className="inline-flex items-center gap-1.5">
                  <Plus size={16} /> Ajouter un salarié
                </span>
              </Button>
            </Link>
            <Link href="/dashboard/events">
              <Button variant="secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Route size={15} /> Lancer un parcours
                </span>
              </Button>
            </Link>
          </div>
        </div>
        <Mascot pose={mascotPose} className="hidden shrink-0 lg:block" />
      </div>

      <Card className={`dashboard-priorities mt-5 ${flagged.length === 0 ? "border-accent-teal/20" : "border-accent-amber/25"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {flagged.length === 0 ? (
              <CircleCheck size={18} className="text-accent-teal" />
            ) : (
              <TriangleAlert size={18} className="text-accent-amber" />
            )}
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {flagged.length === 0 ? "Aucune priorité urgente détectée" : "Priorités du jour"}
              </h2>
              {flagged.length === 0 && (
                <p className="mt-0.5 text-xs text-ink-faint">
                  État basé uniquement sur les parcours et échéances actuellement enregistrés dans RH Pilot.
                </p>
              )}
            </div>
          </div>

          {flagged.length > 0 && (
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
          )}
        </div>

        {flagged.length > 0 && view === "employee" && (
          <>
            <ul className="mt-3 flex flex-col divide-y divide-surface-border">
              {visibleEmployeeGroups.map((group) => (
                <li key={group.employeeId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/dashboard/employees/${group.employeeId}`} className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink hover:text-brand-primary">{group.employeeName}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
                      {group.overdueCount > 0 && <span className="text-accent-rose">{group.overdueCount} en retard</span>}
                      {group.unassignedCount > 0 && <span>{group.unassignedCount} à assigner</span>}
                      {group.soonCount > 0 && <span>{group.soonCount} cette semaine</span>}
                    </p>
                  </Link>
                  <Link href={`/dashboard/employees/${group.employeeId}`} className="text-xs font-medium text-brand-primary hover:underline">
                    Ouvrir →
                  </Link>
                </li>
              ))}
            </ul>
            {hiddenEmployeeGroupsCount > 0 && (
              <p className="mt-3 text-xs text-ink-faint">
                + {hiddenEmployeeGroupsCount} autre{hiddenEmployeeGroupsCount > 1 ? "s" : ""} salarié
                {hiddenEmployeeGroupsCount > 1 ? "s" : ""} à consulter.
              </p>
            )}
          </>
        )}

        {flagged.length > 0 && view === "tasks" && (
          <ul className="mt-3 flex flex-col divide-y divide-surface-border">
            {attentionTasks.map(({ task, reason }) => (
              <li key={task.id} className="py-3">
                <Link href={`/dashboard/events/${task.employeeEventId}`} className="flex items-start gap-3">
                  {reason === "overdue" && <TriangleAlert size={16} className="mt-0.5 shrink-0 text-accent-rose" />}
                  {reason === "unassigned" && <UserRoundX size={16} className="mt-0.5 shrink-0 text-brand-primary" />}
                  {reason === "soon" && <Clock size={16} className="mt-0.5 shrink-0 text-accent-amber" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink hover:text-brand-primary">
                      {task.label} · {task.employeeEvent.employee.firstName} {task.employeeEvent.employee.lastName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {reason === "unassigned" ? "Responsable à assigner" : formatRelativeDueDate(task.dueDate)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!isEmpty && (
        <Card className="dashboard-stats mt-5 !p-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-surface-border sm:grid-cols-4 sm:divide-y-0">
            <Link href="/dashboard/employees" className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-subtle sm:px-5">
              <Users size={18} className="shrink-0 text-brand-primary-dark" />
              <div>
                <p className="text-xl font-semibold text-ink">{employeeCount}</p>
                <p className="text-xs text-ink-faint">Salariés</p>
              </div>
            </Link>
            <Link href="/dashboard/events" className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-subtle sm:px-5">
              <ClipboardCheck size={18} className="shrink-0 text-accent-teal" />
              <div>
                <p className="text-xl font-semibold text-ink">{eventCount}</p>
                <p className="text-xs text-ink-faint">Parcours actifs</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <CircleCheck size={18} className="shrink-0 text-accent-teal" />
              <div>
                <p className="text-xl font-semibold text-ink">{doneCount}</p>
                <p className="text-xs text-ink-faint">Tâches terminées</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <ShieldCheck
                size={18}
                className={`shrink-0 ${percentUpToDate === 100 ? "text-accent-teal" : "text-accent-amber"}`}
              />
              <div>
                <p className="text-xl font-semibold text-ink">{percentUpToDate === null ? "—" : `${percentUpToDate}%`}</p>
                <p className="text-xs text-ink-faint">
                  {percentUpToDate === null ? "Suivi à démarrer" : "Parcours sans retard"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="dashboard-copilot mt-5">
        <AskAboutOrganization aiEnabled={aiEnabled} />
      </div>

      <div className="dashboard-tools mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
          <h2 className="text-sm font-semibold text-ink">À faire ensuite</h2>
          {tip ? (
            <div className="mt-3">
              <p className="text-sm font-medium text-ink">{tip.heading}</p>
              <p className="mt-1 text-sm text-ink-soft">{tip.description}</p>
              <Link href={tip.ctaHref} className="mt-3 inline-block">
                <Button variant="secondary" className="text-xs">{tip.ctaLabel}</Button>
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              Aucun paramètre prioritaire n’est signalé dans les données actuellement enregistrées.
            </p>
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
                const label = AUDIT_LABELS[entry.action]?.(entry.metadata) ?? "Dossier mis à jour";
                const isLast = index === recentActivity.length - 1;
                return (
                  <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {!isLast && <span className="absolute left-[4px] top-3 h-full w-px bg-surface-border" />}
                    <span className="relative mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-brand-primary bg-white" />
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
