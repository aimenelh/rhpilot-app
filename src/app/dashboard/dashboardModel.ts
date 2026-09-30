import { daysUntil } from "@/lib/urgency";

export type DashboardTask = {
  id: string;
  label: string;
  dueDate: string;
  eventId: string;
  eventLabel: string;
  employeeId: string;
  employeeName: string;
  assignedName: string | null;
  isMine: boolean;
  canComplete: boolean;
  proofRequired: boolean;
  /** Libellé fictif réservé à la maquette, jamais utilisé pour décider d’un état métier. */
  previewStatus?: string;
};

export type DashboardRequest = {
  id: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  justification: boolean;
};

export type DashboardActivity = { id: string; label: string; actor: string | null; date: string };
export type DashboardFilter = "all" | "mine" | "overdue" | "soon" | "requests" | "unassigned";

export function taskMatchesFilter(task: DashboardTask, filter: DashboardFilter, today: Date): boolean {
  const days = daysUntil(new Date(task.dueDate), today);
  if (filter === "mine") return task.isMine;
  if (filter === "overdue") return days < 0;
  if (filter === "soon") return days >= 0 && days <= 7;
  if (filter === "unassigned") return task.assignedName === null;
  if (filter === "requests") return false;
  return true;
}

/** Une seule prochaine étape par parcours, à partir des tâches déjà autorisées. */
export function upcomingEvents(tasks: DashboardTask[], horizon: number, today: Date): DashboardTask[] {
  const result = new Map<string, DashboardTask>();
  const ordered = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  for (const task of ordered) {
    const days = daysUntil(new Date(task.dueDate), today);
    if (days < 0 || days > horizon || result.has(task.eventId)) continue;
    result.set(task.eventId, task);
  }
  return [...result.values()];
}

export function taskPriority(task: DashboardTask, today: Date): number {
  const days = daysUntil(new Date(task.dueDate), today);
  return days < 0 ? 0 : task.assignedName === null ? 1 : 2;
}
