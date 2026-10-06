/** P26V01 S21.G00.40.021 : motifs possibles d'un CDD privé ordinaire. */
export const DSN_FIXED_TERM_REASONS: Array<[string, string]> = [
  ["01", "Remplacement d'un salarié"], ["02", "Accroissement temporaire de l'activité"], ["03", "Emploi saisonnier"],
  ["04", "Contrat vendanges"], ["05", "Contrat d'usage"], ["06", "CDD à objet défini"],
  ["07", "Remplacement d'un chef d'entreprise"], ["08", "Remplacement d'un chef d'exploitation agricole"],
  ["09", "Recrutement lié à des difficultés sociales ou professionnelles"], ["10", "Complément de formation professionnelle"],
  ["12", "Remplacement d'un salarié provisoirement à temps partiel"], ["13", "Attente de la suppression définitive d'un poste"],
];

/** P26V01 S21.G00.30.025 : niveau de diplôme préparé, obligatoire pour un apprenti (dispositifs 64/65/81). */
export const DSN_PREPARED_DIPLOMA_LEVELS: Array<[string, string]> = [
  ["03", "CAP, BEP"], ["04", "Bac, brevet professionnel, brevet de technicien"], ["05", "Bac +2 : BTS, DUT, licence 2"],
  ["06", "Bac +3 ou +4 : licence, licence professionnelle, master 1"], ["07", "Bac +5 : master 2, diplôme d'ingénieur"], ["08", "Bac +8 : doctorat"],
];

/** Dispositifs de politique publique ouverts au moteur : contrat ordinaire ou apprentissage du secteur privé. */
export const DSN_PUBLIC_POLICIES: Array<[string, string]> = [
  ["99", "Non concerné"],
  ["64", "Apprentissage : entreprise artisanale ou de moins de 11 salariés"],
  ["65", "Apprentissage : entreprise d'au moins 11 salariés (hors répertoire des métiers)"],
];

export function dsnFixedTermReason(nature: string, publicPolicy: string, value: string | null | undefined): string | null {
  const reason = value?.trim() || null;
  if (nature === "02" && publicPolicy === "99") {
    if (!reason) throw new Error("DSN bloquée : le motif de recours au CDD est obligatoire. Renseignez le motif figurant sur le contrat du salarié.");
    if (!DSN_FIXED_TERM_REASONS.some(([code]) => code === reason)) throw new Error("DSN bloquée : le motif de recours n'est pas valide pour un CDD privé ordinaire.");
    return reason;
  }
  // Apprentissage (dispositifs 64/65) : motif facultatif, seul le 11 est admis (Dsn-Val S21.G00.40.021/CCH-12).
  if (["64", "65"].includes(publicPolicy) && ["01", "02"].includes(nature)) {
    if (reason && reason !== "11") throw new Error("DSN bloquée : seul le motif 11 (apprentissage) est admis pour un contrat d'apprentissage.");
    return reason;
  }
  if (reason) throw new Error("DSN bloquée : ce motif de recours est réservé à un CDD privé ordinaire dans le périmètre actuel.");
  return null;
}
