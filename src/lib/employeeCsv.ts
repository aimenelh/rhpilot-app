import { parseIsoDateOnly } from "@/lib/dateOnly";
import { buildContractWorkTime } from "@/lib/contractWorkTime";

export type ParsedEmployeeRow = {
  firstName: string;
  lastName: string;
  civility: "MME" | "M" | "AUTRE" | null;
  position: string | null;
  professionalCategory: "CADRE" | "AGENT_DE_MAITRISE" | "EMPLOYE" | "OUVRIER" | "AUTRE" | null;
  hireDate: Date;
  contractType: "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION" | null;
  contractEndDate: Date | null;
  weeklyHours: number | null;
  weeklySchedule: number[] | null;
  baseSalaryCents: number | null;
  probationDuration: number | null;
  probationDurationUnit: "DAYS" | "WEEKS" | "MONTHS" | null;
  nextMedicalVisitDate: Date | null;
};

export type CsvParseError = { line: number; message: string };

export type CsvParseResult = {
  rows: ParsedEmployeeRow[];
  errors: CsvParseError[];
};

const VALID_CIVILITIES = ["MME", "M", "AUTRE"];
const VALID_CONTRACTS = ["CDI", "CDD", "APPRENTISSAGE", "PROFESSIONNALISATION"];
const VALID_CATEGORIES = ["CADRE", "AGENT_DE_MAITRISE", "EMPLOYE", "OUVRIER", "AUTRE"];
const VALID_UNITS = ["DAYS", "WEEKS", "MONTHS"];
const DAY_HEADERS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Analyse une ligne CSV en tenant compte des guillemets (pour les champs contenant une virgule). */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((cell) => cell.trim());
}

/**
 * Format fixe RH Pilot uniquement (pas d'import PayFit/Lucca/Silae —
 * volontairement hors périmètre, voir décision produit). En-tête
 * attendu historiquement : prenom,nom,civilite,poste,date_embauche,type_contrat,
 * duree_periode_essai,unite_duree,prochaine_visite_medicale.
 *
 * Le format enrichi accepte aussi : categorie_professionnelle, date_fin_contrat,
 * heures_hebdomadaires, lundi...dimanche et salaire_brut_mensuel.
 * Les anciens fichiers restent compatibles : aucune durée de travail n'est alors inventée.
 *
 * Une ligne individuellement invalide est ignorée avec un message
 * précis, sans annuler l'import des lignes valides — un import
 * partiel réussi vaut mieux qu'un rejet total pour une seule erreur.
 */
