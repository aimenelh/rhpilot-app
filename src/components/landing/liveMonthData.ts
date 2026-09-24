// Données et compréhension de phrases pour la simulation « 30 jours en 30 secondes ».
// Les parcours reprennent prisma/seed.ts (décalages en jours, responsables, pièces).
// Tout est calculé dans le navigateur : aucun appel réseau, aucune IA.

export type Kind = "embauche" | "fin_periode_essai" | "visite_medicale";
export type Role = "RH" | "Manager" | "Dirigeant";
export type TemplateTask = { offset: number; label: (name: string) => string; role: Role; proof?: string };

export const KINDS: Record<Kind, { label: string; color: string; tasks: TemplateTask[] }> = {
  embauche: {
    label: "Embauche",
    color: "#0F9486",
    tasks: [
      { offset: -10, label: () => "Préparer le contrat de travail", role: "RH" },
      { offset: -3, label: () => "Déclarer la DPAE", role: "RH", proof: "l’accusé de réception" },
      { offset: -2, label: () => "Préparer le poste de travail", role: "Manager" },
      { offset: -1, label: () => "Faire signer le contrat", role: "RH", proof: "le contrat signé" },
      { offset: 0, label: (n) => `Accueillir ${n}`, role: "Manager" },
      { offset: 15, label: () => "Demander la visite médicale", role: "RH" },
      { offset: 30, label: () => "Point d’intégration à 30 jours", role: "Manager" },
      { offset: 45, label: () => "Suivre la visite médicale", role: "RH" },
    ],
  },
  fin_periode_essai: {
    label: "Fin de période d’essai",
    color: "#5B4BB7",
    tasks: [
      { offset: -21, label: () => "Vérifier le délai de prévenance", role: "RH" },
      { offset: -15, label: () => "Entretien de bilan", role: "Manager", proof: "le compte-rendu" },
      { offset: -7, label: () => "Décider : confirmation ou rupture", role: "Dirigeant" },
      { offset: -3, label: () => "Formaliser la décision", role: "RH" },
      { offset: 0, label: () => "Clôturer le dossier", role: "RH" },
    ],
  },
  visite_medicale: {
    label: "Visite médicale",
    color: "#E8432E",
    tasks: [
      { offset: -30, label: () => "Identifier le type de suivi", role: "RH" },
      { offset: -21, label: () => "Prendre rendez-vous", role: "RH", proof: "la convocation" },
      { offset: -14, label: (n) => `Informer ${n} de la date`, role: "RH" },
      { offset: 0, label: () => "Confirmer la visite", role: "RH" },
      { offset: 7, label: (n) => `Mettre à jour la fiche de ${n}`, role: "RH" },
    ],
  },
};

/** Premier jour de la simulation : lundi 28 septembre 2026. */
export const START = Date.UTC(2026, 8, 28);
export const DAYS = 30;
const DAY_MS = 86_400_000;

export const dayOf = (time: number) => Math.round((time - START) / DAY_MS);
export const timeOf = (day: number) => START + day * DAY_MS;
/** Premier jour ouvré strictement après `day`. */
export const nextWorkday = (day: number) => {
  let d = day + 1;
  while ([0, 6].includes(new Date(timeOf(d)).getUTCDay())) d += 1;
  return d;
};

