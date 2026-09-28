/**
 * Effectif retenu pour les seuils de cotisations (11 et 50 salariés : FNAL,
 * versement mobilité, contribution formation, forfait social...), calculé à
 * partir des salariés enregistrés dans RH Pilot plutôt que saisi.
 *
 * Règles appliquées (CSS art. R130-1, qui renvoie aux art. L1111-2 et
 * L1111-3 du code du travail) :
 * - on compte les salariés sous contrat le dernier jour du mois ;
 * - les apprentis et les contrats de professionnalisation sont exclus ;
 * - les temps partiels comptent au prorata de leur horaire (151,67 h = 1).
 *
 * Limite connue : la règle de la loi Pacte (un seuil franchi à la hausse ne
 * s'applique qu'après cinq années civiles consécutives) dépend d'un
 * historique antérieur à RH Pilot ; elle se traite par l'effectif saisi.
 */

export const FULL_TIME_MONTHLY_HOURS = 151.67;

export type HeadcountEmployee = {
  contractType: string | null;
  hireDate: Date;
  contractEndDate: Date | null;
  monthlyHours: number | null;
};

const EXCLUDED_CONTRACTS = new Set(["APPRENTISSAGE", "PROFESSIONNALISATION"]);

function sameOrBefore(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) <= b.toISOString().slice(0, 10);
}

export function countThresholdHeadcount(employees: HeadcountEmployee[], lastDayOfMonth: Date): number {
  let total = 0;
  for (const employee of employees) {
    if (employee.contractType && EXCLUDED_CONTRACTS.has(employee.contractType)) continue;
    if (!sameOrBefore(employee.hireDate, lastDayOfMonth)) continue;
    if (employee.contractEndDate && !sameOrBefore(lastDayOfMonth, employee.contractEndDate)) continue;
    const hours = employee.monthlyHours;
    total += hours !== null && Number.isFinite(hours) && hours > 0 && hours < FULL_TIME_MONTHLY_HOURS ? hours / FULL_TIME_MONTHLY_HOURS : 1;
  }
  return Math.round(total * 100) / 100;
}

const THRESHOLD_EFFECTS: Record<11 | 50, string> = {
  11: "le versement mobilité, la contribution formation à 1 % et le forfait social sur la prévoyance",
  50: "le Fnal à 0,50 % et les paramètres de réduction générale des entreprises de 50 salariés et plus",
};

/**
 * Avertissement quand l'effectif calculé atteint 11 ou 50 salariés pour la
 * première fois dans RH Pilot (premier calcul, ou franchissement depuis le
 * mois précédent). C'est le seul moment où la règle des cinq ans de la loi
 * Pacte, ou la moyenne de l'année précédente, peut conduire l'Urssaf à
 * retenir un effectif plus faible. Rien ensuite : pas de message chaque mois.
 */
export function thresholdCrossingWarning(previous: number | null, current: number): string | null {
  const crossed = ([50, 11] as const).find((threshold) => current >= threshold && (previous === null || previous < threshold));
  if (!crossed) return null;
  const effects = THRESHOLD_EFFECTS[crossed];
  const lead = previous === null
    ? `Effectif calculé : ${current} salariés, soit au moins ${crossed} : ${effects} s'appliquent.`
    : `L'effectif calculé passe de ${previous} à ${current} salariés et atteint le seuil de ${crossed} : ${effects} s'appliquent désormais.`;
  return `${lead} Un seuil franchi ne compte qu'après cinq années civiles consécutives (loi Pacte) et l'Urssaf retient la moyenne de l'année précédente : si l'effectif à retenir est plus faible, indiquez-le dans Configuration > Organisation.`;
}
