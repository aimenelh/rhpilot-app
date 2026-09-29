/**
 * Diagnostic RH public (/diagnostic) : vocabulaire partagé entre le quiz (client)
 * et l'enregistrement (serveur), pour que le serveur ne stocke que des réponses connues.
 */

export const DIAGNOSTIC_ANSWER_KEYS = ["periodeEssai", "visiteMedicale", "responsabilites", "entretienPro", "surcharge", "companySize"] as const;
export type DiagnosticAnswerKey = (typeof DIAGNOSTIC_ANSWER_KEYS)[number];
export type DiagnosticAnswers = Record<DiagnosticAnswerKey, string>;

export const RISK_AREA_TEXT: Record<string, { label: string; tip: string }> = {
  "periode-essai": {
    label: "Suivi des périodes d'essai",
    tip: "RH Pilot calcule automatiquement le délai de prévenance et vous alerte avant l'échéance, pas après.",
  },
  "visite-medicale": {
    label: "Visites médicales d'embauche",
    tip: "Un parcours dédié déclenche le suivi dès la prise de poste, avec un rappel avant les trois mois.",
  },
  responsabilites: {
    label: "Répartition des responsabilités",
    tip: "Chaque tâche a un responsable visible, jamais deviné au dernier moment.",
  },
  "entretien-pro": {
    label: "Entretiens professionnels",
    tip: "RH Pilot vous rappelle l'échéance des 2 ans avant qu'elle ne devienne un risque de sanction.",
  },
  surcharge: {
    label: "Charge administrative",
    tip: "Moins de relances manuelles à faire soi-même, plus de temps pour le reste.",
  },
};

const MAX_ANSWER_LENGTH = 80;

/** Réponses nettoyées, ou null si la forme ne correspond pas au quiz. */
export function parseDiagnostic(answers: unknown, riskAreas: unknown): { answers: DiagnosticAnswers; riskAreas: string[] } | null {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const source = answers as Record<string, unknown>;
  if (Object.keys(source).length !== DIAGNOSTIC_ANSWER_KEYS.length) return null;
  const clean = {} as DiagnosticAnswers;
  for (const key of DIAGNOSTIC_ANSWER_KEYS) {
    const value = source[key];
    if (typeof value !== "string" || value.length === 0 || value.length > MAX_ANSWER_LENGTH) return null;
    clean[key] = value;
  }
  if (!Array.isArray(riskAreas) || riskAreas.length > Object.keys(RISK_AREA_TEXT).length) return null;
  const areas = Array.from(new Set(riskAreas));
  if (!areas.every((area) => typeof area === "string" && area in RISK_AREA_TEXT)) return null;
  return { answers: clean, riskAreas: areas as string[] };
}

export function isPlausibleEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(value);
}
