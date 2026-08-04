// Calculs purs pour la vue calendrier — semaine commençant le lundi
// (convention française), aucune dépendance externe.

export type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function getMonthGrid(year: number, month: number): CalendarDay[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  // getDay() : 0 = dimanche ... 6 = samedi. On veut 0 = lundi ... 6 = dimanche.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(gridStart);
  // Tant que la semaine en cours n'a pas dépassé le dernier jour du
  // mois, on continue — garantit exactement 5 ou 6 semaines selon le
  // mois, jamais une semaine incomplète ni un jour manquant.
  while (cursor <= lastOfMonth) {
    const days: CalendarDay[] = [];
    for (let day = 0; day < 7; day++) {
      days.push({
        date: new Date(cursor),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: cursor.getTime() === today.getTime(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseMonthParam(raw: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
