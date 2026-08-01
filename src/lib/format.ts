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
