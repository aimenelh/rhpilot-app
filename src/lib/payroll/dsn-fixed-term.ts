/** P26V01 S21.G00.40.021 : motifs possibles d'un CDD privé ordinaire. */
export const DSN_FIXED_TERM_REASONS: Array<[string, string]> = [
  ["01", "Remplacement d'un salarié"], ["02", "Accroissement temporaire de l'activité"], ["03", "Emploi saisonnier"],
  ["04", "Contrat vendanges"], ["05", "Contrat d'usage"], ["06", "CDD à objet défini"],
  ["07", "Remplacement d'un chef d'entreprise"], ["08", "Remplacement d'un chef d'exploitation agricole"],
  ["09", "Recrutement lié à des difficultés sociales ou professionnelles"], ["10", "Complément de formation professionnelle"],
  ["12", "Remplacement d'un salarié provisoirement à temps partiel"], ["13", "Attente de la suppression définitive d'un poste"],
];

export function dsnFixedTermReason(nature: string, publicPolicy: string, value: string | null | undefined): string | null {
  const reason = value?.trim() || null;
  if (nature === "02" && publicPolicy === "99") {
    if (!reason) throw new Error("DSN bloquée : le motif de recours au CDD est obligatoire. Renseignez le motif figurant sur le contrat du salarié.");
    if (!DSN_FIXED_TERM_REASONS.some(([code]) => code === reason)) throw new Error("DSN bloquée : le motif de recours n'est pas valide pour un CDD privé ordinaire.");
    return reason;
  }
  if (reason) throw new Error("DSN bloquée : ce motif de recours est réservé à un CDD privé ordinaire dans le périmètre actuel.");
  return null;
}
