/**
 * Choix du profil de paie d'un salarié pour un mois donné.
 *
 * Un changement de salaire crée un nouveau profil ; l'ancien se termine la veille.
 * Dans le mois du changement, les deux profils se suivent : le salaire de base du
 * mois est alors la moyenne des deux, pondérée par les jours calendaires couverts
 * par chacun (méthode du prorata calendaire). Les autres éléments (horaire,
 * classification, ancienneté) sont ceux du profil le plus récent.
 *
 * Seul un vrai chevauchement (un profil explicitement terminé après le début du
 * suivant) bloque le calcul, car il faudrait alors choisir arbitrairement.
 * Les profils enregistrés avant ce correctif se terminaient le jour même du
 * suivant : cette frontière est tolérée.
 */

export type ProfileSpan = {
  id: string;
  baseSalaryCents: number | null;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

export type PeriodProfileSelection<T extends ProfileSpan> =
  | { ok: true; profile: T; baseSalaryCents: number | null; warning: string | null }
  | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}

function frDay(index: number): string {
  const date = new Date(index * DAY_MS);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const euros = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);

/** Le calcul mensuel ne sait pas encore appliquer deux horaires contractuels différents. */
export function assertPeriodWorkTimeStable<T extends ProfileSpan>(profiles: readonly T[], periodFirst: Date, periodLast: Date, contractKey: (profile: T) => string): void {
  const sorted = [...profiles].sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
  const keys = new Set<string>();
  for (let i = 0; i < sorted.length; i += 1) {
    const profile = sorted[i];
    const next = sorted[i + 1];
    const from = Math.max(dayIndex(profile.effectiveFrom), dayIndex(periodFirst));
    const until = Math.min(profile.effectiveUntil ? dayIndex(profile.effectiveUntil) : Infinity, next ? dayIndex(next.effectiveFrom) - 1 : Infinity, dayIndex(periodLast));
    if (from <= until) keys.add(contractKey(profile));
  }
  if (keys.size > 1) throw new Error("Le temps de travail ou le planning change en cours de mois. Le moteur doit traiter les deux périodes contractuelles avant de calculer ce bulletin ; il ne peut pas appliquer le dernier horaire au mois entier.");
}

export function selectPeriodProfile<T extends ProfileSpan>(profiles: T[], periodFirst: Date, periodLast: Date): PeriodProfileSelection<T> {
  if (profiles.length === 0) return { ok: false, error: "Aucun profil paie applicable." };
  const sorted = [...profiles].sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
  if (sorted.length === 1) return { ok: true, profile: sorted[0], baseSalaryCents: sorted[0].baseSalaryCents, warning: null };

  const first = dayIndex(periodFirst);
  const last = dayIndex(periodLast);
  const spans: { profile: T; from: number; to: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const profile = sorted[i];
    const next = sorted[i + 1];
    const start = dayIndex(profile.effectiveFrom);
    let end = profile.effectiveUntil ? dayIndex(profile.effectiveUntil) : Number.POSITIVE_INFINITY;
    if (next) {
      const nextStart = dayIndex(next.effectiveFrom);
      if (end !== Number.POSITIVE_INFINITY && end > nextStart) {
        return { ok: false, error: `deux profils paie se chevauchent (l'un court jusqu'au ${frDay(end)}, l'autre commence le ${frDay(nextStart)}). Corrigez les dates dans l'onglet Paie de la fiche.` };
      }
      // Profil resté ouvert ou terminé le jour même du suivant : il s'arrête la veille.
      end = Math.min(end, nextStart - 1);
    }
    const from = Math.max(start, first);
    const to = Math.min(end, last);
    if (to >= from) spans.push({ profile, from, to });
  }

  if (spans.length === 0) return { ok: false, error: "Aucun profil paie applicable." };
  const latest = spans[spans.length - 1].profile;
  if (spans.length === 1) return { ok: true, profile: latest, baseSalaryCents: latest.baseSalaryCents, warning: null };
  if (spans.some((span) => span.profile.baseSalaryCents === null)) return { ok: true, profile: latest, baseSalaryCents: null, warning: null };

  const totalDays = spans.reduce((sum, span) => sum + (span.to - span.from + 1), 0);
  const weighted = spans.reduce((sum, span) => sum + (span.profile.baseSalaryCents as number) * (span.to - span.from + 1), 0);
  const baseSalaryCents = Math.round(weighted / totalDays);
  const steps = spans.map((span) => `${euros(span.profile.baseSalaryCents as number)} du ${frDay(span.from)} au ${frDay(span.to)}`).join(", puis ");
  return {
    ok: true,
    profile: latest,
    baseSalaryCents,
    warning: `Salaire modifié en cours de mois : salaire de base proratisé sur les jours calendaires (${steps}), soit ${euros(baseSalaryCents)}.`,
  };
}

/** Veille du jour donné (fin d'un profil remplacé par un autre à cette date). */
export function dayBefore(date: Date): Date {
  return new Date((dayIndex(date) - 1) * DAY_MS);
}
