/**
 * Tableau de saisie de la paie : colonnes par sous-onglet, valeurs par cellule,
 * lecture des saisies et collage depuis un tableur.
 *
 * Module pur, sans dépendance serveur : il est partagé par l'écran de saisie et
 * les actions qui enregistrent les cellules.
 */
import { BULLETIN_VARIABLES, getBulletinVariable, type BulletinVariableDefinition } from "./bulletin/variables";

export type EntryTab = "heures" | "variables";

export type EntryColumn = {
  code: string;
  label: string;
  header: string;
  unit: BulletinVariableDefinition["unit"];
  /** Colonne réservée aux temps pleins (heures supplémentaires) ou aux temps partiels (heures complémentaires). */
  appliesTo?: "FULL_TIME" | "PART_TIME";
};

const HEADERS: Record<string, string> = {
  OVERTIME_25: "Heures sup. 25 %",
  OVERTIME_50: "Heures sup. 50 %",
  COMPLEMENTARY_10: "Heures compl. 10 %",
  COMPLEMENTARY_25: "Heures compl. 25 %",
  NIGHT_WORK: "Majoration nuit (€)",
  SUNDAY_WORK: "Majoration dimanche (€)",
  PUBLIC_HOLIDAY_WORK: "Majoration férié (€)",
  ON_CALL: "Astreinte (€)",
  ACTIVITY_BONUS: "Prime (€)",
  MEAL_VOUCHERS: "Titres-restaurant",
  PUBLIC_TRANSPORT: "Abonnement transport (€)",
  BASE_SALARY_ADJUSTMENT: "Rappel de salaire (€)",
  SENIORITY_BONUS: "Prime d'ancienneté (€)",
  OBJECTIVE_BONUS: "Prime sur objectifs (€)",
  SUJETION_BONUS: "Prime de sujétion (€)",
  YEAR_END_BONUS: "13e mois (€)",
  VACATION_BONUS: "Prime de vacances (€)",
  EXCEPTIONAL_BONUS: "Prime exceptionnelle (€)",
  BENEFIT_MEAL: "Avantage nourriture (€)",
  BENEFIT_HOUSING: "Avantage logement (€)",
  BENEFIT_VEHICLE: "Avantage véhicule (€)",
  BENEFIT_TECHNOLOGY: "Avantage NTIC (€)",
  BENEFIT_OTHER: "Autre avantage (€)",
  EXPENSE_REAL: "Frais sur justificatifs (€)",
  EXPENSE_MEAL: "Indemnités de repas (€)",
  EXPENSE_KILOMETRIC: "Indemnités kilométriques (€)",
  EXPENSE_TRAVEL: "Grand déplacement (€)",
  EXPENSE_HOTEL: "Hébergement (€)",
  SUSTAINABLE_MOBILITY: "Forfait mobilités (€)",
  TRANSPORT_ALLOWANCE: "Prime de transport (€)",
  SALARY_ADVANCE: "Acompte versé (€)",
  OTHER_NET_DEDUCTION: "Autre retenue (€)",
};

const HOURS_CODES = ["OVERTIME_25", "OVERTIME_50", "COMPLEMENTARY_10", "COMPLEMENTARY_25", "NIGHT_WORK", "SUNDAY_WORK", "PUBLIC_HOLIDAY_WORK", "ON_CALL"];
const VARIABLE_CODES = BULLETIN_VARIABLES.map((definition) => definition.code).filter((code) => !HOURS_CODES.includes(code) && code !== "IJSS_GROSS");

const DEFAULTS: Record<EntryTab, string[]> = {
  heures: ["OVERTIME_25", "OVERTIME_50"],
  variables: ["ACTIVITY_BONUS", "MEAL_VOUCHERS", "PUBLIC_TRANSPORT"],
};

/** Éléments qui reviennent d'un mois sur l'autre : repris par « Reprendre le mois dernier ». */
export const RECURRING_CODES: ReadonlySet<string> = new Set([
  "ACTIVITY_BONUS", "SENIORITY_BONUS", "SUJETION_BONUS", "ON_CALL",
  "BENEFIT_MEAL", "BENEFIT_HOUSING", "BENEFIT_VEHICLE", "BENEFIT_TECHNOLOGY", "BENEFIT_OTHER",
  "MEAL_VOUCHERS", "PUBLIC_TRANSPORT", "SUSTAINABLE_MOBILITY", "TRANSPORT_ALLOWANCE", "OTHER_NET_DEDUCTION",
]);

