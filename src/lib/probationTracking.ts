import { addDuration } from "@/lib/format";

export type ProbationDurationUnit = "DAYS" | "WEEKS" | "MONTHS";

export type ProbationTrackingInput = {
  hireDate: Date;
  probationDuration: number | null;
  probationDurationUnit: ProbationDurationUnit | null;
};

export type ProbationHistoricalInput = ProbationTrackingInput & {
  createdAt: Date;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getProbationEndDate(input: ProbationTrackingInput): Date | null {
  if (
    input.probationDuration === null ||
    input.probationDuration <= 0 ||
    !input.probationDurationUnit
  ) {
    return null;
  }

  return addDuration(
    input.hireDate,
    input.probationDuration,
    input.probationDurationUnit
  );
}

/**
 * Une période d'essai est "historique à l'entrée" lorsqu'elle était
 * déjà terminée avant l'ajout du salarié dans RH Pilot. Elle reste
 * une donnée de dossier, mais ne doit pas devenir une alerte active.
 */
export function isProbationHistoricalAtEntry(input: ProbationHistoricalInput): boolean {
  const endDate = getProbationEndDate(input);
  if (!endDate) return false;
  return startOfDay(endDate).getTime() < startOfDay(input.createdAt).getTime();
}

export function isProbationActive(
  input: ProbationTrackingInput,
  today: Date = new Date()
): boolean {
  const endDate = getProbationEndDate(input);
  if (!endDate) return false;
  return startOfDay(endDate).getTime() >= startOfDay(today).getTime();
}

/**
 * Sans durée connue, le parcours reste disponible pour une saisie
 * manuelle. Dès qu'une fin d'essai calculable est déjà passée, RH
 * Pilot ne propose plus de créer un nouveau parcours actif.
 */
export function shouldOfferProbationWorkflow(
  input: ProbationTrackingInput,
  today: Date = new Date()
): boolean {
  const endDate = getProbationEndDate(input);
  if (!endDate) return true;
  return startOfDay(endDate).getTime() >= startOfDay(today).getTime();
}
