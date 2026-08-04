import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import {
  getMonthGrid,
  dateKey,
  parseMonthParam,
  monthParam,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  TO_PREPARE: "bg-ink-faint",
  TODO: "bg-brand-blue",
  IN_PROGRESS: "bg-accent-amber",
  WAITING_EXTERNAL: "bg-brand-violet",
  DONE: "bg-accent-teal",
  CANCELLED: "bg-ink-faint",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; view?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const view = searchParams.view === "all" ? "all" : "mine";
  const { year, month } = parseMonthParam(searchParams.month);

  const weeks = getMonthGrid(year, month);
  const rangeStart = weeks[0][0].date;
  const rangeEnd = weeks[weeks.length - 1][6].date;
  const rangeEndExclusive = new Date(rangeEnd);
  rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      organizationId: membership.organizationId,
      status: { not: "CANCELLED" },
      dueDate: { gte: rangeStart, lt: rangeEndExclusive },
      employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
      ...(view === "mine" ? { assignedMembershipId: membership.id } : {}),
    },
    include: {
      employeeEvent: { include: { employee: true } },
      assignedMembership: { include: { user: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const tasksByDay = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const key = dateKey(task.dueDate);
    if (!tasksByDay.has(key)) tasksByDay.set(key, []);
    tasksByDay.get(key)!.push(task);
  }

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calendrier</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Utile pour planifier en un coup d&apos;œil dès que le nombre de salariés grandit.
          </p>
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

      <div className="mt-6 flex items-center justify-center gap-4">
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
      </div>

      <div className="mt-6 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-surface-border bg-surface-border">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-surface-subtle px-2 py-2 text-center text-xs font-medium text-ink-faint">
            {label}
          </div>
        ))}

        {weeks.flat().map((day) => {
          const key = dateKey(day.date);
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`min-h-[100px] bg-white p-1.5 ${!day.isCurrentMonth ? "bg-surface-subtle/40" : ""}`}
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
                {dayTasks.slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/events/${task.employeeEventId}#task-${task.id}`}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] hover:bg-surface-subtle"
                    title={`${task.label} — ${task.employeeEvent.employee.firstName} ${task.employeeEvent.employee.lastName}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} />
                    <span className="truncate text-ink-soft">
                      {task.employeeEvent.employee.firstName} {task.label}
                    </span>
                  </Link>
                ))}
                {dayTasks.length > 3 && (
                  <p className="px-1 text-[10px] text-ink-faint">+{dayTasks.length - 3} autre(s)</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
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
  );
}
