export type AbsencePayrollTreatmentCandidate = {
  absenceType: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractAbsencePayrollTreatmentTypes(parameters: unknown): string[] {
  if (!isRecord(parameters) || !Array.isArray(parameters.absenceTreatments)) return [];

  return parameters.absenceTreatments
    .filter(isRecord)
    .map((candidate) => (typeof candidate.absenceType === "string" ? candidate.absenceType.trim() : ""))
    .filter(Boolean);
}

export function getMissingAbsencePayrollTreatmentTypes(input: {
  absenceTypes: string[];
  validatedTreatments: AbsencePayrollTreatmentCandidate[];
}): string[] {
  const available = new Set(
    input.validatedTreatments
      .map((treatment) => treatment.absenceType.trim())
      .filter(Boolean),
  );

  return [...new Set(input.absenceTypes.map((type) => type.trim()).filter(Boolean))]
    .filter((type) => !available.has(type))
    .sort();
}

export function formatAbsencePayrollTreatmentGap(absenceTypes: string[]): string {
  if (absenceTypes.length === 0) return "";

  const labels: Record<string, string> = {
    PAID_LEAVE: "congé payé",
    RTT: "RTT",
    SICK_LEAVE: "arrêt maladie",
    WORK_ACCIDENT: "accident du travail",
    UNPAID_LEAVE: "absence sans solde",
    FAMILY_EVENT: "événement familial",
    OTHER: "autre absence",
  };

  const readable = absenceTypes.map((type) => labels[type] ?? type).join(", ");
  return `Une règle de traitement paie validée manque pour : ${readable}.`;
}
