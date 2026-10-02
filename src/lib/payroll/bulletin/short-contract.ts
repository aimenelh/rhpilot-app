import { addDays, daysBetweenInclusive, fromIsoDay, monthBounds, toIsoDay, type IsoDay } from "./calendar";
import type { EmployeePayrollContext } from "./types";

/** BOI-IR-PAS-20-20-30-10 §250/290 : deux mois de date à date, pas 62 jours fixes. */
export function shortContractPasWindowEnd(hireDate: IsoDay): IsoDay {
  const start = fromIsoDay(hireDate);
  if (Number.isNaN(start.getTime()) || toIsoDay(start) !== hireDate) throw new Error("La date d'embauche du contrat court est invalide.");
  const month = start.getUTCMonth() + 2;
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), month + 1, 0)).getUTCDate();
  // Si le jour de départ n'existe pas dans le mois d'arrivée, le délai atteint sa fin de mois.
  return start.getUTCDate() > lastDay ? toIsoDay(new Date(Date.UTC(start.getUTCFullYear(), month, lastDay)))
    : addDays(toIsoDay(new Date(Date.UTC(start.getUTCFullYear(), month, start.getUTCDate()))), -1);
}

/** plannedContractDays désigne le terme initial (ou la durée minimale), conservé en cas de renouvellement. */
export function shortContractPasApplies(employee: Pick<EmployeePayrollContext, "contract" | "hireDate" | "contractEndDate" | "plannedContractDays">, period: { year: number; month: number }): boolean {
  if (employee.contract !== "CDD") return false;
  const initialDays = employee.plannedContractDays ?? (employee.contractEndDate ? daysBetweenInclusive(employee.hireDate, employee.contractEndDate) : null);
  if (initialDays === null) throw new Error("Le PAS sans taux personnalisé d'un CDD à terme imprécis exige sa durée minimale initiale. Renseignez le contrat avant de calculer la paie.");
  if (!Number.isSafeInteger(initialDays) || initialDays < 1) throw new Error("La durée initiale du CDD est invalide.");
  const limit = shortContractPasWindowEnd(employee.hireDate);
  if (addDays(employee.hireDate, initialDays - 1) > limit) return false;
  const month = monthBounds(period.year, period.month);
  const employmentEnd = employee.contractEndDate && employee.contractEndDate < month.last ? employee.contractEndDate : month.last;
  // Un contrat initialement court prolongé au-delà de la fenêtre ne donne pas un
  // troisième abattement pour un mois complet dépassant ces deux mois.
  return month.last >= employee.hireDate && employmentEnd >= employee.hireDate && employmentEnd <= limit;
}