const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export const shortDate = (time: number) => {
  const d = new Date(time);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
};
export const longDate = (time: number) => {
  const d = new Date(time);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
};
export const dayMonth = (time: number) => {
  const d = new Date(time);
  return `${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
};

// ---------- Comprendre une phrase en français courant ----------

const MONTH_INDEX: Record<string, number> = {
  janvier: 0, janv: 0, jan: 0,
  fevrier: 1, fev: 1, fevr: 1,
  mars: 2,
  avril: 3, avr: 3,
  mai: 4,
  juin: 5,
  juillet: 6, juil: 6,
  aout: 7,
  septembre: 8, sept: 8, sep: 8,
  octobre: 9, oct: 9,
  novembre: 10, nov: 10,
  decembre: 11, dec: 11,
};
const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30,
};
const WEEKDAY_INDEX: Record<string, number> = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };

const strip = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'");

// Mots en majuscule qui ne sont pas des prénoms (début de phrase, mois, jours...).
const NOT_NAMES = new Set(
  [
    "quand", "le", "la", "les", "l", "un", "une", "notre", "nos", "mon", "ma", "mes", "nouveau", "nouvelle", "visite", "embauche",
    "fin", "periode", "essai", "rendez", "demain", "aujourd", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
    "dimanche", "dans", "rh", "pilot", "arrivee", "medecine", "il", "elle", "on", "nous", "je", "apres", "recrue", "reprise",
    "salarie", "salariee", "collaborateur", "collaboratrice", "stagiaire", "alternant", "alternante", "poste", "travail",
    ...Object.keys(MONTH_INDEX),
  ],
);

export type Parsed = { kind: Kind; name: string; first: string; time: number };
export type ParseResult = { ok: true; value: Parsed } | { ok: false; reason: "kind" | "date"; kind?: Kind; name?: string };

function findKind(s: string): Kind | undefined {
  if (/essai/.test(s)) return "fin_periode_essai";
  if (/visite|medic|medecine du travail/.test(s)) return "visite_medicale";
  if (/arriv|commence|demarr|debut|embauch|recrut|recrue|rejoint|integre|prise de poste|signe/.test(s)) return "embauche";
  return undefined;
}

function findName(original: string): string | undefined {
  const words = original.replace(/[’`]/g, "'").match(/[A-ZÀ-Ý][a-zà-ÿ-]+(?:\s[A-ZÀ-Ý][a-zà-ÿ-]+)?/g) ?? [];
  for (const word of words) {
    const first = strip(word.split(" ")[0]);
    if (!NOT_NAMES.has(first)) return word;
  }
  // « l'essai de paul » écrit sans majuscule
  for (const [, word] of strip(original).matchAll(/(?:\b(?:de|pour)\s+|\bd')([a-z][a-z-]{2,})\b/g)) {
    if (!NOT_NAMES.has(word) && !(word in NUMBER_WORDS)) return word[0].toUpperCase() + word.slice(1);
  }
  return undefined;
}

function findDate(s: string, today: number): number | undefined {
  const t = new Date(today);
  const year = t.getUTCFullYear();
  const build = (d: number, m: number, y?: number) => {
    let time = Date.UTC(y ?? year, m, d);
    if (y === undefined && time < today - 60 * DAY_MS) time = Date.UTC(year + 1, m, d);
    return Number.isNaN(time) ? undefined : time;
  };
  if (/apres-demain|apres demain/.test(s)) return today + 2 * DAY_MS;
  if (/demain/.test(s)) return today + DAY_MS;
  if (/aujourd'hui|ce matin|ce soir/.test(s)) return today;
  if (/semaine prochaine/.test(s)) return today + 7 * DAY_MS;
  if (/mois prochain/.test(s)) return today + 30 * DAY_MS;
  const rel = s.match(/dans\s+(\d+|[a-z]+)\s+(jours?|semaines?|mois)\b/);
  if (rel) {
    const n = /^\d+$/.test(rel[1]) ? parseInt(rel[1], 10) : NUMBER_WORDS[rel[1]];
    if (n) return today + n * (rel[2].startsWith("jour") ? 1 : rel[2].startsWith("sem") ? 7 : 30) * DAY_MS;
  }
  const named = s.match(/\b(\d{1,2}|1er)\s+(janvier|janv|jan|fevrier|fevr|fev|mars|avril|avr|mai|juin|juillet|juil|aout|septembre|sept|sep|octobre|oct|novembre|nov|decembre|dec)\.?(?:\s+(\d{4}))?/);
  if (named) return build(named[1] === "1er" ? 1 : parseInt(named[1], 10), MONTH_INDEX[named[2]], named[3] ? parseInt(named[3], 10) : undefined);
  const numeric = s.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (numeric) {
    const y = numeric[3] ? (numeric[3].length === 2 ? 2000 + parseInt(numeric[3], 10) : parseInt(numeric[3], 10)) : undefined;
    return build(parseInt(numeric[1], 10), parseInt(numeric[2], 10) - 1, y);
  }
  const weekday = s.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/);
  if (weekday) {
    const delta = (WEEKDAY_INDEX[weekday[1]] - t.getUTCDay() + 7) % 7 || 7;
    return today + delta * DAY_MS;
  }
  return undefined;
}

export function parseEvent(text: string, today: number): ParseResult {
  const s = strip(text);
  const kind = findKind(s);
  const found = findName(text);
  const name = found ?? "votre salarié";
  if (!kind) return { ok: false, reason: "kind", name };
  const time = findDate(s, today);
  if (time === undefined) return { ok: false, reason: "date", kind, name };
  return { ok: true, value: { kind, name, first: found ? found.split(" ")[0] : name, time } };
}
