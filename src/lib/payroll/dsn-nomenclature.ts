import risks from "./dsn-risk-codes-p26.json";

const riskByCode = new Map(risks.rows.map((row) => [row.code, row]));

/** Table officielle RAT embarquée dans Dsn-Val 2026.1.0.17, sans déduction depuis le NAF. */
export function assertDsnWorkAccidentRiskCode(code: string, periodEnd?: Date): void {
  const entry = riskByCode.get(code);
  if (!entry) throw new Error("DSN bloquée : le code risque AT/MP est absent de la nomenclature officielle P26V01. Reprenez votre notification CARSAT/MSA.");
  if (!periodEnd) return;
  if (Number.isNaN(periodEnd.getTime())) throw new Error("DSN bloquée : période de validité du code risque invalide.");
  const day = periodEnd.toISOString().slice(0, 10);
  if ((entry.from && day < entry.from) || (entry.to && day > entry.to)) throw new Error("DSN bloquée : le code risque AT/MP n'est pas valable pour le mois déclaré.");
}
