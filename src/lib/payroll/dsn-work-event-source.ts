import type { Absence } from "@prisma/client";
import { WORK_STOPPAGE_KINDS } from "./work-stoppage";

export type WorkEventSource = Pick<Absence, "id" | "type" | "status" | "startDate" | "endDate" | "lastWorkedDate" | "subrogationStartDate" | "subrogationEndDate" | "workAccidentDate" | "returnDate" | "returnReasonCode">;
const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;
const timestamp = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/** Regroupe une prescription initiale et ses prolongations continues de même risque. */
export function workEventEpisodes(rows: WorkEventSource[]): WorkEventSource[][] {
  const sorted = rows.filter((row) => row.status === "VALIDATED" && WORK_STOPPAGE_KINDS.has(row.type))
    .sort((a, b) => timestamp(a.startDate) - timestamp(b.startDate) || a.id.localeCompare(b.id));
  const groups: WorkEventSource[][] = [];
  for (const row of sorted) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    if (!previous) { groups.push([row]); continue; }
    const actualEnd = previous.returnDate && previous.returnDate <= previous.endDate ? timestamp(previous.returnDate) - 86400000 : timestamp(previous.endDate);
    if (timestamp(row.startDate) <= actualEnd) throw new Error("DSN bloquée : des arrêts de travail validés se chevauchent.");
    const adjacent = timestamp(row.startDate) === actualEnd + 86400000 && !previous.returnDate;
    if (adjacent && day(previous.lastWorkedDate) !== day(row.lastWorkedDate)) throw new Error("DSN bloquée : les arrêts enchaînés doivent conserver le dernier jour travaillé initial.");
    if (adjacent && previous.type === row.type) group!.push(row);
    else groups.push([row]);
  }
  return groups;
}

export function selectWorkEventEpisode(rows: WorkEventSource[], absenceId: string) {
  const parts = workEventEpisodes(rows).find((group) => group.some((row) => row.id === absenceId));
  if (!parts) throw new Error("DSN bloquée : arrêt validé introuvable dans cette entreprise.");
  const first = parts[0];
  for (const key of ["lastWorkedDate", "subrogationStartDate", "subrogationEndDate", "workAccidentDate"] as const) {
    if (parts.some((part) => day(part[key]) !== day(first[key]))) throw new Error("DSN bloquée : les métadonnées des prolongations doivent rester cohérentes avec l'arrêt initial.");
  }
  const recoveries = parts.filter((row) => row.returnDate || row.returnReasonCode);
  if (recoveries.length > 1) throw new Error("DSN bloquée : plusieurs reprises sont renseignées pour le même arrêt.");
  const endDate = parts.reduce((end, part) => timestamp(part.endDate) > timestamp(end) ? part.endDate : end, first.endDate);
  const recovery = recoveries[0];
  return { ...first, endDate, returnDate: recovery?.returnDate ?? null, returnReasonCode: recovery?.returnReasonCode ?? null, sourceIds: parts.map((part) => part.id) };
}
