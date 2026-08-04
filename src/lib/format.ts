export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

export function addDuration(date: Date, amount: number, unit: "DAYS" | "WEEKS" | "MONTHS"): Date {
  const result = new Date(date);
  if (unit === "DAYS") result.setDate(result.getDate() + amount);
  else if (unit === "WEEKS") result.setDate(result.getDate() + amount * 7);
  else result.setMonth(result.getMonth() + amount);
  return result;
}

export function formatDuration(amount: number, unit: "DAYS" | "WEEKS" | "MONTHS"): string {
  const labels: Record<string, [string, string]> = {
    DAYS: ["jour", "jours"],
    WEEKS: ["semaine", "semaines"],
    MONTHS: ["mois", "mois"],
  };
  const [singular, plural] = labels[unit];
  return `${amount} ${amount > 1 ? plural : singular}`;
}

// Un vrai calendrier natif (<input type="date">) est dessiné par le
// navigateur, on ne peut pas y griser visuellement certains jours —
// c'est une vraie limite technique, pas un choix. À la place, un
// avertissement discret apparaît sous le champ si la date choisie
// tombe un week-end, sans jamais bloquer le choix (cf. principe :
// ne jamais empêcher une saisie, même rare).
export function isWeekend(dateString: string): boolean {
  if (!dateString) return false;
  const day = new Date(`${dateString}T00:00:00`).getDay();
  return day === 0 || day === 6;
}
