/**
 * Parse une date calendaire stricte au format AAAA-MM-JJ.
 * Contrairement à new Date("2026-02-31"), qui normalise silencieusement
 * vers mars, cette fonction refuse les dates impossibles.
 */
export function parseIsoDateOnly(value: string): Date | null {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== normalized) return null;

  return date;
}
