/**
 * Effectif retenu pour les seuils de cotisations (11 et 50 salariés : FNAL,
 * versement mobilité, contribution formation, forfait social...), calculé à
 * partir des salariés enregistrés dans RH Pilot plutôt que saisi.
 *
 * Règles appliquées (CSS art. L130-1 et R130-1, qui renvoie aux art. L1111-2 et
 * L1111-3 du code du travail) :
 * - l'effectif de l'année est la moyenne des effectifs mensuels de l'année civile
 *   précédente, calculée sur les seuls mois où l'entreprise employait des salariés ;
 * - chaque salarié compte au prorata de son temps de présence dans le mois et de
 *   son horaire (151,67 h = 1) ;
 * - les apprentis et les contrats de professionnalisation sont exclus (les CDD de
 *   remplacement, contrats aidés et stagiaires aussi, mais RH Pilot ne les
 *   distingue pas encore) ;
 * - l'année de la première embauche, l'effectif est celui du dernier jour du mois
 *   de cette embauche ;
 * - loi Pacte : un seuil franchi à la hausse ne produit ses effets que lorsqu'il
 *   a été atteint ou dépassé pendant cinq années civiles consécutives. Une
 *   entreprise créée d'emblée au-dessus d'un seuil n'en bénéficie pas (BOSS).
 *
 * Sources : Urssaf, « Comment est calculé l'effectif ? » ; BOSS, effectifs.
 * Les années sans aucun salarié enregistré dans RH Pilot après la création de
 * l'entreprise sont inconnues : un avertissement invite à saisir l'effectif réel
 * dans Configuration > Organisation.
 */

export const FULL_TIME_MONTHLY_HOURS = 151.67;

export type HeadcountEmployee = {
  contractType: string | null;
  hireDate: Date;
  contractEndDate: Date | null;
  monthlyHours: number | null;
};

// CSS R130-1 : ignorer les chiffres après la deuxième décimale.
function truncateHeadcount(value: number): number {
  const scaled = value * 100;
  return Math.floor(scaled + Number.EPSILON * Math.max(1, scaled) * 4) / 100;
}

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
  return truncateHeadcount(total);
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
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}

function quotity(hours: number | null): number {
  return hours !== null && Number.isFinite(hours) && hours > 0 && hours < FULL_TIME_MONTHLY_HOURS ? hours / FULL_TIME_MONTHLY_HOURS : 1;
}

/** Effectif d'un mois : chaque salarié au prorata de sa présence dans le mois et de son horaire. */
export function monthlyHeadcount(employees: HeadcountEmployee[], year: number, month: number): number {
  const first = Math.floor(Date.UTC(year, month, 1) / DAY_MS);
  const last = Math.floor(Date.UTC(year, month + 1, 0) / DAY_MS);
  const days = last - first + 1;
  let total = 0;
  for (const employee of employees) {
    if (employee.contractType && EXCLUDED_CONTRACTS.has(employee.contractType)) continue;
    const from = Math.max(utcDay(employee.hireDate), first);
    const to = Math.min(employee.contractEndDate ? utcDay(employee.contractEndDate) : last, last);
    if (to < from) continue;
    total += ((to - from + 1) / days) * quotity(employee.monthlyHours);
  }
  return total;
}

/**
 * Moyenne des effectifs mensuels d'une année civile, sur les seuls mois où des
 * salariés étaient employés (0 si personne ne l'était de l'année).
 */
export function annualAverageHeadcount(employees: HeadcountEmployee[], year: number): number {
  const months = Array.from({ length: 12 }, (_, month) => monthlyHeadcount(employees, year, month)).filter((value) => value > 0);
  if (months.length === 0) return 0;
  return truncateHeadcount(months.reduce((sum, value) => sum + value, 0) / months.length);
}

export type ThresholdHeadcount = {
  headcount: number;
  basis: "PREVIOUS_YEAR_AVERAGE" | "FIRST_HIRE_MONTH" | "CURRENT_MONTH";
  warnings: string[];
};

