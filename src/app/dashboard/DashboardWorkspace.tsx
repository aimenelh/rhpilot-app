"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CircleCheck, Check, CheckCheck, ChevronRight, Clock3, Plus, Route, UserRound, Users, X } from "lucide-react";
import { daysUntil, formatRelativeDueDate } from "@/lib/urgency";
import { upcomingEvents, taskMatchesFilter, type DashboardTask, type DashboardRequest, type DashboardActivity, type DashboardFilter } from "./dashboardModel";
import { CompleteDashboardTask } from "./CompleteDashboardTask";

const FILTERS: DashboardFilter[] = ["all", "mine", "overdue", "soon", "requests", "unassigned"];
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Date(date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...options });
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export type DashboardWorkspaceProps = {
  firstName: string; today: string; admin: boolean; employeeCount: number;
  tasks: DashboardTask[]; requests: DashboardRequest[]; activity: DashboardActivity[];
  overdueCount: number; soonCount: number; initialFilter?: string; onboarding?: ReactNode; copilot: ReactNode;
  preview?: boolean; teamNames?: string[]; organizationName?: string; nextArrival?: { name: string; date: string };
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

function ActivityDrawer({ activity, onClose }: { activity: DashboardActivity[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; const element = dialog.current; element?.showModal(); return () => { element?.close(); opener?.focus(); }; }, []);
  return <dialog ref={dialog} className="fil-drawer" aria-labelledby="fil-activity-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}><div className="fil-drawer-inner"><button autoFocus type="button" className="fil-drawer-close" aria-label="Fermer l’activité" onClick={onClose}><X size={20}/></button><p className="fil-eyebrow">Activité récente</p><h2 id="fil-activity-title">Le suivi avance</h2><ul className="fil-drawer-steps">{activity.map(entry => <li key={entry.id}><CheckCheck size={17}/><div><p>{entry.label}</p><small>{dateLabel(entry.date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{entry.actor ? ` · ${entry.actor}` : ""}</small></div></li>)}</ul>{!activity.length ? <p className="fil-drawer-intro">Les premières actions apparaîtront ici.</p> : null}</div></dialog>;
}

function RequestDrawer({ request, onClose }: { request: DashboardRequest; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; const opener = document.activeElement as HTMLElement | null; element?.showModal(); return () => { element?.close(); opener?.focus(); }; }, []);
  return <dialog ref={dialog} className="fil-drawer" aria-labelledby="fil-request-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}><div className="fil-drawer-inner"><button autoFocus className="fil-drawer-close" type="button" aria-label="Fermer la demande" onClick={onClose}><X size={20}/></button><p className="fil-eyebrow">Congés & absences · Démonstration</p><h2 id="fil-request-title">{request.employeeName}</h2><p className="fil-drawer-intro">Du {dateLabel(request.startDate, { day: "numeric", month: "long" })} au {dateLabel(request.endDate, { day: "numeric", month: "long" })}. Dans votre espace connecté, la demande s’ouvre dans Congés & absences pour examiner le dossier avant de décider.</p><button type="button" className="fil-primary" onClick={onClose}>Revenir au tableau de bord</button></div></dialog>;
}

function TaskRow({ task, today, onOpen, preview, onComplete }: { task: DashboardTask; today: Date; onOpen: () => void; preview?: boolean; onComplete: () => void }) {
  const days = daysUntil(new Date(task.dueDate), today);
  const deadline = days < 0 ? days === -1 ? "Hier" : `Il y a ${Math.abs(days)} jours` : days === 0 ? "Aujourd’hui" : days === 1 ? "Demain" : dateLabel(task.dueDate, { day: "numeric", month: "short" });
  return <li className="fil-task">
    {preview ? <button type="button" className="fil-task-check" onClick={onComplete} aria-label={`Marquer comme fait dans la démonstration : ${task.label}`}><Check size={13}/></button> : task.canComplete && !task.proofRequired ? <CompleteDashboardTask id={task.id} label={task.label}/> : <Link href={`/dashboard/events/${task.eventId}`} className="fil-task-open" aria-label={`Ouvrir : ${task.label}`}><Route size={17}/></Link>}
    <div className="fil-task-body"><button type="button" onClick={onOpen} className="fil-task-title">{task.label}</button><p className="fil-task-meta">{preview ? <span>{task.employeeName}</span> : <Link href={`/dashboard/employees/${task.employeeId}`}>{task.employeeName}</Link>}<span>·</span><span>{task.eventLabel}</span></p><p className="fil-assignee"><span className="fil-avatar">{task.assignedName ? initials(task.assignedName) : "?"}</span>{task.isMine ? "Vous" : task.assignedName?.split(" ")[0] || "Responsable à assigner"}{task.proofRequired ? <span>· Pièce attendue</span> : null}</p></div>
    <span className={`fil-deadline ${days < 0 ? "is-late" : "is-soon"}`}>{deadline}</span>
  </li>;
}

