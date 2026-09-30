import { describe, expect, it } from "vitest";
import { taskMatchesFilter, upcomingEvents, type DashboardTask } from "./dashboardModel";

function task(id: string, eventId: string, dueDate: string, mine = false): DashboardTask {
  return { id, eventId, dueDate, label: id, eventLabel: "Embauche", employeeId: "employee", employeeName: "Camille", assignedName: "Sophie", isMine: mine, canComplete: true, proofRequired: false };
}

describe("tableau de bord : échéances et périmètre", () => {
  it("une échéance du jour parisien n'est pas en retard, même si l'UTC est encore la veille", () => {
    const now = new Date("2026-09-29T22:30:00Z");
    const item = task("today", "event", "2026-09-30T00:00:00Z");
    expect(taskMatchesFilter(item, "overdue", now)).toBe(false);
    expect(taskMatchesFilter(item, "soon", now)).toBe(true);
  });
  it("le fil ne montre qu'une prochaine étape par parcours, sans reprendre les retards", () => {
    const now = new Date("2026-09-30T09:00:00Z");
    const items = [task("late", "lea", "2026-09-28T09:00:00Z"), task("second", "lea", "2026-10-05T09:00:00Z"), task("first", "lea", "2026-10-02T09:00:00Z"), task("far", "karim", "2026-10-20T09:00:00Z")];
    expect(upcomingEvents(items, 7, now).map(item => item.id)).toEqual(["first"]);
    expect(upcomingEvents(items, 30, now).map(item => item.id)).toEqual(["first", "far"]);
    expect(items[0].id).toBe("late");
  });
  it("le filtre personnel distingue une tâche confiée d'une tâche simplement visible", () => {
    const now = new Date("2026-09-30T09:00:00Z");
    expect(taskMatchesFilter(task("visible", "event", "2026-10-02T09:00:00Z"), "mine", now)).toBe(false);
    expect(taskMatchesFilter(task("mine", "event", "2026-10-02T09:00:00Z", true), "mine", now)).toBe(true);
  });
  it("le changement d'heure conserve les bornes de sept jours calendaires", () => {
    const now = new Date("2026-10-24T22:30:00Z");
    expect(taskMatchesFilter(task("seven", "event", "2026-11-01T10:00:00Z"), "soon", now)).toBe(true);
    expect(taskMatchesFilter(task("eight", "event", "2026-11-02T10:00:00Z"), "soon", now)).toBe(false);
  });
});
