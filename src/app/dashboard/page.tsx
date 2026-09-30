import Link from "next/link";
import { Circle, CircleCheck, Plus } from "lucide-react";
import { getCurrentMemberships } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDisplayName } from "@/lib/displayName";
import { isProbationHistoricalAtEntry } from "@/lib/probationTracking";
import { ACTIVE_TASK_SCOPE } from "@/lib/activeTaskScope";
import { canUpdateTask, employeeAccessWhere, eventAccessWhere, isOrganizationAdmin, taskAccessWhere } from "@/lib/accessPolicy";
import { daysUntil } from "@/lib/urgency";
import { isAiEnabled } from "@/lib/ai";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { generateDemoOrganization } from "./employees/demoActions";
import { DemoOrgSubmitButton } from "./employees/DemoOrgSubmitButton";
import { DashboardWorkspace } from "./DashboardWorkspace";
import { AskAboutOrganization } from "@/components/AskAboutOrganization";
import { taskPriority, type DashboardTask } from "./dashboardModel";
import "./dashboard-fil.css";

export const metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

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


export default async function DashboardPage({ searchParams }: { searchParams: { filter?: string; view?: string } }) {
  const { user, memberships } = await getCurrentMemberships();
  if (!user) return null; // Le layout affiche l'initialisation de la session.
  if (memberships.length === 0) return <CreateOrganizationForm />;
  const membership = memberships[0];
  const organizationId = membership.organizationId;
  const admin = isOrganizationAdmin(membership);
  const today = new Date();
  const [employeeCount, eventCount, openTasks, pendingRequests, recentActivity, memberCount] = await Promise.all([
    prisma.employee.count({ where: { organizationId, deletedAt: null, ...employeeAccessWhere(membership) } }),
    prisma.employeeEvent.count({ where: { organizationId, deletedAt: null, employee: { deletedAt: null }, ...eventAccessWhere(membership) } }),
    prisma.task.findMany({
      where: { organizationId, status: { notIn: ["DONE", "CANCELLED"] }, AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(membership)] },
      select: {
        id: true, label: true, dueDate: true, assignedMembershipId: true, proofRequired: true,
        assignedMembership: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
        employeeEvent: { select: { id: true, eventTemplate: { select: { key: true, label: true } }, employee: { select: { id: true, firstName: true, lastName: true, managerMembershipId: true, hireDate: true, createdAt: true, probationDuration: true, probationDurationUnit: true } } } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    }),
    admin ? prisma.absence.findMany({
      where: { organizationId, status: { in: ["TO_VALIDATE", "TO_REVIEW_JUSTIFICATION"] }, employee: { deletedAt: null } },
      select: { id: true, startDate: true, endDate: true, status: true, employee: { select: { firstName: true, lastName: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }) : Promise.resolve([]),
    admin ? prisma.auditLog.findMany({ where: { organizationId }, select: { id: true, action: true, metadata: true, createdAt: true, actor: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 3 }) : Promise.resolve([]),
    admin ? prisma.membership.count({ where: { organizationId, deletedAt: null } }) : Promise.resolve(0),
  ]);
  const tasks: DashboardTask[] = openTasks
    .filter(task => !(task.employeeEvent.eventTemplate.key === "fin_periode_essai" && isProbationHistoricalAtEntry(task.employeeEvent.employee)))
    .map(task => ({
      id: task.id, label: task.label, dueDate: task.dueDate.toISOString(), eventId: task.employeeEvent.id,
      eventLabel: task.employeeEvent.eventTemplate.label, employeeId: task.employeeEvent.employee.id,
      employeeName: `${task.employeeEvent.employee.firstName} ${task.employeeEvent.employee.lastName}`,
      assignedName: task.assignedMembership ? getUserDisplayName(task.assignedMembership.user) : null,
      isMine: task.assignedMembershipId === membership.id, canComplete: canUpdateTask(membership, task), proofRequired: task.proofRequired,
    }))
    .sort((a,b) => taskPriority(a,today)-taskPriority(b,today) || a.dueDate.localeCompare(b.dueDate));
  const overdueCount = tasks.filter(task => daysUntil(new Date(task.dueDate),today)<0).length;
  const soonCount = tasks.filter(task => { const days=daysUntil(new Date(task.dueDate),today); return days>=0&&days<=7; }).length;
  const requests = pendingRequests.map(request => ({ id: request.id, employeeName: `${request.employee.firstName} ${request.employee.lastName}`, startDate: request.startDate.toISOString(), endDate: request.endDate.toISOString(), justification: request.status === "TO_REVIEW_JUSTIFICATION" }));
  const steps = admin ? [
    { href: "/dashboard/configuration/organisation", label: "Créer votre organisation", done: true },
    { href: "/dashboard/configuration/organisation", label: "Définir votre convention collective", done: Boolean(membership.organization.conventionCollective) },
    { href: "/dashboard/employees/new", label: "Ajouter votre premier salarié", done: employeeCount>0 },
    { href: "/dashboard/events", label: "Déclencher un premier parcours", done: eventCount>0 },
    { href: "/dashboard/team", label: "Inviter un collègue", done: memberCount>1 },
  ] : [];
  const onboarding = steps.some(step=>!step.done) ? <section className="fil-onboarding"><div><h2>Les premiers fils à poser</h2><p>Préparez votre espace pour suivre les prochaines échéances.</p></div><ul>{steps.map(step=><li key={step.label}>{step.done?<CircleCheck size={17}/>:<Circle size={17}/>}<Link href={step.href} className={step.done?"is-done":""}>{step.label}</Link></li>)}</ul>{employeeCount===0?<div className="fil-onboarding-actions"><Link className="fil-primary" href="/dashboard/employees/new"><Plus size={16}/>Ajouter mon premier salarié</Link><form action={generateDemoOrganization}><DemoOrgSubmitButton/></form></div>:null}</section> : null;
  return <DashboardWorkspace
    firstName={user.firstName || ""} today={today.toISOString()} admin={admin} employeeCount={employeeCount} eventCount={eventCount}
    tasks={tasks} requests={requests} overdueCount={overdueCount} soonCount={soonCount} initialFilter={searchParams.filter || (searchParams.view==="tasks"?"all":undefined)}
    activity={recentActivity.map(entry=>({ id:entry.id,label:AUDIT_LABELS[entry.action]?.(entry.metadata) || "Dossier mis à jour",actor:entry.actor?getUserDisplayName(entry.actor):null,date:entry.createdAt.toISOString() }))}
    onboarding={onboarding} copilot={<AskAboutOrganization aiEnabled={isAiEnabled()} compact/>}
  />;
}
