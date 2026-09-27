/**
 * Arrondis de paie : au plus proche, la moitié s'éloignant de zéro, après
 * neutralisation des erreurs de représentation binaire (17,33 × 1,5 = 25,995 → 26,00).
 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = Number((Math.abs(value) * factor).toPrecision(12));
  return (Math.sign(value) * Math.round(scaled)) / factor || 0;
}

export function round2(value: number): number {
  return roundTo(value, 2);
}

export function round4(value: number): number {
  return roundTo(value, 4);
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function assertAmount(value: unknown, label: string, options: { allowZero?: boolean; allowNegative?: boolean } = { allowZero: true }): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} est absent ou invalide.`);
  if (!options.allowNegative && value < 0) throw new Error(`${label} ne peut pas être négatif.`);
  if (options.allowZero === false && value === 0) throw new Error(`${label} doit être supérieur à zéro.`);
  return value;
}

export function formatEuros(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}
