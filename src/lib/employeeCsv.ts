export type ParsedEmployeeRow = {
  firstName: string;
  lastName: string;
  civility: "MME" | "M" | "AUTRE" | null;
  position: string | null;
  hireDate: Date;
  contractType: "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION" | null;
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
const VALID_UNITS = ["DAYS", "WEEKS", "MONTHS"];

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
 * attendu : prenom,nom,civilite,poste,date_embauche,type_contrat,
 * duree_periode_essai,unite_duree,prochaine_visite_medicale
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
    hireDate: colIndex("date_embauche"),
    contractType: colIndex("type_contrat"),
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

    const hireDate = new Date(hireDateRaw);
    if (!hireDateRaw || Number.isNaN(hireDate.getTime())) {
      errors.push({
        line: lineNumber,
        message: `Date d'embauche invalide ("${hireDateRaw}"), ligne ignorée.`,
      });
      continue;
    }

    const civilityRaw = get(idx.civility).toUpperCase();
    const contractRaw = get(idx.contractType).toUpperCase();
    const unitRaw = get(idx.probationDurationUnit).toUpperCase();
    const durationRaw = get(idx.probationDuration);
    const medicalRaw = get(idx.nextMedicalVisitDate);

    let nextMedicalVisitDate: Date | null = null;
    if (medicalRaw) {
      const parsed = new Date(medicalRaw);
      if (Number.isNaN(parsed.getTime())) {
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
      hireDate,
      contractType: VALID_CONTRACTS.includes(contractRaw)
        ? (contractRaw as ParsedEmployeeRow["contractType"])
        : null,
      probationDuration: durationRaw ? Number(durationRaw) : null,
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
