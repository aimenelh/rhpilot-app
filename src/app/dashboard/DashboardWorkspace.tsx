"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCheck, Clock3, FileCheck2, Plus, Route, UserRound, Users, X } from "lucide-react";
import { daysUntil, formatRelativeDueDate } from "@/lib/urgency";
import { upcomingEvents, taskMatchesFilter, type DashboardTask, type DashboardRequest, type DashboardActivity, type DashboardFilter } from "./dashboardModel";
import { CompleteDashboardTask } from "./CompleteDashboardTask";

const FILTERS: DashboardFilter[] = ["all", "mine", "overdue", "soon", "requests", "unassigned"];
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Date(date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...options });
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export type DashboardWorkspaceProps = {
  firstName: string; today: string; admin: boolean; employeeCount: number; eventCount: number;
  tasks: DashboardTask[]; requests: DashboardRequest[]; activity: DashboardActivity[];
  overdueCount: number; soonCount: number; initialFilter?: string; onboarding?: ReactNode; copilot: ReactNode;
  preview?: boolean;
};

function EventDrawer({ task, tasks, today, onClose, preview }: { task: DashboardTask; tasks: DashboardTask[]; today: Date; onClose: () => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); opener?.focus(); };
  }, []);
  return <dialog ref={dialog} className="fil-drawer" aria-labelledby="fil-drawer-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="fil-drawer-inner"><button autoFocus type="button" className="fil-drawer-close" aria-label="Fermer le parcours" onClick={onClose}><X size={20}/></button>
      <p className="fil-eyebrow">{task.eventLabel}</p><h2 id="fil-drawer-title">{task.employeeName}</h2>
      <p className="fil-drawer-intro">Prochaine étape : {task.label}</p>
      <dl><div><dt>Échéance</dt><dd>{dateLabel(task.dueDate, { day: "numeric", month: "long", year: "numeric" })}</dd></div><div><dt>Responsable</dt><dd>{task.assignedName || "À assigner"}</dd></div></dl>
      <h3>Étapes ouvertes</h3><ul className="fil-drawer-steps">{tasks.filter(item => item.eventId === task.eventId).slice(0, 8).map(item => <li key={item.id}><Clock3 size={17}/><div><p>{item.label}</p><small>{formatRelativeDueDate(new Date(item.dueDate), today)}</small></div></li>)}</ul>
      {preview ? <><p className="fil-drawer-intro">Données fictives. Dans votre espace connecté, ce panneau ouvre le parcours et la fiche du salarié.</p><button type="button" className="fil-primary" onClick={onClose}>Revenir au tableau de bord</button></> : <><Link href={`/dashboard/events/${task.eventId}`} className="fil-primary">Ouvrir le parcours complet</Link><Link href={`/dashboard/employees/${task.employeeId}`} className="fil-drawer-link">Voir la fiche salarié</Link></>}
    </div>
  </dialog>;
}

function TaskRow({ task, today, onOpen, preview }: { task: DashboardTask; today: Date; onOpen: () => void; preview?: boolean }) {
  const days = daysUntil(new Date(task.dueDate), today);
  const deadline = days < 0 ? `${Math.abs(days)} j de retard` : days === 0 ? "Aujourd’hui" : days === 1 ? "Demain" : dateLabel(task.dueDate, { day: "numeric", month: "short" });
  return <li className="fil-task">
    {preview ? <button type="button" className="fil-task-open" onClick={onOpen} aria-label={`Ouvrir : ${task.label}`}><Route size={17}/></button> : task.canComplete && !task.proofRequired ? <CompleteDashboardTask id={task.id} label={task.label}/> : <Link href={`/dashboard/events/${task.eventId}`} className="fil-task-open" aria-label={`Ouvrir : ${task.label}`}><Route size={17}/></Link>}
    <div className="fil-task-body"><button type="button" onClick={onOpen} className="fil-task-title">{task.label}</button><p className="fil-task-meta">{preview ? <span>{task.employeeName}</span> : <Link href={`/dashboard/employees/${task.employeeId}`}>{task.employeeName}</Link>}<span>·</span><span>{task.eventLabel}</span></p><p className="fil-assignee"><span className="fil-avatar">{task.assignedName ? initials(task.assignedName) : "?"}</span>{task.isMine ? "Vous" : task.assignedName || "Responsable à assigner"}{task.proofRequired ? <span>· Pièce attendue</span> : null}</p></div>
    <span className={`fil-deadline ${days < 0 ? "is-late" : "is-soon"}`}>{deadline}</span>
  </li>;
}

