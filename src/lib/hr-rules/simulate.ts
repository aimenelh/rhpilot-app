/**
 * Test d'une règle sur le passé : on rejoue les demandes déjà tranchées,
 * dans l'ordre où elles sont arrivées, et on compare ce que la règle aurait
 * proposé à ce qui a réellement été décidé.
 */

import { dayKey, evaluateRule, formatKeyRange, type EngineAbsence, type EngineEmployee, type EngineRule, type RuleOutcome } from "./engine";

export type SimulationItem = {
  absenceId: string;
  employeeName: string;
  dates: string;
  actual: "VALIDATED" | "REJECTED";
  ruleOutcome: RuleOutcome;
  reason: string;
};

export type SimulationResult = {
  /** Demandes tranchées que la règle aurait gouvernées. */
  considered: number;
  same: number;
  /** Accordées alors que la règle les aurait refusées ou soumises au RH. */
  wouldBlock: SimulationItem[];
  /** Refusées alors que la règle les aurait accordées. */
  wouldAllow: SimulationItem[];
};

const WINDOW_DAYS = 365;

export function simulateRule(rule: EngineRule, data: { employees: EngineEmployee[]; absences: EngineAbsence[]; now: Date }): SimulationResult {
  const from = data.now.getTime() - WINDOW_DAYS * 86_400_000;
  const to = data.now.getTime() + WINDOW_DAYS * 86_400_000;
  const decided = data.absences
    .filter((absence) => (absence.status === "VALIDATED" || absence.status === "REJECTED") && absence.startDate.getTime() >= from && absence.startDate.getTime() <= to)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const names = new Map(data.employees.map((employee) => [employee.id, `${employee.firstName} ${employee.lastName}`.trim()]));

  const result: SimulationResult = { considered: 0, same: 0, wouldBlock: [], wouldAllow: [] };
  for (const absence of decided) {
    // Ce que l'entreprise savait au moment de la demande : les absences déjà déposées.
    const known = data.absences.filter((other) => other.id !== absence.id && other.createdAt.getTime() < absence.createdAt.getTime() && other.status !== "REJECTED");
    const evaluation = evaluateRule(rule, {
      request: { absenceId: absence.id, employeeId: absence.employeeId, type: absence.type, startDate: absence.startDate, endDate: absence.endDate, createdAt: absence.createdAt },
      employees: data.employees,
      absences: known,
    });
    if (!evaluation) continue;
    result.considered += 1;
    const approved = evaluation.outcome === "APPROVE";
    const item = (): SimulationItem => ({
      absenceId: absence.id,
      employeeName: names.get(absence.employeeId) ?? "Salarié",
      dates: formatKeyRange(dayKey(absence.startDate), dayKey(absence.endDate)),
      actual: absence.status as "VALIDATED" | "REJECTED",
      ruleOutcome: evaluation.outcome,
      reason: evaluation.checks.filter((check) => !check.passed).map((check) => check.hr).join(" ") || evaluation.missingData.join(" "),
    });
    if (absence.status === "VALIDATED" && !approved) result.wouldBlock.push(item());
    else if (absence.status === "REJECTED" && approved) result.wouldAllow.push({ ...item(), reason: evaluation.checks.map((check) => check.hr).join(" ") });
    else result.same += 1;
  }
  return result;
}
