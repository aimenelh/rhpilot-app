import { LEGAL_SICK_PAY, LEGAL_WORK_ACCIDENT_PAY, type SickPayRule } from "./params";

export const MAINTENANCE_SENIORITY_YEARS = [0, 1, 6, 11, 16, 21, 26, 31] as const;
export type MaintenanceKind = "sickPayRule" | "workAccidentPayRule";

/** Refuse une règle incomplète ou moins favorable que le minimum national. */
export function validateMaintenanceRule(value: unknown, kind: MaintenanceKind): SickPayRule | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("La règle de maintien de salaire est invalide.");
  const rule = value as SickPayRule;
  const legal = kind === "sickPayRule" ? LEGAL_SICK_PAY : LEGAL_WORK_ACCIDENT_PAY;
  const integers = [rule.minSeniorityMonths, rule.waitingDays];
  if (integers.some((number) => !Number.isInteger(number) || number < 0) || rule.minSeniorityMonths > legal.minSeniorityMonths || rule.waitingDays > legal.waitingDays) throw new Error("Le maintien ne peut exiger plus d'ancienneté ou de carence que le minimum légal.");
  if (![rule.fullRate, rule.reducedRate].every(Number.isFinite) || rule.fullRate < legal.fullRate || rule.reducedRate < legal.reducedRate || rule.fullRate > 1 || rule.reducedRate > rule.fullRate) throw new Error("Les taux de maintien doivent respecter le minimum légal et ne pas dépasser 100 %.");
  if (typeof rule.source !== "string" || !rule.source.trim() || rule.source.length > 500) throw new Error("Indiquez la référence de la convention ou de l'accord de maintien (500 caractères maximum).");
  if (!Array.isArray(rule.tiers) || !rule.tiers.length || rule.tiers.length > 30) throw new Error("Les paliers d'ancienneté du maintien sont absents ou invalides.");
  let previous = -1;
  for (const tier of rule.tiers) {
    if (!tier || ![tier.minSeniorityYears, tier.fullRateDays, tier.reducedRateDays].every((number) => Number.isInteger(number) && number >= 0 && number <= 366) || tier.minSeniorityYears <= previous) throw new Error("Les paliers doivent être ordonnés, uniques et comporter des nombres entiers positifs ou nuls.");
    previous = tier.minSeniorityYears;
  }
  if (rule.tiers[0].minSeniorityYears > Math.floor(rule.minSeniorityMonths / 12)) throw new Error("Le premier palier ne couvre pas l'ancienneté minimale renseignée.");
  const thresholds = new Set([...rule.tiers.map((tier) => tier.minSeniorityYears), ...legal.tiers.map((tier) => tier.minSeniorityYears)]);
  for (const years of thresholds) {
    const minimum = [...legal.tiers].reverse().find((tier) => tier.minSeniorityYears <= years);
    if (!minimum) continue;
    const configured = [...rule.tiers].reverse().find((tier) => tier.minSeniorityYears <= years);
    if (!configured || configured.fullRateDays < minimum.fullRateDays || configured.reducedRateDays < minimum.reducedRateDays) throw new Error(`À ${years} ans d'ancienneté, chaque durée de maintien doit atteindre le minimum légal (${minimum.fullRateDays} puis ${minimum.reducedRateDays} jours).`);
  }
  return { ...rule, source: rule.source.trim() };
}

export function parseMaintenanceForm(get: (name: string) => FormDataEntryValue | null, kind: MaintenanceKind): SickPayRule | null {
  if (get(`${kind}.enabled`) !== "1") return null;
  const number = (field: string) => {
    const raw = String(get(`${kind}.${field}`) ?? "").trim().replace(",", ".");
    if (!raw) throw new Error("Complétez tous les paramètres de la règle de maintien activée.");
    return Number(raw);
  };
  return validateMaintenanceRule({
    minSeniorityMonths: number("minSeniorityMonths"), waitingDays: number("waitingDays"),
    fullRate: number("fullRate") / 100, reducedRate: number("reducedRate") / 100,
    source: String(get(`${kind}.source`) ?? ""),
    tiers: MAINTENANCE_SENIORITY_YEARS.map((minSeniorityYears) => ({ minSeniorityYears, fullRateDays: number(`tiers.${minSeniorityYears}.fullRateDays`), reducedRateDays: number(`tiers.${minSeniorityYears}.reducedRateDays`) })),
  }, kind)!;
}
