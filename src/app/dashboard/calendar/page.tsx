import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TriangleAlert,
  User,
  X,
  CheckCircle2,
  Clock3,
  UsersRound,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import { taskAccessWhere } from "@/lib/accessPolicy";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/urgency";
import {
  getParisDateParts,
  parisCalendarDayNumber,
  parisDayWindow,
  parisMidnightUtc,
} from "@/lib/parisDate";
import { getUserDisplayName } from "@/lib/displayName";
import {
  getMonthGrid,
  dateKey,
  parseMonthParam,
  monthParam,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { Card } from "@/components/ui/Card";
import { MonthSummaryButton } from "./MonthSummaryButton";
export const dynamic = "force-dynamic";
// Uniquement pour les puces de filtre par catégorie (leur rôle est
// justement de distinguer les catégories) -- jamais utilisé ailleurs.
// Sur les tâches elles-mêmes (liste, grille du mois), la couleur
// signale l'urgence, pas le type d'événement : le corail/l'ambre/le
// teal partout donnait l'impression d'un calendrier générique
// multicolore plutôt qu'un calendrier d'échéances RH.
const CATEGORY_FILTER_DOT: Record<string, string> = {
  "Embauche": "bg-brand-primary-dark",
  "Visite médicale": "bg-accent-teal",
  "Fin de période d'essai": "bg-accent-amber",
};
const DEFAULT_CATEGORY_FILTER_DOT = "bg-brand-primary";
function categoryFilterDot(label: string | undefined) {
  return (label && CATEGORY_FILTER_DOT[label]) || DEFAULT_CATEGORY_FILTER_DOT;
}
// Urgence d'une tâche -- c'est cette valeur, pas sa catégorie, qui
// détermine sa couleur partout où une tâche individuelle est affichée.
function taskUrgencyDot(task: { dueDate: Date; status: string }): string {
  if (isOverdue(task.dueDate, task.status as never)) return "bg-accent-rose";
  if (parisCalendarDayNumber(task.dueDate) === parisCalendarDayNumber(new Date())) {
    return "bg-brand-primary";
  }
  return "bg-ink-faint";
}
function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatDayHeading(date: Date) {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
function taskStatusMeta(task: { dueDate: Date; status: string }) {
  if (isOverdue(task.dueDate, task.status as never)) {
    return { label: "En retard", className: "bg-accent-rose/10 text-accent-rose" };
  }
  switch (task.status) {
    case "DONE":
      return { label: "Terminée", className: "bg-accent-teal/10 text-accent-teal" };
    case "IN_PROGRESS":
      return { label: "En cours", className: "bg-brand-primary/10 text-brand-primary" };
    case "WAITING_EXTERNAL":
      return { label: "En attente", className: "bg-accent-amber/10 text-ink-soft" };
    case "TO_PREPARE":
      return { label: "À préparer", className: "bg-surface-subtle text-ink-soft" };
    default:
      return { label: "À faire", className: "bg-surface-subtle text-ink-soft" };
  }
}
type TaskForDisplay = {
  id: string;
  employeeEventId: string;
  label: string;
  status: string;
  dueDate: Date;
  assignedMembership: { user: { firstName: string | null; lastName: string | null; email: string } } | null;
  employeeEvent: {
    employee: { firstName: string; lastName: string };
    eventTemplate: { label: string } | null;
  };
};
function TaskRow({ task }: { task: TaskForDisplay }) {
  const isDone = task.status === "DONE";
  return (
    <Link
      href={`/dashboard/events/${task.employeeEventId}#task-${task.id}`}
      className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-subtle"
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${taskUrgencyDot(task)}`} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isDone ? "text-ink-faint line-through" : "text-ink"}`}>
          {task.label}
        </p>
        <p className="truncate text-xs text-ink-faint">
          {task.employeeEvent.employee.firstName} {task.employeeEvent.employee.lastName}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-faint">
          <User size={10} className="shrink-0" />
          {task.assignedMembership ? getUserDisplayName(task.assignedMembership.user) : "Non assigné"}
        </p>
        {task.employeeEvent.eventTemplate?.label && (
          <span className="mt-1 inline-block rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            {task.employeeEvent.eventTemplate.label}
          </span>
        )}
      </div>
    </Link>
  );
}
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; view?: string; day?: string; category?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  const view = searchParams.view === "all" ? "all" : "mine";
  const { year, month } = parseMonthParam(searchParams.month);
  const viewFilter = view === "mine" ? { assignedMembershipId: membership.id } : taskAccessWhere(membership);
  const now = new Date();
  const todayWindow = parisDayWindow(now);
  const todayStart = todayWindow.start;
  const todayEnd = todayWindow.end;
  const todayParts = getParisDateParts(now);
  const todayKey = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;
  const weekEndCalendar = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day + 7));
  const weekEnd = parisMidnightUtc(
    weekEndCalendar.getUTCFullYear(),
    weekEndCalendar.getUTCMonth() + 1,
    weekEndCalendar.getUTCDate()
  );
  const selectedDay = searchParams.day ? parseDayKey(searchParams.day) : parseDayKey(todayKey);
  const selectedDayWindow = parisDayWindow(selectedDay);
  const selectedDayStart = selectedDayWindow.start;
  const selectedDayEnd = selectedDayWindow.end;
  const weeks = getMonthGrid(year, month);
  const rangeStart = weeks[0][0].date;
  const rangeEnd = weeks[weeks.length - 1][6].date;
  const rangeEndExclusive = new Date(rangeEnd);
  rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
  const taskInclude = {
    employeeEvent: { include: { employee: true, eventTemplate: true } },
    assignedMembership: { include: { user: true } },
  } as const;
  const [monthGridTasks, todayTasks, overdueTasks, overdueCount, weekCount, upcomingTasks, selectedDayTasks] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          organizationId: membership.organizationId,
          status: { not: "CANCELLED" },
          dueDate: { gte: rangeStart, lt: rangeEndExclusive },
          employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
          ...viewFilter,
        },
        include: taskInclude,
        orderBy: { dueDate: "asc" },
      }),
      prisma.task.findMany({
        where: {
          organizationId: membership.organizationId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { gte: todayStart, lt: todayEnd },
          employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
          ...viewFilter,
        },
        include: taskInclude,
        orderBy: { dueDate: "asc" },
      }),
      prisma.task.findMany({
        where: {
          organizationId: membership.organizationId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { lt: todayStart },
          employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
          ...viewFilter,
        },
        include: taskInclude,
        orderBy: { dueDate: "desc" },
        take: 5,
      }),
      prisma.task.count({
        where: {
          organizationId: membership.organizationId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { lt: todayStart },
          employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
          ...viewFilter,
        },
      }),
      prisma.task.count({
        where: {
          organizationId: membership.organizationId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { gte: todayStart, lt: weekEnd },
          employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
          ...viewFilter,
        },
      }),
      prisma.task.findMany({
        where: {
          organizationId: membership.organizationId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { gte: weekEnd },
          employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
          ...viewFilter,
        },
        include: taskInclude,
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          organizationId: membership.organizationId,
          status: { not: "CANCELLED" },
          dueDate: { gte: selectedDayStart, lt: selectedDayEnd },
          employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
          ...viewFilter,
        },
        include: taskInclude,
        orderBy: { dueDate: "asc" },
      }),
    ]);
  const tasksByDay = new Map<string, typeof monthGridTasks>();
  for (const task of monthGridTasks) {
    const key = dateKey(task.dueDate);
    if (!tasksByDay.has(key)) tasksByDay.set(key, []);
    tasksByDay.get(key)!.push(task);
  }
  const categoriesPresent = Array.from(
    new Set(monthGridTasks.map((t) => t.employeeEvent.eventTemplate?.label).filter(Boolean))
  ) as string[];
  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const isCurrentRealMonth =
    year === todayParts.year && month === todayParts.month - 1;
  const baseParams = `month=${monthParam(year, month)}&view=${view}`;
  const activeCategory = searchParams.category;
  const closeDayHref = `/dashboard/calendar?${baseParams}${
    activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : ""
  }`;
  const visibleSelectedDayTasks = (
    activeCategory
      ? selectedDayTasks.filter(
          (task) => task.employeeEvent.eventTemplate?.label === activeCategory
        )
      : selectedDayTasks
  )
    .slice()
    .sort((a, b) => {
      const doneOrder = Number(a.status === "DONE") - Number(b.status === "DONE");
      return doneOrder || a.label.localeCompare(b.label, "fr");
    });
  const selectedDayOpenCount = visibleSelectedDayTasks.filter(
    (task) => task.status !== "DONE"
  ).length;
  const selectedDayDoneCount = visibleSelectedDayTasks.filter(
    (task) => task.status === "DONE"
  ).length;
  const selectedDayOverdueCount = visibleSelectedDayTasks.filter((task) =>
    isOverdue(task.dueDate, task.status as never)
  ).length;
  const selectedDayResponsibleCount = new Set(
    visibleSelectedDayTasks
      .map((task) => task.assignedMembership?.user.email)
      .filter((email): email is string => Boolean(email))
  ).size;
  const selectedDayGroupsMap = new Map<
    string,
    { key: string; label: string; tasks: TaskForDisplay[] }
  >();
  for (const task of visibleSelectedDayTasks) {
    const label = task.assignedMembership
      ? getUserDisplayName(task.assignedMembership.user)
      : "Non assigné";
    const key = task.assignedMembership
      ? task.assignedMembership.user.email
      : "__unassigned__";
    if (!selectedDayGroupsMap.has(key)) {
      selectedDayGroupsMap.set(key, { key, label, tasks: [] });
    }
    selectedDayGroupsMap.get(key)!.tasks.push(task);
  }
  const selectedDayGroups = Array.from(selectedDayGroupsMap.values()).sort((a, b) => {
    if (a.label === "Non assigné") return 1;
    if (b.label === "Non assigné") return -1;
    return a.label.localeCompare(b.label, "fr");
  });
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calendrier</h1>
          <p className="mt-1 text-sm text-ink-soft">Planifiez et suivez toutes vos échéances RH en un coup d&apos;œil.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-subtle p-1">
          <Link
            href={`/dashboard/calendar?month=${monthParam(year, month)}&view=mine`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "mine" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            Mes tâches
          </Link>
          <Link
            href={`/dashboard/calendar?month=${monthParam(year, month)}&view=all`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "all" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            Toute l&apos;organisation
          </Link>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card compact>
          <p className="text-xs font-medium text-ink-faint">Aujourd&apos;hui</p>
          <p className="mt-1 text-2xl font-semibold text-brand-primary">{todayTasks.length}</p>
          <p className="text-xs text-ink-faint">tâche{todayTasks.length > 1 ? "s" : ""}</p>
        </Card>
        <Card compact>
          <p className="text-xs font-medium text-ink-faint">Cette semaine</p>
          <p className="mt-1 text-2xl font-semibold text-accent-amber">{weekCount}</p>
          <p className="text-xs text-ink-faint">échéance{weekCount > 1 ? "s" : ""}</p>
        </Card>
        <Card compact>
          <p className="text-xs font-medium text-ink-faint">Ce mois-ci</p>
          <p className="mt-1 text-2xl font-semibold text-accent-teal">{monthGridTasks.length}</p>
          <p className="text-xs text-ink-faint">échéance{monthGridTasks.length > 1 ? "s" : ""}</p>
        </Card>
        <Card compact className={overdueCount > 0 ? "border-accent-rose/30" : ""}>
          <p className="text-xs font-medium text-ink-faint">En retard</p>
          <p className={`mt-1 text-2xl font-semibold ${overdueCount > 0 ? "text-accent-rose" : "text-ink-faint"}`}>
            {overdueCount}
          </p>
          <p className="text-xs text-ink-faint">échéance{overdueCount > 1 ? "s" : ""}</p>
        </Card>
      </div>
      {categoriesPresent.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/calendar?${baseParams}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              !activeCategory ? "border-ink bg-ink text-white" : "border-surface-border text-ink-soft hover:border-ink-faint"
            }`}
          >
            Tous
          </Link>
          {categoriesPresent.map((cat) => {
            const dot = categoryFilterDot(cat);
            const isActive = activeCategory === cat;
            return (
              <Link
                key={cat}
                href={`/dashboard/calendar?${baseParams}&category=${encodeURIComponent(cat)}`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  isActive ? "border-ink bg-ink text-white" : "border-surface-border text-ink-soft hover:border-ink-faint"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : dot}`} /> {cat}
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/dashboard/calendar?month=${monthParam(prevMonth.year, prevMonth.month)}&view=${view}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-faint hover:border-brand-primary hover:text-brand-primary"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={16} />
            </Link>
            <p className="w-40 text-center text-base font-semibold text-ink">
              {MONTH_LABELS[month]} {year}
            </p>
            <Link
              href={`/dashboard/calendar?month=${monthParam(nextMonth.year, nextMonth.month)}&view=${view}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-faint hover:border-brand-primary hover:text-brand-primary"
              aria-label="Mois suivant"
            >
              <ChevronRight size={16} />
            </Link>
            {!isCurrentRealMonth && (
              <Link
                href={`/dashboard/calendar?view=${view}`}
                className="ml-1 rounded-lg border border-surface-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-brand-primary hover:text-brand-primary"
              >
                Aujourd&apos;hui
              </Link>
            )}
            <MonthSummaryButton year={year} month={month} />
          </div>
          <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-surface-border bg-surface-border">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`px-2 py-2 text-center text-xs font-medium text-ink-faint ${
                  i >= 5 ? "bg-surface-subtle/70" : "bg-surface-subtle"
                }`}
              >
                {label}
              </div>
            ))}
            {weeks.flat().map((day, i) => {
              const key = dateKey(day.date);
              const dayOfWeek = i % 7;
              const isWeekend = dayOfWeek >= 5;
              let dayTasks = tasksByDay.get(key) ?? [];
              if (activeCategory) {
                dayTasks = dayTasks.filter((t) => t.employeeEvent.eventTemplate?.label === activeCategory);
              }
              const isSelected = key === searchParams.day;
              return (
                <Link
                  key={key}
                  href={`/dashboard/calendar?${baseParams}${activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : ""}&day=${key}`}
                  scroll={false}
                  aria-label={`${key} · ${dayTasks.length} échéance${dayTasks.length > 1 ? "s" : ""}`}
                  className={`min-h-[100px] p-1.5 transition-colors ${
                    day.isToday ? "bg-brand-primary/5" : isWeekend ? "bg-surface-subtle/50" : "bg-white"
                  } ${!day.isCurrentMonth ? "opacity-50" : ""} ${isSelected ? "ring-2 ring-inset ring-brand-primary/40" : ""} hover:bg-surface-subtle`}
                >
                  <p
                    className={`mb-1 text-xs font-medium ${
                      day.isToday
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white"
                        : day.isCurrentMonth
                          ? "text-ink-soft"
                          : "text-ink-faint/50"
                    }`}
                  >
                    {day.date.getDate()}
                  </p>
                  <div className="flex flex-col gap-1">
                    {dayTasks.slice(0, 2).map((task) => {
                      return (
                        <div key={task.id} className="flex items-center gap-1 truncate text-[11px]">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${taskUrgencyDot(task)}`} />
                          <span
                            className={`truncate ${task.status === "DONE" ? "text-ink-faint line-through" : "text-ink-soft"}`}
                          >
                            {task.employeeEvent.employee.firstName} · {task.label}
                          </span>
                        </div>
                      );
                    })}
                    {dayTasks.length > 2 && (
                      <p className="px-0.5 text-[10px] font-medium text-ink-faint">+{dayTasks.length - 2}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {monthGridTasks.length === 0 && (
            <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-surface-border py-10 text-center">
              <CalendarDays size={22} className="text-ink-faint" />
              <p className="text-sm text-ink-soft">
                {view === "mine"
                  ? "Aucune tâche qui vous est assignée sur ce mois."
                  : "Aucune tâche pour l'organisation sur ce mois."}
              </p>
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Échéances aujourd&apos;hui</h2>
              {todayTasks.length > 0 && (
                <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary">
                  {todayTasks.length}
                </span>
              )}
            </div>
            {todayTasks.length === 0 ? (
              <p className="mt-2 text-sm text-ink-faint">Rien d&apos;urgent aujourd&apos;hui.</p>
            ) : (
              <div className="mt-2 flex flex-col">
                {todayTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </Card>
          {overdueCount > 0 && (
            <Card className="border-accent-rose/20">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <TriangleAlert size={14} className="text-accent-rose" /> À surveiller
                </h2>
                <span className="rounded-full bg-accent-rose/10 px-2 py-0.5 text-xs font-semibold text-accent-rose">
                  {overdueCount}
                </span>
              </div>
              <div className="mt-2 flex flex-col">
                {overdueTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/events/${task.employeeEventId}#task-${task.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-surface-subtle"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{task.label}</p>
                      <p className="truncate text-xs text-ink-faint">
                        {task.employeeEvent.employee.firstName} {task.employeeEvent.employee.lastName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-accent-rose">En retard</span>
                  </Link>
                ))}
              </div>
              {overdueCount > overdueTasks.length && (
                <p className="mt-1 px-2 text-xs text-ink-faint">
                  + {overdueCount - overdueTasks.length} autre{overdueCount - overdueTasks.length > 1 ? "s" : ""}
                </p>
              )}
            </Card>
          )}
          <Card>
            <h2 className="text-sm font-semibold text-ink">Prochaines échéances</h2>
            {upcomingTasks.length === 0 ? (
              <p className="mt-2 text-sm text-ink-faint">Rien de prévu au-delà de cette semaine.</p>
            ) : (
              <div className="mt-2 flex flex-col divide-y divide-surface-border">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="py-1">
                    <div className="flex items-center gap-2 px-2 pt-1.5 text-xs font-medium text-ink-faint">
                      {formatDate(task.dueDate)}
                    </div>
                    <TaskRow task={task} />
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/dashboard?view=tasks"
              className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline"
            >
              Voir toutes les échéances →
            </Link>
          </Card>
        </div>
      </div>

      {searchParams.day && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-day-title"
        >
          <Link
            href={closeDayHref}
            scroll={false}
            aria-label="Fermer le détail de la journée"
            className="absolute inset-0 bg-ink/25 backdrop-blur-[1px]"
          />
          <aside className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl sm:max-w-xl">
            <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">
                  Journée RH
                </p>
                <h2 id="calendar-day-title" className="mt-1 text-xl font-semibold text-ink">
                  {formatDayHeading(selectedDay)}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {visibleSelectedDayTasks.length === 0
                    ? "Aucune action planifiée."
                    : `${visibleSelectedDayTasks.length} action${visibleSelectedDayTasks.length > 1 ? "s" : ""} · ${selectedDayResponsibleCount} responsable${selectedDayResponsibleCount > 1 ? "s" : ""}`}
                </p>
              </div>
              <Link
                href={closeDayHref}
                scroll={false}
                aria-label="Fermer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-faint transition-colors hover:border-ink-faint hover:text-ink"
              >
                <X size={17} />
              </Link>
            </div>

            {visibleSelectedDayTasks.length > 0 && (
              <div className="grid grid-cols-3 gap-px border-b border-surface-border bg-surface-border">
                <div className="bg-white px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                    <Clock3 size={13} /> À traiter
                  </div>
                  <p className="mt-1 text-xl font-semibold text-ink">{selectedDayOpenCount}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                    <TriangleAlert size={13} /> En retard
                  </div>
                  <p className={`mt-1 text-xl font-semibold ${selectedDayOverdueCount > 0 ? "text-accent-rose" : "text-ink"}`}>
                    {selectedDayOverdueCount}
                  </p>
                </div>
                <div className="bg-white px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                    <CheckCircle2 size={13} /> Terminées
                  </div>
                  <p className="mt-1 text-xl font-semibold text-ink">{selectedDayDoneCount}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {visibleSelectedDayTasks.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-surface-border px-6 text-center">
                  <CalendarDays size={24} className="text-ink-faint" />
                  <p className="mt-3 text-sm font-medium text-ink">Aucune échéance ce jour-là</p>
                  <p className="mt-1 max-w-xs text-sm text-ink-faint">
                    Sélectionnez une autre journée dans le calendrier pour consulter son organisation.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedDayGroups.map((group) => (
                    <section key={group.key}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-ink-soft">
                            <UsersRound size={14} />
                          </span>
                          <span className="truncate">{group.label}</span>
                        </h3>
                        <span className="shrink-0 text-xs text-ink-faint">
                          {group.tasks.length} tâche{group.tasks.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {group.tasks.map((task) => {
                          const statusMeta = taskStatusMeta(task);
                          const isDone = task.status === "DONE";
                          return (
                            <Link
                              key={task.id}
                              href={`/dashboard/events/${task.employeeEventId}#task-${task.id}`}
                              className="group block rounded-xl border border-surface-border bg-white p-4 transition-all hover:border-brand-primary/35 hover:shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`text-sm font-semibold ${isDone ? "text-ink-faint line-through" : "text-ink"}`}>
                                    {task.label}
                                  </p>
                                  <p className="mt-1 text-sm text-ink-soft">
                                    {task.employeeEvent.employee.firstName} {task.employeeEvent.employee.lastName}
                                  </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                                  {statusMeta.label}
                                </span>
                              </div>

                              <div className="mt-3 flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                  {task.employeeEvent.eventTemplate?.label ? (
                                    <p className="truncate text-xs text-ink-faint">
                                      Parcours · {task.employeeEvent.eventTemplate.label}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-ink-faint">Tâche RH personnalisée</p>
                                  )}
                                </div>
                                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-primary opacity-80 transition-opacity group-hover:opacity-100">
                                  Ouvrir <ArrowUpRight size={12} />
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

    </div>
  );
}
