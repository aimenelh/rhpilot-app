import type { TaskStatus } from "@prisma/client";

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Nombre de jours entre aujourd'hui et la date donnée (négatif si passé). */
export function daysUntil(date: Date, today: Date = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

export function isTaskOpen(status: TaskStatus) {
  return status !== "DONE" && status !== "CANCELLED";
}

export function isOverdue(dueDate: Date, status: TaskStatus, today: Date = new Date()) {
  return isTaskOpen(status) && daysUntil(dueDate, today) < 0;
}

export function isDueSoon(dueDate: Date, status: TaskStatus, today: Date = new Date()) {
  const diff = daysUntil(dueDate, today);
  return isTaskOpen(status) && diff >= 0 && diff <= 7;
}

/** Texte relatif court pour une échéance, ex. "En retard depuis 2 jours". */
export function formatRelativeDueDate(dueDate: Date, today: Date = new Date()) {
  const diff = daysUntil(dueDate, today);
  if (diff < 0) return `En retard depuis ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}`;
  if (diff === 0) return "Échéance aujourd'hui";
  if (diff === 1) return "Échéance demain";
  return `Échéance dans ${diff} jours`;
}
