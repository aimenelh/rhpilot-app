import type { TaskStatus } from "@prisma/client";
import { isOverdue, formatRelativeDueDate } from "@/lib/urgency";

type TaskLike = { status: TaskStatus; dueDate: Date; updatedAt: Date };

export type ParcoursSummary = {
  overdueCount: number;
  nextDueLabel: string | null;
  lastActivityLabel: string;
  isUpToDate: boolean;
};

function daysAgoLabel(date: Date, now: Date = new Date()) {
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return "il y a 1 jour";
  return `il y a ${diffDays} jours`;
}

export function summarizeParcours(tasks: TaskLike[]): ParcoursSummary {
  const now = new Date();
  const openTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  const overdueCount = openTasks.filter((t) => isOverdue(t.dueDate, t.status, now)).length;

  const nextUpcoming = openTasks
    .filter((t) => !isOverdue(t.dueDate, t.status, now))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  const lastActivity = tasks.reduce(
    (latest, t) => (t.updatedAt > latest ? t.updatedAt : latest),
    tasks[0]?.updatedAt ?? now
  );

  return {
    overdueCount,
    nextDueLabel: nextUpcoming ? formatRelativeDueDate(nextUpcoming.dueDate, now) : null,
    lastActivityLabel: `Dernière activité ${daysAgoLabel(lastActivity, now)}`,
    isUpToDate: overdueCount === 0,
  };
}
