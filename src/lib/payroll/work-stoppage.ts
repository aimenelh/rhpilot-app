import { toIsoDay } from "./bulletin/calendar";
import type { AbsenceInput } from "./bulletin/types";

export const WORK_STOPPAGE_KINDS = new Set(["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"]);

/** La date de fin prescrite reste disponible pour la DSN ; la paie s'arrête à la reprise réelle. */
export function effectiveAbsenceEnd(absence: { type: string; startDate: Date; endDate: Date; returnDate?: Date | null; returnReasonCode?: string | null }): Date {
  if (WORK_STOPPAGE_KINDS.has(absence.type) && absence.returnReasonCode === "02") throw new Error("Une reprise à temps partiel thérapeutique nécessite une répartition des heures et des IJSS spécifique, encore non prise en charge.");
  if (!WORK_STOPPAGE_KINDS.has(absence.type) || !absence.returnDate || absence.returnDate > absence.endDate) return absence.endDate;
  if (absence.returnDate <= absence.startDate) throw new Error("La reprise réelle doit être postérieure au début de l'arrêt.");
  return new Date(absence.returnDate.getTime() - 86400000);
}

type StoredMetadata = {
  absenceId: string; type: string; startDate: Date; endDate: Date;
  lastWorkedDate: Date | null; subrogationStartDate: Date | null; subrogationEndDate: Date | null;
  workAccidentDate: Date | null; returnDate: Date | null; returnReasonCode: string | null;
};

/** Aligne les métadonnées sur les arrêts consolidés par le moteur (carence et prolongations). */
export function freezeWorkStoppages(mapped: { absences: AbsenceInput[]; chainIds: Map<string, string[]> }, rows: StoredMetadata[]) {
  const byId = new Map(rows.map((row) => [row.absenceId, row]));
  const day = (value: Date | null) => value ? toIsoDay(value) : null;
  return mapped.absences.filter((absence) => WORK_STOPPAGE_KINDS.has(absence.kind)).map((absence) => {
    const primary = byId.get(absence.id);
    if (!primary) throw new Error("Les données déclaratives de l'arrêt calculé sont absentes.");
    const parts = (mapped.chainIds.get(absence.id) ?? [absence.id]).map((id) => byId.get(id)).filter((row): row is StoredMetadata => Boolean(row));
    if (parts.some((part) => day(part.lastWorkedDate) !== day(primary.lastWorkedDate))) throw new Error("Les prolongations d'un arrêt doivent conserver le dernier jour travaillé initial.");
    if (parts.some((part) => day(part.subrogationStartDate) !== day(primary.subrogationStartDate) || day(part.subrogationEndDate) !== day(primary.subrogationEndDate))) throw new Error("Les prolongations d'un arrêt doivent préciser une période de subrogation cohérente.");
    if (parts.some((part) => day(part.workAccidentDate) !== day(primary.workAccidentDate))) throw new Error("Les prolongations d'un accident du travail doivent conserver la date de l'accident initial.");
    if (parts.filter((part) => part.returnDate).length > 1) throw new Error("Un arrêt consolidé ne peut pas comporter plusieurs reprises réelles.");
    const prescribedEnd = parts.map((part) => toIsoDay(part.endDate)).sort().at(-1)!;
    const recovered = parts.find((part) => part.returnDate);
    return { absenceId: absence.id, type: absence.kind, startDate: absence.start, endDate: absence.end,
      expectedEndDate: prescribedEnd, lastWorkedDate: day(primary.lastWorkedDate),
      subrogationStartDate: day(primary.subrogationStartDate), subrogationEndDate: day(primary.subrogationEndDate),
      workAccidentDate: day(primary.workAccidentDate), returnDate: day(recovered?.returnDate ?? null), returnReasonCode: recovered?.returnReasonCode ?? null };
  });
}
