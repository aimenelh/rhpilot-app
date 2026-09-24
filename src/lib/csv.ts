/**
 * Échappe une cellule CSV et neutralise les formules Excel/LibreOffice.
 * Les champs salariés sont des données, jamais des formules à exécuter.
 */
export function escapeCsvField(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);

  if (/^[\t\r ]*[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
