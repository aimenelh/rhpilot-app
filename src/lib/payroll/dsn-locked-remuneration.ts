import type { PayslipInput, PayslipResult } from "./bulletin/types";

export type LockedRemunerationDeclaration = {
  employmentStart: string;
  employmentEnd: string;
  /** Droits chômage (51 type 002), distincts de l'assiette plafonnée 78 type 07. */
  unemploymentRemuneration: number;
  restoredSalary: number;
  outsideContractHours: number;
  paidLeaveIndemnities: Array<{ type: "046"; amount: number; start: string; end: string }>;
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const money = (value: unknown, label: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`DSN bloquée : ${label} du bulletin est absent ou invalide.`);
  return value;
};

/** Consignes GIP-MDS 2960, 418, 686 et 2693 : lecture des montants figés, sans refaire la paie. */
export function readLockedRemunerationDeclaration({ bulletin, inputs }: { bulletin: PayslipResult; inputs: PayslipInput }): LockedRemunerationDeclaration {
  const employmentStart = inputs.employee.hireDate > bulletin.period.first ? inputs.employee.hireDate : bulletin.period.first;
  const employmentEnd = inputs.employee.contractEndDate && inputs.employee.contractEndDate < bulletin.period.last ? inputs.employee.contractEndDate : bulletin.period.last;
  if (employmentEnd < employmentStart) throw new Error("DSN bloquée : la période d'emploi ne recouvre pas le mois déclaré.");
  const gross = money(bulletin.totals.grossSubject, "le brut soumis");
  const grossLines = bulletin.lines.filter((line) => line.section === "GROSS");
  const sum = (codes: ReadonlySet<string>) => round(grossLines.filter((line) => codes.has(line.code)).reduce((amount, line) => amount + money(line.amount, line.code), 0));
  const maintenance = sum(new Set(["SICK_MAINTENANCE", "AT_MAINTENANCE"]));
  const authorizedDeductions = -sum(new Set(["ABS_UNPAID_LEAVE", "ABS_SICK_LEAVE", "ABS_WORK_ACCIDENT", "ABS_MATERNITY", "ABS_PATERNITY", "ENTRY_EXIT"]));
  // Le maintien n'est pas du travail rémunéré pour les droits chômage ; le salaire rétabli
  // rétablit la retenue sans compter une deuxième fois ce maintien.
  const unemploymentRemuneration = round(gross - maintenance);
  const restoredSalary = round(gross + authorizedDeductions - maintenance);
  if (unemploymentRemuneration < 0 || restoredSalary < 0) throw new Error("DSN bloquée : les rémunérations déclaratives du bulletin sont incohérentes.");

  const entryLines = grossLines.filter((line) => line.code === "ENTRY_EXIT");
  if (entryLines.length > 1) throw new Error("DSN bloquée : la retenue d'entrée/sortie est dupliquée.");
  const outsideContractHours = entryLines.reduce((hours, line) => {
    const quantity = money(line.quantity, "les heures hors contrat");
    if (line.unit !== "HOURS" || quantity < 0 || money(line.amount, "la retenue d'entrée/sortie") > 0) throw new Error("DSN bloquée : la retenue d'entrée/sortie est incohérente.");
    return hours + quantity;
  }, 0);

  const cpInputs = new Map((inputs.absences ?? []).filter((absence) => absence.kind === "PAID_LEAVE").map((absence) => [absence.id, absence]));
  const cpLines = grossLines.filter((line) => line.code === "CP_INDEMNITY");
  const seen = new Set<string>();
  const paidLeaveIndemnities: LockedRemunerationDeclaration["paidLeaveIndemnities"] = [];
  for (const line of cpLines) {
    const id = line.detail?.absenceId;
    const absence = typeof id === "string" ? cpInputs.get(id) : null;
    if (!absence || seen.has(absence.id)) throw new Error("DSN bloquée : une indemnité de congés payés n'est pas rattachée à une absence unique du bulletin.");
    seen.add(absence.id);
    const amount = money(line.amount, "l'indemnité de congés payés");
    if (amount < 0 || line.unit !== "DAYS" || money(line.quantity, "les jours de congé") < 0) throw new Error("DSN bloquée : l'indemnité de congés payés est incohérente.");
    if (amount === 0) continue;
    if (!bulletin.paidLeave?.tenthCompared) throw new Error("DSN bloquée : renseignez le brut et les jours de référence des congés pour comparer le dixième au maintien avant l'export.");
    // Un reliquat de décompte ouvrable peut dépasser la fin saisie de l'absence (week-end).
    // Sa valorisation dans le bulletin reste rattachée à la période d'emploi courante.
    const start = absence.start > employmentStart ? absence.start : employmentStart;
    const end = absence.end < employmentEnd ? absence.end : employmentEnd;
    paidLeaveIndemnities.push({ type: "046", amount: round(amount), start: end < start ? employmentStart : start, end: end < start ? employmentEnd : end });
  }
  return { employmentStart, employmentEnd, unemploymentRemuneration, restoredSalary, outsideContractHours: round(outsideContractHours), paidLeaveIndemnities };
}
