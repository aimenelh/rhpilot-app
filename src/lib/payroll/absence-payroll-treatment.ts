export const ABSENCE_PAYROLL_EFFECTS = [
  "ADD_TO_GROSS",
  "SUBTRACT_FROM_GROSS",
  "EXCLUDE_FROM_GROSS",
] as const;

export type AbsencePayrollEffect = (typeof ABSENCE_PAYROLL_EFFECTS)[number];

export const ABSENCE_PAYROLL_BASES = [
  "NONE",
  "CALENDAR_DAYS",
  "WORKING_DAYS",
  "WORKED_HOURS",
  "RULE_DEFINED",
] as const;

export type AbsencePayrollBasis = (typeof ABSENCE_PAYROLL_BASES)[number];

export type AbsencePayrollTreatmentRule = {
  absenceType: string;
  effect: AbsencePayrollEffect;
  basis: AbsencePayrollBasis;
  ruleVersionId: string;
};

export type AbsencePayrollImpactResolution =
  | {
      status: "RESOLVED";
      absenceId: string;
      absenceType: string;
      calendarDaysInPeriod: number;
      ruleVersionId: string;
      effect: AbsencePayrollEffect;
      basis: AbsencePayrollBasis;
    }
  | {
      status: "RULE_REQUIRED";
      absenceId: string;
      absenceType: string;
      calendarDaysInPeriod: number;
    };

/**
 * Résout uniquement la nature du traitement d'une absence à partir d'une
 * règle versionnée. Aucun montant n'est déduit ici.
 *
 * Une absence sans règle explicite reste bloquante pour la valorisation de la
 * paie : on ne transforme jamais un type d'absence en déduction par défaut.
 */
export function resolveAbsencePayrollTreatment(input: {
  absence: {
    absenceId: string;
    type: string;
    calendarDaysInPeriod: number;
  };
  rules: AbsencePayrollTreatmentRule[];
}): AbsencePayrollImpactResolution {
  const rule = input.rules.find(
    (candidate) => candidate.absenceType === input.absence.type,
  );

  if (!rule) {
    return {
      status: "RULE_REQUIRED",
      absenceId: input.absence.absenceId,
      absenceType: input.absence.type,
      calendarDaysInPeriod: input.absence.calendarDaysInPeriod,
    };
  }

  return {
    status: "RESOLVED",
    absenceId: input.absence.absenceId,
    absenceType: input.absence.type,
    calendarDaysInPeriod: input.absence.calendarDaysInPeriod,
    ruleVersionId: rule.ruleVersionId,
    effect: rule.effect,
    basis: rule.basis,
  };
}