function RequestRow({ request, preview, onOpen }: { request: DashboardRequest; preview?: boolean; onOpen: () => void }) {
  const label = request.justification ? "Examiner un justificatif" : preview ? "Valider une demande de congés" : "Examiner une demande d’absence";
  return <li className="fil-task">{preview ? <button type="button" className="fil-task-check" onClick={onOpen} aria-label={`Examiner la demande de ${request.employeeName}`}><Check size={13}/></button> : <Link href="/dashboard/absences" className="fil-task-check" aria-label={`Examiner la demande de ${request.employeeName}`}><Check size={13}/></Link>}<div className="fil-task-body">{preview ? <button type="button" onClick={onOpen} className="fil-task-title">{label}</button> : <Link href="/dashboard/absences" className="fil-task-title">{label}</Link>}<p className="fil-task-meta"><span>{request.employeeName}</span><span>·</span><span>Du {dateLabel(request.startDate, { day: "numeric" })} au {dateLabel(request.endDate, { day: "numeric", month: "long" })}</span></p><p className="fil-assignee"><span className="fil-avatar">{preview ? "AE" : "RH"}</span>{preview ? "Vous" : "À examiner par un administrateur"}</p></div><span className="fil-deadline is-request">{preview ? "À valider" : "À examiner"}</span></li>;
}