function column(code: string): EntryColumn {
  const definition = getBulletinVariable(code);
  if (!definition) throw new Error(`Élément de paie inconnu : ${code}.`);
  return {
    code,
    label: definition.label,
    header: HEADERS[code] ?? definition.label,
    unit: definition.unit,
    appliesTo: code.startsWith("OVERTIME_") ? "FULL_TIME" : code.startsWith("COMPLEMENTARY_") ? "PART_TIME" : undefined,
  };
}

export function tabCodes(tab: EntryTab): string[] {
  return tab === "heures" ? HOURS_CODES : VARIABLE_CODES;
}

export function entryTabOf(code: string): EntryTab | null {
  if (HOURS_CODES.includes(code)) return "heures";
  if (VARIABLE_CODES.includes(code)) return "variables";
  return null;
}

/**
 * Colonnes affichées : colonnes par défaut, colonnes contenant une saisie et
 * colonnes ajoutées par l'utilisateur, dans l'ordre du catalogue. Les heures
 * complémentaires apparaissent d'office s'il y a un salarié à temps partiel.
 */
export function visibleColumns(tab: EntryTab, options: { usedCodes?: Iterable<string>; chosenCodes?: Iterable<string>; hasPartTime?: boolean; hasFullTime?: boolean } = {}): EntryColumn[] {
  const wanted = new Set<string>(DEFAULTS[tab]);
  if (tab === "heures") {
    if (options.hasPartTime) { wanted.add("COMPLEMENTARY_10"); wanted.add("COMPLEMENTARY_25"); }
    if (options.hasFullTime === false) { wanted.delete("OVERTIME_25"); wanted.delete("OVERTIME_50"); }
  }
  for (const code of options.usedCodes ?? []) if (tabCodes(tab).includes(code)) wanted.add(code);
  for (const code of options.chosenCodes ?? []) if (tabCodes(tab).includes(code)) wanted.add(code);
  return tabCodes(tab).filter((code) => wanted.has(code)).map(column);
}

export function optionalColumns(tab: EntryTab, visible: readonly EntryColumn[]): EntryColumn[] {
  const shown = new Set(visible.map((entry) => entry.code));
  return tabCodes(tab).filter((code) => !shown.has(code)).map(column);
}

export type StoredEntryVariable = { employeeId: string; code: string; amount: number; reference?: string | null };

export const cellKey = (employeeId: string, code: string) => `${employeeId}:${code}`;

/** Valeur d'une cellule : somme des saisies du salarié pour cet élément (hors IJSS rattachées à un arrêt). */
export function cellValues(variables: readonly StoredEntryVariable[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const variable of variables) {
    if (variable.reference) continue;
    const key = cellKey(variable.employeeId, variable.code);
    values.set(key, Math.round(((values.get(key) ?? 0) + variable.amount) * 100) / 100);
  }
  return values;
}

export type ParsedCell = { value: number | null } | { error: string };

