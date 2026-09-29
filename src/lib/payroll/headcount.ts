/**
 * Effectif retenu pour les seuils de cotisations (11 et 50 salariés : FNAL,
 * versement mobilité, contribution formation, forfait social...), calculé à
 * partir des salariés enregistrés dans RH Pilot plutôt que saisi.
 *
 * Règles appliquées (CSS art. L130-1 et R130-1, qui renvoie aux art. L1111-2 et
 * L1111-3 du code du travail) :
 * - l'effectif de l'année est la moyenne des effectifs de chaque mois de l'année
 *   civile précédente ; celui d'un mois se compte au dernier jour du mois ;
 * - les apprentis et les contrats de professionnalisation sont exclus ;
 * - les temps partiels comptent au prorata de leur horaire (151,67 h = 1) ;
 * - loi Pacte : un seuil franchi à la hausse ne produit ses effets que lorsqu'il
 *   a été atteint ou dépassé pendant cinq années civiles consécutives.
 *
 * Sans historique pour l'année précédente dans RH Pilot (création, ou salariés
 * saisis récemment), l'effectif du mois sert d'estimation et un avertissement
 * invite à saisir l'effectif réel dans Configuration > Organisation.
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

const PACTE_THRESHOLDS = [50, 20, 11] as const;

function monthEnds(year: number): Date[] {
  return Array.from({ length: 12 }, (_, month) => new Date(Date.UTC(year, month + 1, 0, 12)));
}

/** Moyenne des effectifs de fin de mois d'une année civile (0 si personne n'était sous contrat). */
export function annualAverageHeadcount(employees: HeadcountEmployee[], year: number): number {
  const total = monthEnds(year).reduce((sum, day) => sum + countThresholdHeadcount(employees, day), 0);
  return Math.round((total / 12) * 100) / 100;
}

export type ThresholdHeadcount = {
  headcount: number;
  basis: "PREVIOUS_YEAR_AVERAGE" | "CURRENT_MONTH";
  warnings: string[];
};

/**
 * Effectif des seuils pour un mois de paie de l'année `year` : moyenne de l'année
 * précédente, plafonnée sous chaque seuil qui n'est pas atteint depuis cinq années
 * civiles consécutives (années sans historique dans RH Pilot : non opposables).
 */
export function resolveThresholdHeadcount(employees: HeadcountEmployee[], year: number, lastDayOfMonth: Date): ThresholdHeadcount {
  const previous = annualAverageHeadcount(employees, year - 1);
  if (previous === 0) {
    const current = countThresholdHeadcount(employees, lastDayOfMonth);
    const warnings = current >= 11
      ? [`Effectif estimé à ${current} sur le mois en cours : RH Pilot n'a pas de salariés enregistrés pour ${year - 1}. L'Urssaf retient la moyenne de l'année précédente ; si l'entreprise employait déjà du personnel, indiquez cet effectif dans Configuration > Organisation.`]
      : [];
    return { headcount: current, basis: "CURRENT_MONTH", warnings };
  }

  let headcount = previous;
  const warnings: string[] = [];
  const history = [2, 3, 4, 5].map((back) => annualAverageHeadcount(employees, year - back));
  for (const threshold of PACTE_THRESHOLDS) {
    if (headcount < threshold) continue;
    // Une année connue sous le seuil dans les quatre précédentes : le seuil n'est pas encore opposable.
    const belowInKnownYear = history.some((average) => average > 0 && average < threshold);
    if (belowInKnownYear) {
      headcount = threshold - 1;
      warnings.push(`Effectif moyen ${year - 1} : ${previous}. Le seuil de ${threshold} salariés n'est pas atteint depuis cinq années civiles consécutives (loi Pacte, CSS art. L130-1) : ses effets sont différés et l'effectif retenu est de ${threshold - 1}.`);
    }
  }
  return { headcount, basis: "PREVIOUS_YEAR_AVERAGE", warnings };
}
