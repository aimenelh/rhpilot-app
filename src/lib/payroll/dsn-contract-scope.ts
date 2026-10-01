import type { EmployeePayrollContext } from "./bulletin/types";

type Contract = Pick<EmployeePayrollContext, "contract" | "hireDate" | "contractEndDate" | "executive">;

/** P26V01 .40.003 : les extensions cadre ne sont pas représentées par le booléen du moteur. */
export function assertDsnRetirementScope(executive: boolean, retirementStatusCode: string): void {
  const expected = executive ? "01" : "04";
  if (retirementStatusCode !== expected) {
    throw new Error("DSN bloquée : le statut retraite complémentaire ne correspond pas au statut cadre/non-cadre du bulletin verrouillé. Les extensions cadre et autres régimes nécessitent un paramétrage distinct.");
  }
}

/** Les événements de contrat nécessitent une déclaration distincte de la paie courante. */
export function assertDsnStableContract(current: Contract, period: { year: number; month: number }, previous?: Contract): void {
  const start = `${period.year}-${String(period.month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(period.year, period.month, 0)).toISOString().slice(0, 10);
  if (current.hireDate > start || (current.contractEndDate && current.contractEndDate <= end)) {
    throw new Error("DSN bloquée : les entrées en cours de mois, fins de contrat et rappels après sortie nécessitent leurs blocs événementiels, même sans prorata sur le bulletin.");
  }
  if (previous && (previous.contract !== current.contract || previous.hireDate !== current.hireDate ||
    (previous.contractEndDate ?? null) !== (current.contractEndDate ?? null) || previous.executive !== current.executive)) {
    throw new Error("DSN bloquée : un changement de contrat ou de statut depuis le mois précédent nécessite une déclaration de changement.");
  }
}