export function parseEmployeeCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: [{ line: 0, message: "Aucun contenu détecté." }] };
  }

  const headerCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const colIndex = (name: string) => headerCells.indexOf(name);

  const idx = {
    firstName: colIndex("prenom"),
    lastName: colIndex("nom"),
    civility: colIndex("civilite"),
    position: colIndex("poste"),
    professionalCategory: colIndex("categorie_professionnelle"),
    hireDate: colIndex("date_embauche"),
    contractType: colIndex("type_contrat"),
    contractEndDate: colIndex("date_fin_contrat"),
    weeklyHours: colIndex("heures_hebdomadaires"),
    days: DAY_HEADERS.map(colIndex),
    baseSalary: colIndex("salaire_brut_mensuel"),
    probationDuration: colIndex("duree_periode_essai"),
    probationDurationUnit: colIndex("unite_duree"),
    nextMedicalVisitDate: colIndex("prochaine_visite_medicale"),
  };

  if (idx.firstName === -1 || idx.lastName === -1 || idx.hireDate === -1) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message:
            "En-têtes manquants (au minimum : prenom, nom, date_embauche, première ligne du fichier).",
        },
      ],
    };
  }

  const rows: ParsedEmployeeRow[] = [];
  const errors: CsvParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const cells = parseCsvLine(lines[i]);
    const get = (index: number) => (index >= 0 && index < cells.length ? cells[index].trim() : "");

    const firstName = get(idx.firstName);
    const lastName = get(idx.lastName);
    const hireDateRaw = get(idx.hireDate);

    if (!firstName || !lastName) {
      errors.push({ line: lineNumber, message: "Prénom ou nom manquant, ligne ignorée." });
      continue;
    }

    const hireDate = parseIsoDateOnly(hireDateRaw);
    if (!hireDate) {
      errors.push({
        line: lineNumber,
        message: `Date d'embauche invalide ("${hireDateRaw}"), ligne ignorée.`,
      });
      continue;
    }

    const civilityRaw = get(idx.civility).toUpperCase();
    const categoryRaw = get(idx.professionalCategory).toUpperCase();
    const contractRaw = get(idx.contractType).toUpperCase();
    const contractEndRaw = get(idx.contractEndDate);
    const unitRaw = get(idx.probationDurationUnit).toUpperCase();
    const durationRaw = get(idx.probationDuration);
    const medicalRaw = get(idx.nextMedicalVisitDate);

    if (civilityRaw && !VALID_CIVILITIES.includes(civilityRaw)) {
      errors.push({ line: lineNumber, message: `Civilité invalide ("${civilityRaw}"), ligne ignorée.` });
      continue;
    }
    if (categoryRaw && !VALID_CATEGORIES.includes(categoryRaw)) {
      errors.push({ line: lineNumber, message: `Catégorie professionnelle invalide ("${categoryRaw}"), ligne ignorée.` });
      continue;
    }
    if (contractRaw && !VALID_CONTRACTS.includes(contractRaw)) {
      errors.push({ line: lineNumber, message: `Type de contrat invalide ("${contractRaw}"), ligne ignorée.` });
      continue;
    }

    let contractEndDate: Date | null = null;
    if (contractEndRaw) {
      contractEndDate = parseIsoDateOnly(contractEndRaw);
      if (!contractEndDate) {
        errors.push({ line: lineNumber, message: `Date de fin de contrat invalide ("${contractEndRaw}"), ligne ignorée.` });
        continue;
      }
      if (contractEndDate < hireDate) {
        errors.push({ line: lineNumber, message: "La date de fin de contrat est antérieure à la date d'embauche, ligne ignorée." });
        continue;
      }
    }

    const weeklyRaw = get(idx.weeklyHours).replace(",", ".");
    const dayRaw = idx.days.map((index) => get(index).replace(",", "."));
    const hasDailySchedule = dayRaw.some((value) => value !== "");
    let weeklyHours: number | null = null;
    let weeklySchedule: number[] | null = null;

    if (weeklyRaw || hasDailySchedule) {
      const parsedDays = hasDailySchedule
        ? dayRaw.map((value) => (value === "" ? 0 : Number(value)))
        : null;
      if (parsedDays && parsedDays.some((value) => !Number.isFinite(value))) {
        errors.push({ line: lineNumber, message: "Une durée journalière est invalide, ligne ignorée." });
        continue;
      }
      const parsedWeekly = weeklyRaw
        ? Number(weeklyRaw)
        : (parsedDays ?? []).reduce((sum, value) => sum + value, 0);
      try {
        const work = buildContractWorkTime(parsedWeekly, parsedDays);
        weeklyHours = work.weeklyHours;
        weeklySchedule = [...work.schedule];
      } catch (error) {
        errors.push({
          line: lineNumber,
          message: `${error instanceof Error ? error.message : "Temps de travail invalide."} Ligne ignorée.`,
        });
        continue;
      }
    }

    const salaryRaw = get(idx.baseSalary).replace(",", ".");
    let baseSalaryCents: number | null = null;
    if (salaryRaw) {
      const salary = Number(salaryRaw);
      if (!Number.isFinite(salary) || salary < 0 || salary > 1_000_000) {
        errors.push({ line: lineNumber, message: `Salaire brut mensuel invalide ("${salaryRaw}"), ligne ignorée.` });
        continue;
      }
      if (weeklyHours === null) {
        errors.push({ line: lineNumber, message: "Un salaire brut est renseigné mais le temps de travail contractuel manque, ligne ignorée." });
        continue;
      }
      baseSalaryCents = Math.round(salary * 100);
    }

    let probationDuration: number | null = null;
    if (durationRaw) {
      const parsedDuration = Number(durationRaw);
      if (
        !Number.isInteger(parsedDuration) ||
        parsedDuration < 0 ||
        parsedDuration > 365
      ) {
        errors.push({
          line: lineNumber,
          message: `Durée de période d'essai invalide ("${durationRaw}"), ligne ignorée.`,
        });
        continue;
      }
      probationDuration = parsedDuration;
    }

    let nextMedicalVisitDate: Date | null = null;
    if (medicalRaw) {
      const parsed = parseIsoDateOnly(medicalRaw);
      if (!parsed) {
        errors.push({
          line: lineNumber,
          message: `Date de visite médicale invalide ("${medicalRaw}"), ignorée : salarié importé sans cette date.`,
        });
      } else {
        nextMedicalVisitDate = parsed;
      }
    }

    rows.push({
      firstName,
      lastName,
      civility: VALID_CIVILITIES.includes(civilityRaw)
        ? (civilityRaw as ParsedEmployeeRow["civility"])
        : null,
      position: get(idx.position) || null,
      professionalCategory: VALID_CATEGORIES.includes(categoryRaw)
        ? (categoryRaw as ParsedEmployeeRow["professionalCategory"])
        : null,
      hireDate,
      contractType: VALID_CONTRACTS.includes(contractRaw)
        ? (contractRaw as ParsedEmployeeRow["contractType"])
        : null,
      contractEndDate,
      weeklyHours,
      weeklySchedule,
      baseSalaryCents,
      probationDuration,
      probationDurationUnit: durationRaw
        ? VALID_UNITS.includes(unitRaw)
          ? (unitRaw as ParsedEmployeeRow["probationDurationUnit"])
          : "MONTHS"
        : null,
      nextMedicalVisitDate,
    });
  }

  return { rows, errors };
}