export function DashboardWorkspace(props: DashboardWorkspaceProps) {
  const { firstName, admin, requests, employeeCount, activity, onboarding, copilot } = props;
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DashboardRequest | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const tasks = props.tasks.filter(task => !completedIds.includes(task.id));
  const today = new Date(props.today);
  const overdueCount = props.preview ? tasks.filter(task => daysUntil(new Date(task.dueDate), today) < 0).length : props.overdueCount;
  const soonCount = props.preview ? tasks.filter(task => { const days = daysUntil(new Date(task.dueDate), today); return days >= 0 && days <= 7; }).length : props.soonCount;
  const activeEventCount = new Set(tasks.map(task => task.eventId)).size;
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
  const summary = employeeCount === 0 ? admin ? "Ajoutez votre premier salarié pour commencer le suivi." : "Aucun salarié n’est rattaché à votre périmètre pour le moment." : overdueCount > 0 ? `${overdueCount} échéance${overdueCount > 1 ? "s" : ""} à traiter${props.nextArrival ? " et une arrivée à préparer" : " aujourd’hui"}.` : soonCount > 0 ? `${soonCount} échéance${soonCount > 1 ? "s" : ""} à suivre dans les sept prochains jours.` : "Aucune échéance urgente dans les parcours enregistrés.";
  return <div className="dashboard-fil">
    <section className="fil-greeting"><div><p className="fil-today">{dateLabel(props.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><h1 data-tour="dashboard-attention">Bonjour{firstName ? ` ${firstName}` : ""}<span>.</span></h1><p className="fil-summary"><strong>{summary.split(" et ")[0]}</strong>{summary.includes(" et ") ? ` et ${summary.split(" et ").slice(1).join(" et ")}` : ""}<br/>On garde le fil de votre équipe.</p></div><div className="fil-greeting-actions">{admin ? <><Link href="/dashboard/events" className="fil-primary" aria-label="Créer un parcours"><Plus size={16}/><span>Créer un parcours</span></Link></> : <Link href="/dashboard/employees" className="fil-primary"><Users size={16}/>Mes salariés</Link>}</div></section>
    <section className="fil-stats" aria-label="Priorités de votre organisation">
      <button type="button" className={`fil-stat ${filter === "overdue" ? "is-selected" : ""}`} onClick={() => changeFilter("overdue")} aria-pressed={filter === "overdue"}><span className="fil-stat-icon"><AlertTriangle size={21}/></span><span><span className="fil-stat-value">{overdueCount}</span><span className="fil-stat-label">action{overdueCount === 1 ? "" : "s"} en retard</span><small>À reprendre aujourd’hui</small></span><ChevronRight size={15} className="fil-stat-chevron"/></button>
      <button type="button" className={`fil-stat ${filter === "soon" ? "is-selected" : ""}`} onClick={() => changeFilter("soon")} aria-pressed={filter === "soon"}><span className="fil-stat-icon"><CalendarDays size={21}/></span><span><span className="fil-stat-value">{soonCount}</span><span className="fil-stat-label">échéance{soonCount === 1 ? "" : "s"} proche{soonCount === 1 ? "" : "s"}</span><small>Dans les 7 prochains jours</small></span><ChevronRight size={15} className="fil-stat-chevron"/></button>
      {admin ? <button type="button" className={`fil-stat ${filter === "requests" ? "is-selected" : ""}`} onClick={() => changeFilter("requests")} aria-pressed={filter === "requests"}><span className="fil-stat-icon"><CircleCheck size={21}/></span><span><span className="fil-stat-value">{requests.length}</span><span className="fil-stat-label">demande{requests.length === 1 ? "" : "s"} à valider</span><small>Votre équipe vous attend</small></span><ChevronRight size={15} className="fil-stat-chevron"/></button> : <button type="button" className={`fil-stat ${filter === "mine" ? "is-selected" : ""}`} onClick={() => changeFilter("mine")} aria-pressed={filter === "mine"}><span className="fil-stat-icon"><UserRound size={21}/></span><span><span className="fil-stat-value">{tasks.filter(task => task.isMine).length}</span><span className="fil-stat-label">actions qui me sont confiées</span><small>Dans mon périmètre</small></span><ChevronRight size={15} className="fil-stat-chevron"/></button>}
    </section>
    {employeeCount === 0 ? onboarding : null}
    <div className="fil-body-grid"><section className="fil-panel fil-journeys"><div className="fil-panel-head"><div><h2>Le fil de votre équipe</h2><p>Les prochaines étapes, au bon moment.</p></div><div className="fil-segment" aria-label="Période des prochaines étapes">{[7, 30].map(days => <button key={days} type="button" className={horizon === days ? "active" : ""} onClick={() => setHorizon(days)} aria-pressed={horizon === days}>{days === 7 ? "7 jours" : props.preview ? "Octobre" : "30 jours"}</button>)}</div></div>
      <div className="fil-timeline"><div className="fil-timeline-caption"><span>{dateLabel(props.today, { day: "numeric", month: "short" })} — {dateLabel(new Date(today.getTime() + (horizon - 1) * 86400000).toISOString(), { day: "numeric", month: "short" })}</span><span className="fil-live-pill">{events.length} événements à suivre</span></div>{events.length ? <><svg className="fil-thread" viewBox="0 0 600 45" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 18C70 18 70 30 140 30S215 9 280 9S390 25 450 25S530 2 615 6"/></svg><ol className="fil-event-columns">{events.slice(0, 3).map(task => <li key={task.eventId} className="fil-event-column"><p className="fil-event-date">{dateLabel(task.dueDate, { day: "2-digit" })}<span>{dateLabel(task.dueDate, { month: "short" })}</span></p><button type="button" className="fil-event-card" onClick={() => setSelectedId(task.id)} aria-label={`Ouvrir le parcours de ${task.employeeName}`}><span className="fil-event-kind">{task.eventLabel.toLowerCase().includes("visite") ? <CalendarDays size={13}/> : task.eventLabel.toLowerCase().includes("essai") ? <Clock3 size={13}/> : <Users size={13}/>}<span>{task.eventLabel.toLowerCase().includes("essai") ? "Fin d’essai" : task.eventLabel.toLowerCase().includes("embauche") ? "Arrivée" : task.eventLabel}</span></span><span className="fil-event-person"><span className="fil-avatar">{initials(task.employeeName)}</span><strong>{task.employeeName}</strong></span><p className="fil-event-action">{task.label}</p></button><span className="fil-thread-dot"/><p className="fil-event-owner"><Clock3 size={12}/>{task.previewStatus || `${tasks.filter(item => item.eventId === task.eventId).length} étape${tasks.filter(item => item.eventId === task.eventId).length === 1 ? "" : "s"} à suivre`}</p></li>)}</ol></> : <div className="fil-timeline-empty"><CalendarDays size={30}/><h3>Un peu d’espace pour la suite.</h3><p>Aucune étape ouverte sur cette période dans vos parcours enregistrés.</p><Link href={employeeCount === 0 && admin ? "/dashboard/employees/new" : "/dashboard/events"}>{employeeCount === 0 && admin ? "Ajouter un salarié" : "Voir les parcours"}</Link></div>}</div>
      <div className="fil-panel-foot"><span>{events.length > 3 ? `${events.length - 3} autre${events.length > 4 ? "s" : ""} parcours dans le calendrier.` : "Chaque étape a son responsable."}</span><Link href="/dashboard/calendar">Ouvrir le calendrier</Link></div></section>
    <section className="fil-panel fil-priorities"><div className="fil-panel-head"><div><h2>À traiter</h2><p>Un pas après l’autre.</p></div><span className="fil-counter">{tasks.length + requests.length} action{tasks.length + requests.length === 1 ? "" : "s"}</span></div>
      <div className="fil-task-filters" role="group" aria-label="Filtrer les priorités">{(["all", "mine", ...(admin ? ["requests"] : [])] as DashboardFilter[]).map(item => <button type="button" key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => changeFilter(item)}>{item === "all" ? "Priorités" : item === "mine" ? "Mes actions" : "Demandes"}</button>)}{unassigned > 0 ? <button type="button" className={filter === "unassigned" ? "active" : ""} aria-pressed={filter === "unassigned"} onClick={() => changeFilter("unassigned")}>À assigner <span>{unassigned}</span></button> : null}</div>
      <div className="sr-only" aria-live="polite">{filterLabel} · {rows.length} résultat{rows.length === 1 ? "" : "s"}</div><ul className="fil-tasks">{visible.map(row => row.kind === "task" ? <TaskRow key={row.task.id} task={row.task} today={today} preview={props.preview} onComplete={() => setCompletedIds(ids => [...ids, row.task.id])} onOpen={() => setSelectedId(row.task.id)}/> : <RequestRow key={`absence-${row.request.id}`} request={row.request} preview={props.preview} onOpen={() => setSelectedRequest(row.request)}/>)}{rows.length === 0 ? <li className="fil-tasks-empty"><CheckCheck size={22}/><p>{filter === "requests" ? "Aucune demande à examiner." : "Tout est à jour dans cette vue."}</p><small>État basé sur les données enregistrées.</small></li> : null}</ul>
      <div className="fil-panel-foot"><span>{expanded ? `${visible.length} points affichés` : `Les ${visible.length} premières priorités`}</span>{rows.length > 3 ? <button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? "Réduire la liste" : "Voir toutes les actions"}</button> : <Link href={filter === "requests" ? "/dashboard/absences" : "/dashboard/events"}>Ouvrir les dossiers</Link>}</div>{expanded && rows.length > 30 ? <p className="fil-list-limit">Les 30 premiers points sont affichés. Retrouvez la suite dans les parcours et les absences.</p> : null}</section></div>
    <div className="fil-copilot" id="copilote">{copilot}</div>
    <section className="fil-bottom-grid">{admin ? <div className="fil-activity"><div className="fil-section-header"><h2>Le suivi avance</h2><button type="button" onClick={() => setShowActivity(true)}>Voir l’activité</button></div>{activity.length ? <ul>{activity.slice(0, 1).map(entry => <li key={entry.id}><span className="fil-activity-icon"><Check size={15}/></span><div><p>{entry.label}</p><small>{dateLabel(entry.date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{entry.actor ? ` · ${entry.actor}` : ""}</small></div></li>)}</ul> : <p className="fil-bottom-empty">Les premières actions de votre organisation apparaîtront ici.</p>}</div> : null}<div className="fil-team"><div className="fil-section-header"><h2>Votre équipe, en un regard</h2><Link href="/dashboard/employees">Voir les salariés</Link></div><div className="fil-team-pulse"><div className="fil-team-avatars" aria-label="Aperçu des salariés">{(props.teamNames || []).slice(0, 3).map((name, index) => <span key={`${index}-${name}`} className="fil-avatar" title={name}>{initials(name)}</span>)}{employeeCount > (props.teamNames || []).slice(0, 3).length ? <span className="fil-avatar">+{employeeCount - (props.teamNames || []).slice(0, 3).length}</span> : null}</div><div><p>{employeeCount} salarié{employeeCount === 1 ? "" : "s"} · {activeEventCount} parcours en cours</p><small>{props.nextArrival ? `Une arrivée prévue le ${dateLabel(props.nextArrival.date, { day: "numeric", month: "long" })}.` : "Votre suivi RH, au même endroit."}</small></div></div></div></section>
    <p className="fil-bottom-note">RH Pilot · {props.organizationName} · Votre suivi RH, au même endroit.</p>
    {selectedRequest ? <RequestDrawer request={selectedRequest} onClose={() => setSelectedRequest(null)}/> : null}
    {showActivity ? <ActivityDrawer activity={activity} onClose={() => setShowActivity(false)}/> : null}
    {selected ? <EventDrawer key={selected.id} task={selected} tasks={tasks} today={today} preview={props.preview} onClose={() => setSelectedId(null)}/> : null}
  </div>;
}
