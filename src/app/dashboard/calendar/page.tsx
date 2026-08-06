import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, TriangleAlert, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import { formatDate } from "@/lib/format";
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

// Couleur par TYPE d'événement (pas par statut) — les seuls libellés
// confirmés existants dans les modèles de parcours réels. Tout libellé
// inconnu retombe sur la couleur par défaut plutôt que de planter.
const CATEGORY_STYLES: Record<string, { dot: string; badgeBg: string; badgeText: string }> = {
  "Embauche": { dot: "bg-brand-violet", badgeBg: "bg-brand-violet/10", badgeText: "text-brand-violet" },
  "Visite médicale": { dot: "bg-accent-teal", badgeBg: "bg-accent-teal/10", badgeText: "text-accent-teal" },
  "Fin de période d'essai": { dot: "bg-accent-amber", badgeBg: "bg-accent-amber/10", badgeText: "text-accent-amber" },
};
const DEFAULT_CATEGORY_STYLE = { dot: "bg-brand-blue", badgeBg: "bg-brand-blue/10", badgeText: "text-brand-blue" };

function categoryStyle(label: string | undefined) {
  return (label && CATEGORY_STYLES[label]) || DEFAULT_CATEGORY_STYLE;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Type minimal et explicite plutôt qu'une inférence Prisma générique fragile —
// n'importe quel résultat de requête avec ces champs (même avec des champs en
// plus) satisfait ce type sans risque de plantage de build.
type TaskForDisplay = {
  id: string;
  employeeEventId: string;
  label: string;
  status: string;
  dueDate: Date;
  employeeEvent: {
    employee: { firstName: string; lastName: string };
    eventTemplate: { label: string } | null;
  };
};

function TaskRow({ task }: { task: TaskForDisplay }) {
  const style = categoryStyle(task.employeeEvent.eventTemplate?.label);
  const isDone = task.status === "DONE";
  return (
    <Link
      href={`/dashboard/events/${task.employeeEventId}#task-${task.id}`}
      className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-subtle"
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isDone ? "text-ink-faint line-through" : "text-ink"}`}>
          {task.label}
        </p>
        <p className="truncate text-xs text-ink-faint">
          {task.employeeEvent.employee.firstName} {task.employeeEvent.employee.lastName}
        </p>
        {task.employeeEvent.eventTemplate?.label && (
          <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badgeBg} ${style.badgeText}`}>
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
  const viewFilter = view === "mine" ? { assignedMembershipId: membership.id } : {};

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dateKey(todayStart);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const selectedDay = searchParams.day ? parseDayKey(searchParams.day) : todayStart;
  const selectedDayEnd = new Date(selectedDay);
  selectedDayEnd.setDate(selectedDayEnd.getDate() + 1);

  const weeks = getMonthGrid(year, month);
  const rangeStart = weeks[0][0].date;
  const rangeEnd = weeks[weeks.length - 1][6].date;
  const rangeEndExclusive = new Date(rangeEnd);
  rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

  const taskInclude = { employeeEvent: { include: { employee: true, eventTemplate: true } } } as const;

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
          dueDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
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
          dueDate: { gte: selectedDay, lt: selectedDayEnd },
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

  // Catégories réellement présentes ce mois-ci — jamais une catégorie inventée
  // (ex. "Entretien") qui n'existerait pas dans les modèles de parcours réels.
  const categoriesPresent = Array.from(
    new Set(monthGridTasks.map((t) => t.employeeEvent.eventTemplate?.label).filter(Boolean))
  ) as string[];

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const isCurrentRealMonth = year === now.getFullYear() && month === now.getMonth();

  const baseParams = `month=${monthParam(year, month)}&view=${view}`;
  const activeCategory = searchParams.category;

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

      {/* Résumé en un coup d'œil */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card compact>
          <p className="text-xs font-medium text-ink-faint">Aujourd&apos;hui</p>
          <p className="mt-1 text-2xl font-semibold text-brand-blue">{todayTasks.length}</p>
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

      {/* Filtres par type d'événement, dérivés des vraies données du mois */}
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
            const style = categoryStyle(cat);
            const isActive = activeCategory === cat;
            return (
              <Link
                key={cat}
                href={`/dashboard/calendar?${baseParams}&category=${encodeURIComponent(cat)}`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  isActive ? "border-ink bg-ink text-white" : "border-surface-border text-ink-soft hover:border-ink-faint"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : style.dot}`} /> {cat}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Colonne principale : navigation + grille */}
        <div className="flex-1">
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/dashboard/calendar?month=${monthParam(prevMonth.year, prevMonth.month)}&view=${view}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-faint hover:border-brand-blue hover:text-brand-blue"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={16} />
            </Link>
            <p className="w-40 text-center text-base font-semibold text-ink">
              {MONTH_LABELS[month]} {year}
            </p>
            <Link
              href={`/dashboard/calendar?month=${monthParam(nextMonth.year, nextMonth.month)}&view=${view}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-faint hover:border-brand-blue hover:text-brand-blue"
              aria-label="Mois suivant"
            >
              <ChevronRight size={16} />
            </Link>
            {!isCurrentRealMonth && (
              <Link
                href={`/dashboard/calendar?view=${view}`}
                className="ml-1 rounded-lg border border-surface-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-brand-blue hover:text-brand-blue"
              >
                Aujourd&apos;hui
              </Link>
            )}
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
              const isSelected = key === dateKey(selectedDay);

              return (
                <Link
                  key={key}
                  href={`/dashboard/calendar?${baseParams}${activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : ""}&day=${key}`}
                  className={`min-h-[100px] p-1.5 transition-colors ${
                    day.isToday ? "bg-brand-blue/5" : isWeekend ? "bg-surface-subtle/50" : "bg-white"
                  } ${!day.isCurrentMonth ? "opacity-50" : ""} ${isSelected ? "ring-2 ring-inset ring-brand-blue/40" : ""} hover:bg-surface-subtle`}
                >
                  <p
                    className={`mb-1 text-xs font-medium ${
                      day.isToday
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-white"
                        : day.isCurrentMonth
                          ? "text-ink-soft"
                          : "text-ink-faint/50"
                    }`}
                  >
                    {day.date.getDate()}
                  </p>
                  <div className="flex flex-col gap-1">
                    {dayTasks.slice(0, 2).map((task) => {
                      const style = categoryStyle(task.employeeEvent.eventTemplate?.label);
                      return (
                        <div key={task.id} className="flex items-center gap-1 truncate text-[11px]">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
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

          {/* Détail du jour sélectionné */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <CalendarClock size={16} className="text-ink-faint" />
                {dateKey(selectedDay) === todayKey ? "Aujourd'hui" : formatDate(selectedDay)}
              </h2>
              <MonthSummaryButton year={year} month={month} />
            </div>

            {selectedDayTasks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">Aucune tâche ce jour-là.</p>
            ) : (
              <Card className="mt-3 divide-y divide-surface-border p-0">
                {selectedDayTasks.map((task) => (
                  <div key={task.id} className="px-1">
                    <TaskRow task={task} />
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Échéances aujourd&apos;hui</h2>
              {todayTasks.length > 0 && (
                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
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
              className="mt-2 inline-block text-xs font-medium text-brand-blue hover:underline"
            >
              Voir toutes les échéances →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