function RequestRow({ request }: { request: DashboardRequest }) {
  return <li className="fil-task"><Link href="/dashboard/absences" className="fil-task-open" aria-label={`Examiner la demande de ${request.employeeName}`}><FileCheck2 size={17}/></Link><div className="fil-task-body"><Link href="/dashboard/absences" className="fil-task-title">{request.justification ? "Examiner un justificatif" : "Examiner une demande d’absence"}</Link><p className="fil-task-meta"><span>{request.employeeName}</span></p><p className="fil-assignee">Du {dateLabel(request.startDate, { day: "numeric", month: "short" })} au {dateLabel(request.endDate, { day: "numeric", month: "short" })}</p></div><span className="fil-deadline is-request">À examiner</span></li>;
}

export function DashboardWorkspace(props: DashboardWorkspaceProps) {
  const { firstName, admin, tasks, requests, overdueCount, soonCount, employeeCount, eventCount, activity, onboarding, copilot } = props;
  const today = new Date(props.today);
  const [filter, setFilter] = useState<DashboardFilter>(FILTERS.includes(props.initialFilter as DashboardFilter) ? props.initialFilter as DashboardFilter : "all");
  const [expanded, setExpanded] = useState(false);
  const [horizon, setHorizon] = useState(7);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const events = upcomingEvents(tasks, horizon, today);
  const selected = tasks.find(task => task.id === selectedId);
  const filteredTasks = tasks.filter(task => taskMatchesFilter(task, filter, today));
  const filteredRequests = filter === "all" || filter === "requests" ? requests : [];
  const rows = [
    ...filteredTasks.map(task => ({ kind: "task" as const, task, order: daysUntil(new Date(task.dueDate), today) < 0 ? 0 : task.assignedName === null ? 1 : 3 })),
    ...filteredRequests.map(request => ({ kind: "request" as const, request, order: 2 })),
  ].sort((a, b) => a.order - b.order);
  const visible = rows.slice(0, expanded ? 30 : 3);
  const unassigned = tasks.filter(task => task.assignedName === null).length;
  const changeFilter = (next: DashboardFilter) => { setFilter(next); setExpanded(false); };
  const filterLabel = ({ all: "Priorités", mine: "Mes actions", overdue: "Actions en retard", soon: "Échéances proches", requests: "Demandes", unassigned: "À assigner" } as const)[filter];
  const summary = employeeCount === 0 ? admin ? "Ajoutez votre premier salarié pour commencer le suivi." : "Aucun salarié n’est rattaché à votre périmètre pour le moment." : overdueCount > 0 ? `${overdueCount} action${overdueCount > 1 ? "s" : ""} en retard à reprendre aujourd’hui.` : soonCount > 0 ? `${soonCount} échéance${soonCount > 1 ? "s" : ""} à suivre dans les sept prochains jours.` : "Aucune échéance urgente dans les parcours enregistrés.";
  return <div className="dashboard-fil">
    <section className="fil-greeting"><div><p className="fil-today">{dateLabel(props.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><h1 data-tour="dashboard-attention">Bonjour{firstName ? ` ${firstName}` : ""}<span>.</span></h1><p className="fil-summary">{summary}<br/>On garde le fil de votre équipe.</p></div><div className="fil-greeting-actions">{admin ? <><Link href="/dashboard/events" className="fil-primary"><Plus size={16}/><span>Créer un parcours</span></Link><Link data-tour="add-employee" href="/dashboard/employees/new" className="fil-secondary-action">Ajouter un salarié</Link></> : <Link href="/dashboard/employees" className="fil-primary"><Users size={16}/>Mes salariés</Link>}</div></section>
    <section className="fil-stats" aria-label="Priorités de votre organisation">
      <button type="button" className={`fil-stat ${filter === "overdue" ? "is-selected" : ""}`} onClick={() => changeFilter("overdue")} aria-pressed={filter === "overdue"}><span className="fil-stat-icon"><AlertTriangle size={21}/></span><span><span className="fil-stat-value">{overdueCount}</span><span className="fil-stat-label">action{overdueCount === 1 ? "" : "s"} en retard</span><small>À reprendre aujourd’hui</small></span></button>
      <button type="button" className={`fil-stat ${filter === "soon" ? "is-selected" : ""}`} onClick={() => changeFilter("soon")} aria-pressed={filter === "soon"}><span className="fil-stat-icon"><CalendarDays size={21}/></span><span><span className="fil-stat-value">{soonCount}</span><span className="fil-stat-label">échéance{soonCount === 1 ? "" : "s"} proche{soonCount === 1 ? "" : "s"}</span><small>Dans les 7 prochains jours</small></span></button>
      {admin ? <button type="button" className={`fil-stat ${filter === "requests" ? "is-selected" : ""}`} onClick={() => changeFilter("requests")} aria-pressed={filter === "requests"}><span className="fil-stat-icon"><FileCheck2 size={21}/></span><span><span className="fil-stat-value">{requests.length}</span><span className="fil-stat-label">demande{requests.length === 1 ? "" : "s"} à examiner</span><small>Congés, absences et justificatifs</small></span></button> : <button type="button" className={`fil-stat ${filter === "mine" ? "is-selected" : ""}`} onClick={() => changeFilter("mine")} aria-pressed={filter === "mine"}><span className="fil-stat-icon"><UserRound size={21}/></span><span><span className="fil-stat-value">{tasks.filter(task => task.isMine).length}</span><span className="fil-stat-label">actions qui me sont confiées</span><small>Dans mon périmètre</small></span></button>}
    </section>
    {onboarding}
    <div className="fil-body-grid"><section className="fil-panel fil-journeys"><div className="fil-panel-head"><div><h2>Le fil de votre équipe</h2><p>Les prochaines étapes, au bon moment.</p></div><div className="fil-segment" aria-label="Période des prochaines étapes">{[7, 30].map(days => <button key={days} type="button" className={horizon === days ? "active" : ""} onClick={() => setHorizon(days)} aria-pressed={horizon === days}>{days} jours</button>)}</div></div>
      <div className="fil-timeline"><div className="fil-timeline-caption"><span>Les {horizon} prochains jours</span><span>{events.length} parcours à suivre</span></div>{events.length ? <><svg className="fil-thread" viewBox="0 0 600 45" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 18C70 18 70 30 140 30S215 9 280 9S390 25 450 25S530 2 615 6"/></svg><ol className="fil-event-columns">{events.slice(0, 3).map(task => <li key={task.eventId} className="fil-event-column"><p className="fil-event-date">{dateLabel(task.dueDate, { day: "2-digit" })}<span>{dateLabel(task.dueDate, { month: "short" })}</span></p><button type="button" className="fil-event-card" onClick={() => setSelectedId(task.id)} aria-label={`Ouvrir le parcours de ${task.employeeName}`}><span className="fil-event-kind"><Route size={13}/>{task.eventLabel}</span><span className="fil-event-person"><span className="fil-avatar">{initials(task.employeeName)}</span><strong>{task.employeeName}</strong></span><span className="fil-event-action">{task.label}</span></button><span className="fil-thread-dot"/><p className="fil-event-owner"><Clock3 size={12}/>{task.isMine ? "Votre prochaine étape" : task.assignedName || "À assigner"}</p></li>)}</ol></> : <div className="fil-timeline-empty"><CalendarDays size={30}/><h3>Un peu d’espace pour la suite.</h3><p>Aucune étape ouverte sur cette période dans vos parcours enregistrés.</p><Link href={employeeCount === 0 && admin ? "/dashboard/employees/new" : "/dashboard/events"}>{employeeCount === 0 && admin ? "Ajouter un salarié" : "Voir les parcours"}</Link></div>}</div>
      <div className="fil-panel-foot"><span>{events.length > 3 ? `${events.length - 3} autre${events.length > 4 ? "s" : ""} parcours dans le calendrier.` : "Chaque étape a son responsable."}</span><Link href="/dashboard/calendar">Ouvrir le calendrier</Link></div></section>
    <section className="fil-panel fil-priorities"><div className="fil-panel-head"><div><h2>À traiter</h2><p>Un pas après l’autre.</p></div><span className="fil-counter">{tasks.length + requests.length} point{tasks.length + requests.length === 1 ? "" : "s"}</span></div>
      <div className="fil-task-filters" role="group" aria-label="Filtrer les priorités">{(["all", "mine", ...(admin ? ["requests"] : [])] as DashboardFilter[]).map(item => <button type="button" key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => changeFilter(item)}>{item === "all" ? "Priorités" : item === "mine" ? "Mes actions" : "Demandes"}</button>)}{unassigned > 0 ? <button type="button" className={filter === "unassigned" ? "active" : ""} aria-pressed={filter === "unassigned"} onClick={() => changeFilter("unassigned")}>À assigner <span>{unassigned}</span></button> : null}</div>
      <div className="fil-filter-caption" aria-live="polite">{filterLabel} · {rows.length} résultat{rows.length === 1 ? "" : "s"}</div><ul className="fil-tasks">{visible.map(row => row.kind === "task" ? <TaskRow key={row.task.id} task={row.task} today={today} preview={props.preview} onOpen={() => setSelectedId(row.task.id)}/> : <RequestRow key={`absence-${row.request.id}`} request={row.request}/>)}{rows.length === 0 ? <li className="fil-tasks-empty"><CheckCheck size={22}/><p>{filter === "requests" ? "Aucune demande à examiner." : "Tout est à jour dans cette vue."}</p><small>État basé sur les données enregistrées.</small></li> : null}</ul>
      <div className="fil-panel-foot"><span>{visible.length} point{visible.length === 1 ? "" : "s"} affiché{visible.length === 1 ? "" : "s"}</span>{rows.length > 3 ? <button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? "Réduire la liste" : "Voir toutes les actions"}</button> : <Link href={filter === "requests" ? "/dashboard/absences" : "/dashboard/events"}>Ouvrir les dossiers</Link>}</div>{expanded && rows.length > 30 ? <p className="fil-list-limit">Les 30 premiers points sont affichés. Retrouvez la suite dans les parcours et les absences.</p> : null}</section></div>
    <div className="fil-copilot">{copilot}</div>
    <section className="fil-bottom-grid">{admin ? <div className="fil-activity"><h2>Le suivi avance</h2>{activity.length ? <ul>{activity.map(entry => <li key={entry.id}><span className="fil-activity-icon"><CheckCheck size={15}/></span><div><p>{entry.label}</p><small>{dateLabel(entry.date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{entry.actor ? ` · ${entry.actor}` : ""}</small></div></li>)}</ul> : <p className="fil-bottom-empty">Les premières actions de votre organisation apparaîtront ici.</p>}</div> : null}<div className="fil-team"><div><h2>Votre équipe, en un regard</h2><Link href="/dashboard/employees">Voir les salariés</Link></div><p><Users size={20}/><span>{employeeCount} salarié{employeeCount === 1 ? "" : "s"} suivi{employeeCount === 1 ? "" : "s"}<small>{eventCount} parcours enregistré{eventCount === 1 ? "" : "s"} · {tasks.length} étape{tasks.length === 1 ? "" : "s"} ouverte{tasks.length === 1 ? "" : "s"}</small></span></p></div></section>
    {selected ? <EventDrawer key={selected.id} task={selected} tasks={tasks} today={today} preview={props.preview} onClose={() => setSelectedId(null)}/> : null}
  </div>;
}
