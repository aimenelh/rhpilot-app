import type { DsnBonusType, PayslipInput, PayslipResult } from "./bulletin/types";

export type LockedRemunerationDeclaration = {
  employmentStart: string;
  employmentEnd: string;
  /** Droits chômage (51 type 002), distincts de l'assiette plafonnée 78 type 07. */
  unemploymentRemuneration: number;
  restoredSalary: number;
  outsideContractHours: number;
  paidLeaveIndemnities: Array<{ type: "046"; amount: number; start: string; end: string }>;
  /** Primes non mensuelles (S21.G00.52), montants repris des lignes figées du bulletin. */
  bonuses: Array<{ type: DsnBonusType; amount: number; start: string | null; end: string | null }>;
  /** Autres éléments de revenu brut (S21.G00.54) : avantages en nature, frais, titres-restaurant, transport. */
  otherRevenues: Array<{ type: DsnOtherRevenueType; amount: number }>;
};

/** Nomenclature P26V01 S21.G00.54.001 (types utilisés par le moteur). */
export type DsnOtherRevenueType = "02" | "03" | "04" | "05" | "06" | "07" | "09" | "17" | "18" | "19";

const BENEFIT_TYPES: Readonly<Record<string, DsnOtherRevenueType>> = {
  BENEFIT_MEAL: "02", BENEFIT_HOUSING: "03", BENEFIT_VEHICLE: "04", BENEFIT_TECHNOLOGY: "05", BENEFIT_OTHER: "06",
};
// 07 : frais remboursés au forfait (barèmes) ; 09 : au réel sur justificatifs ; 19 : transports personnels.
const EXPENSE_TYPES: Readonly<Record<string, DsnOtherRevenueType>> = {
  EXPENSE_REAL: "09", EXPENSE_HOTEL: "09", EXPENSE_MEAL: "07", EXPENSE_KILOMETRIC: "07", EXPENSE_TRAVEL: "07",
  SUSTAINABLE_MOBILITY: "19", TRANSPORT_ALLOWANCE: "19",
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const cents = (value: number) => Math.round(value * 100);
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

  // Primes non mensuelles : nature et rattachement figés avec la variable au calcul (S21.G00.52.001/.003/.004).
  const annualInputs = (inputs.bonuses ?? []).filter((bonus) => bonus.excludedFromPaidLeaveBase && bonus.amount > 0);
  const annualLines = grossLines.filter((line) => line.detail?.excludedFromPaidLeaveBase === true);
  if (annualLines.length !== annualInputs.length || new Set(annualLines.map((line) => line.code)).size !== annualLines.length) {
    throw new Error("DSN bloquée : les primes non mensuelles du bulletin ne correspondent pas à la saisie figée.");
  }
  const bonuses: LockedRemunerationDeclaration["bonuses"] = [];
  for (const bonus of annualInputs) {
    const line = annualLines.find((item) => item.code === bonus.code);
    if (!line) throw new Error("DSN bloquée : les primes non mensuelles du bulletin ne correspondent pas à la saisie figée.");
    const declaration = bonus.dsn;
    if (!declaration || !["026", "027", "028"].includes(declaration.type)) {
      throw new Error(`DSN bloquée : la prime « ${bonus.label} » a été calculée sans sa nature DSN. Rouvrez la saisie, précisez sa nature et sa période dans Primes non mensuelles, puis recalculez.`);
    }
    const amount = money(line.amount, `le montant de « ${bonus.label} »`);
    if (amount <= 0 || cents(amount) !== cents(bonus.amount)) throw new Error(`DSN bloquée : le montant de « ${bonus.label} » diverge entre la saisie et le bulletin.`);
    const { attachmentStart: start, attachmentEnd: end } = declaration;
    if ((start === null) !== (end === null) || (declaration.type !== "028" && start === null) || (start !== null && end !== null && end < start)) {
      throw new Error(`DSN bloquée : la période de rattachement de « ${bonus.label} » est incomplète ou incohérente.`);
    }
    bonuses.push({ type: declaration.type, amount: round(amount), start, end });
  }

  // Autres éléments de revenu brut : montant total versé ou attribué, la part soumise étant déjà dans le brut.
  const totals = new Map<DsnOtherRevenueType, number>();
  const addRevenue = (type: DsnOtherRevenueType, amount: number) => { if (amount > 0) totals.set(type, round((totals.get(type) ?? 0) + amount)); };
  const lineAmount = (section: "GROSS" | "NET_ITEMS", code: string) => round(bulletin.lines.filter((line) => line.section === section && line.code === code).reduce((total, line) => total + money(line.amount, code), 0));
  for (const benefit of inputs.benefitsInKind ?? []) {
    const type = BENEFIT_TYPES[benefit.code];
    if (!type) throw new Error(`DSN bloquée : l'avantage en nature « ${benefit.label} » n'a pas de type déclaratif.`);
    if (benefit.amount <= 0) continue;
    if (cents(lineAmount("GROSS", benefit.code)) !== cents(benefit.amount)) throw new Error(`DSN bloquée : l'avantage en nature « ${benefit.label} » diverge entre la saisie et le bulletin.`);
    addRevenue(type, benefit.amount);
  }
  for (const expense of inputs.expenses ?? []) {
    const type = EXPENSE_TYPES[expense.code];
    if (!type) throw new Error(`DSN bloquée : le remboursement « ${expense.label} » n'a pas de type déclaratif.`);
    addRevenue(type, money(expense.amount, `le remboursement « ${expense.label} »`));
  }
  if (inputs.mealVouchers && inputs.mealVouchers.count > 0) {
    const { count, faceValue, employerShare } = inputs.mealVouchers;
    const employerTotal = round(round(faceValue * employerShare) * count);
    if (lineAmount("GROSS", "MEAL_VOUCHER_EXCESS") > employerTotal + 0.005) throw new Error("DSN bloquée : la part patronale des titres-restaurant est incohérente avec le bulletin.");
    addRevenue("17", employerTotal);
  }
  if (inputs.publicTransport && inputs.publicTransport.monthlySubscription > 0) {
    const expected = round(inputs.publicTransport.monthlySubscription * inputs.publicTransport.employerShare);
    const paid = round(lineAmount("NET_ITEMS", "PUBLIC_TRANSPORT") + lineAmount("GROSS", "TRANSPORT_EXCESS"));
    if (cents(paid) !== cents(expected)) throw new Error("DSN bloquée : la prise en charge du transport public diverge entre la saisie et le bulletin.");
    addRevenue("18", paid);
  }
  const otherRevenues = [...totals].sort(([left], [right]) => left.localeCompare(right)).map(([type, amount]) => ({ type, amount }));
  return { employmentStart, employmentEnd, unemploymentRemuneration, restoredSalary, outsideContractHours: round(outsideContractHours), paidLeaveIndemnities, bonuses, otherRevenues };
}