function firstHireMonthEnd(employees: HeadcountEmployee[], year: number, lastDayOfMonth: Date): Date | null {
  const limit = utcDay(lastDayOfMonth);
  const hires = employees
    .filter((employee) => !(employee.contractType && EXCLUDED_CONTRACTS.has(employee.contractType)))
    .map((employee) => employee.hireDate)
    .filter((date) => date.getUTCFullYear() === year && utcDay(date) <= limit)
    .sort((a, b) => a.getTime() - b.getTime());
  const first = hires[0];
  return first ? new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)) : null;
}

/**
 * Effectif des seuils pour un mois de paie de l'année `year` : moyenne de l'année
 * précédente, plafonnée sous chaque seuil qui n'est pas atteint depuis cinq années
 * civiles consécutives. `companyCreationDate` distingue une année antérieure à la
 * création (pas de gel : création d'emblée au-dessus du seuil) d'une année
 * simplement absente de RH Pilot (inconnue, signalée).
 */
export function resolveThresholdHeadcount(
  employees: HeadcountEmployee[],
  year: number,
  lastDayOfMonth: Date,
  companyCreationDate: Date | null = null,
): ThresholdHeadcount {
  const previous = annualAverageHeadcount(employees, year - 1);
  if (previous === 0) {
    // Année de la première embauche : effectif du dernier jour du mois de cette embauche.
    const firstHireEnd = firstHireMonthEnd(employees, year, lastDayOfMonth);
    const createdBefore = companyCreationDate !== null && companyCreationDate.getUTCFullYear() < year;
    const current = countThresholdHeadcount(employees, firstHireEnd ?? lastDayOfMonth);
    const warnings = current >= 11 && (createdBefore || companyCreationDate === null)
      ? [`Effectif estimé à ${current} : aucun salarié n’est enregistré dans RH Pilot pour ${year - 1}. Si l’entreprise employait déjà du personnel cette année-là, l’Urssaf retient sa moyenne : indiquez cet effectif dans Configuration > Organisation.`]
      : [];
    return { headcount: current, basis: firstHireEnd ? "FIRST_HIRE_MONTH" : "CURRENT_MONTH", warnings };
  }

  let headcount = previous;
  const warnings: string[] = [];
  const creationYear = companyCreationDate ? companyCreationDate.getUTCFullYear() : null;
  const history = [2, 3, 4, 5].map((back) => {
    const historyYear = year - back;
    const average = annualAverageHeadcount(employees, historyYear);
    const beforeCreation = creationYear !== null && historyYear < creationYear;
    return { year: historyYear, average, unknown: average === 0 && !beforeCreation, beforeCreation };
  });
  for (const threshold of PACTE_THRESHOLDS) {
    if (headcount < threshold) continue;
    // Une année connue sous le seuil dans les quatre précédentes : le seuil n'est pas encore opposable.
    if (history.some((entry) => entry.average > 0 && entry.average < threshold)) {
      headcount = threshold - 1;
      warnings.push(`Effectif moyen ${year - 1} : ${previous}. Le seuil de ${threshold} salariés n'est pas atteint depuis cinq années civiles consécutives (loi Pacte, CSS art. L130-1) : ses effets sont différés et l'effectif retenu est de ${threshold - 1}.`);
      continue;
    }
    const unknownYears = history.filter((entry) => entry.unknown).map((entry) => entry.year).sort();
    if (unknownYears.length > 0) {
      warnings.push(`Le seuil de ${threshold} salariés est appliqué, mais aucun salarié n’est enregistré dans RH Pilot pour ${unknownYears.join(", ")}. Si l’entreprise était sous ce seuil l’une de ces années, ses effets sont différés (loi Pacte) : indiquez alors l’effectif à retenir dans Configuration > Organisation.`);
    }
  }
  return { headcount, basis: "PREVIOUS_YEAR_AVERAGE", warnings };
}