/** Lit une saisie : virgule ou point décimal, espaces et symboles tolérés, vide pour effacer. */
export function parseCellInput(raw: string, unit: EntryColumn["unit"]): ParsedCell {
  const cleaned = raw.replace(/[\s  €h]/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return { value: null };
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return { error: `« ${raw.trim()} » n'est pas un nombre.` };
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return { error: "La valeur doit être positive." };
  if (unit === "UNITS" && !Number.isInteger(value)) return { error: "Un nombre de titres est un nombre entier." };
  if (unit === "HOURS" && value > 200) return { error: "Plus de 200 heures dans le mois : vérifiez la saisie." };
  if (unit === "EUR" && value > 1_000_000) return { error: "Montant invraisemblable." };
  if (value === 0) return { value: null };
  return { value: Math.round(value * 100) / 100 };
}

export function formatCellValue(value: number | undefined | null): string {
  if (value === undefined || value === null) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(".", ",").replace(/0$/, "");
}

/** Découpe un bloc copié depuis Excel ou Google Sheets (tabulations et retours à la ligne). */
export function parsePastedBlock(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.map((line) => line.split("\t"));
}

export type PastedCell = { employeeId: string; code: string; raw: string };

/** Répartit un bloc collé à partir d'une cellule ; ce qui déborde du tableau est ignoré. */
export function spreadPaste(block: string[][], start: { row: number; col: number }, rows: readonly string[], columns: readonly EntryColumn[]): PastedCell[] {
  const cells: PastedCell[] = [];
  block.forEach((line, rowOffset) => {
    const employeeId = rows[start.row + rowOffset];
    if (!employeeId) return;
    line.forEach((raw, colOffset) => {
      const target = columns[start.col + colOffset];
      if (!target) return;
      cells.push({ employeeId, code: target.code, raw });
    });
  });
  return cells;
}

/** Raison pour laquelle une cellule n'est pas saisissable pour ce salarié. */
export function cellDisabledReason(target: EntryColumn, partTime: boolean): string | null {
  if (target.appliesTo === "FULL_TIME" && partTime) return "Temps partiel : saisissez des heures complémentaires.";
  if (target.appliesTo === "PART_TIME" && !partTime) return "Temps plein : saisissez des heures supplémentaires.";
  return null;
}

/* ---------- Import d'un tableau avec en-têtes (Excel, Google Sheets, CSV) ---------- */

function normalizeLabel(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\((?:€|eur|euros?|h|heures?|nb|nombre)\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Intitulés courants dans les exports des logiciels de temps et des tableurs maison. */
const IMPORT_ALIASES: Record<string, string[]> = {
  OVERTIME_25: ["hs 25", "hs 25%", "hs25", "heures sup 25", "heures supplementaires 25", "heures supplementaires 25%", "h sup 25"],
  OVERTIME_50: ["hs 50", "hs 50%", "hs50", "heures sup 50", "heures supplementaires 50", "heures supplementaires 50%", "h sup 50"],
  COMPLEMENTARY_10: ["hc 10", "hc 10%", "hc10", "heures compl 10", "heures complementaires 10", "heures complementaires 10%"],
  COMPLEMENTARY_25: ["hc 25", "hc 25%", "hc25", "heures compl 25", "heures complementaires 25", "heures complementaires 25%"],
  MEAL_VOUCHERS: ["tickets restaurant", "ticket restaurant", "tr", "titres restaurant", "nb tr", "nombre de titres restaurant"],
  PUBLIC_TRANSPORT: ["transport", "navigo", "pass navigo", "abonnement transport", "remboursement transport"],
  ACTIVITY_BONUS: ["prime", "prime mensuelle", "prime d activite"],
  SALARY_ADVANCE: ["acompte", "avance sur salaire"],
  EXPENSE_KILOMETRIC: ["ik", "indemnites kilometriques", "frais kilometriques"],
  YEAR_END_BONUS: ["13e mois", "13eme mois", "treizieme mois"],
};

const IDENTITY_HEADERS = new Set(["salarie", "salaries", "nom", "nom prenom", "prenom nom", "collaborateur", "employe", "nom du salarie", "nom complet"]);
const FIRST_NAME_HEADERS = new Set(["prenom"]);
const LAST_NAME_HEADERS = new Set(["nom", "nom de famille"]);

let columnIndex: Map<string, EntryColumn> | null = null;
function importColumnIndex(): Map<string, EntryColumn> {
  if (columnIndex) return columnIndex;
  const index = new Map<string, EntryColumn>();
  for (const code of [...HOURS_CODES, ...VARIABLE_CODES]) {
    const entry = column(code);
    for (const label of [entry.header, entry.label, code, ...(IMPORT_ALIASES[code] ?? [])]) {
      const key = normalizeLabel(label);
      if (key && !index.has(key)) index.set(key, entry);
    }
  }
  columnIndex = index;
  return index;
}

/** Reconnaît une colonne d'import d'après son en-tête (intitulé RH Pilot, code ou intitulé courant). */
export function importColumnFor(header: string): EntryColumn | null {
  const key = normalizeLabel(header);
  if (!key) return null;
  return importColumnIndex().get(key) ?? null;
}

const nameKey = (text: string) => normalizeLabel(text).split(" ").filter(Boolean).sort().join(" ");

/**
 * Découpe un fichier CSV ou un bloc collé : tabulation, point-virgule (Excel
 * français) ou virgule, guillemets tolérés.
 */
export function parseDelimitedTable(text: string): string[][] {
  const content = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = content.split("\n").find((line) => line.trim() !== "") ?? "";
  const separator = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.trim() === "") { quoted = true; field = ""; }
    else if (char === separator) { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  row.push(field);
  rows.push(row);
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === "")) rows.pop();
  return rows;
}

export type ImportEmployee = { id: string; name: string; partTime: boolean };

export type ImportPlan = {
  cells: PastedCell[];
  columns: EntryColumn[];
  employeeCount: number;
  unknownHeaders: string[];
  unknownRows: string[];
  /** Valeurs ignorées : heures supplémentaires d'un temps partiel, ou l'inverse. */
  skipped: number;
  error?: string;
};

/**
 * Prépare l'import d'un tableau dont la première ligne porte les en-têtes et
 * une colonne le nom du salarié (ou deux colonnes Prénom et Nom). Les salariés
 * sont reconnus par leur nom, dans n'importe quel ordre ; les cellules vides
 * sont laissées telles quelles.
 */
export function planImport(table: string[][], employees: readonly ImportEmployee[]): ImportPlan {
  const empty: ImportPlan = { cells: [], columns: [], employeeCount: 0, unknownHeaders: [], unknownRows: [], skipped: 0 };
  if (table.length < 2) return { ...empty, error: "Le tableau doit contenir une ligne d'en-têtes puis au moins un salarié." };
  const headers = table[0].map((header) => header.trim());
  const normalized = headers.map(normalizeLabel);

  const firstNameIndex = normalized.findIndex((header) => FIRST_NAME_HEADERS.has(header));
  const lastNameIndex = normalized.findIndex((header) => LAST_NAME_HEADERS.has(header));
  const split = firstNameIndex >= 0 && lastNameIndex >= 0 && firstNameIndex !== lastNameIndex;
  const identityIndex = split ? -1 : Math.max(0, normalized.findIndex((header) => IDENTITY_HEADERS.has(header)));
  const identityColumns = new Set(split ? [firstNameIndex, lastNameIndex] : [identityIndex]);

  const targets = new Map<number, EntryColumn>();
  const unknownHeaders: string[] = [];
  const seen = new Set<string>();
  headers.forEach((header, index) => {
    if (identityColumns.has(index) || header === "") return;
    const target = importColumnFor(header);
    if (!target || seen.has(target.code)) { unknownHeaders.push(header); return; }
    seen.add(target.code);
    targets.set(index, target);
  });
  if (targets.size === 0) return { ...empty, unknownHeaders, error: "Aucune colonne reconnue : reprenez les intitulés du tableau de saisie (par exemple « Heures sup. 25 % » ou « Prime (€) »)." };

  const byName = new Map<string, ImportEmployee | null>();
  for (const employee of employees) {
    const key = nameKey(employee.name);
    byName.set(key, byName.has(key) ? null : employee);
  }

  const cells: PastedCell[] = [];
  const unknownRows: string[] = [];
  const matched = new Set<string>();
  let skipped = 0;
  for (const line of table.slice(1)) {
    const label = (split ? `${line[firstNameIndex] ?? ""} ${line[lastNameIndex] ?? ""}` : line[identityIndex] ?? "").trim();
    const values = [...targets.keys()].map((index) => (line[index] ?? "").trim());
    if (!label && values.every((value) => value === "")) continue;
    const employee = label ? byName.get(nameKey(label)) : undefined;
    if (!employee) { unknownRows.push(label || "(ligne sans nom)"); continue; }
    for (const [index, target] of targets) {
      const raw = (line[index] ?? "").trim();
      if (raw === "") continue;
      if (cellDisabledReason(target, employee.partTime)) { skipped += 1; continue; }
      cells.push({ employeeId: employee.id, code: target.code, raw });
      matched.add(employee.id);
    }
  }
  const columns = [...targets.values()].filter((target) => cells.some((cell) => cell.code === target.code));
  return { cells, columns, employeeCount: matched.size, unknownHeaders, unknownRows, skipped };
}
