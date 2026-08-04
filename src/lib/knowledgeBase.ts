import { FAQ_ENTRIES } from "@/lib/faq";

export type KnowledgeEntry = {
  id: string;
  type: "faq" | "action";
  title: string;
  description: string;
  category: string;
  keywords: string[];
  href: string;
};

// Actions rapides : le deuxième type de contenu de la base de
// connaissances, en plus des questions/réponses — c'est ce qui permet
// à une recherche comme "embauche" de proposer à la fois une
// explication ET un raccourci vers l'action correspondante. Demain,
// "documentation d'un parcours" ou "tutoriel" s'ajoutera ici comme un
// troisième type, sans rien changer à la façon dont l'assistant
// cherche ou affiche les résultats.
const QUICK_ACTIONS: KnowledgeEntry[] = [
  {
    id: "action-new-employee",
    type: "action",
    title: "Ajouter un salarié",
    description: "Créer une nouvelle fiche salarié.",
    category: "Actions rapides",
    keywords: ["ajouter", "créer", "nouveau", "salarié", "embauche"],
    href: "/dashboard/employees/new",
  },
  {
    id: "action-employees-list",
    type: "action",
    title: "Voir les salariés",
    description: "Consulter la liste de vos salariés.",
    category: "Actions rapides",
    keywords: ["salariés", "liste", "employés"],
    href: "/dashboard/employees",
  },
  {
    id: "action-events-list",
    type: "action",
    title: "Voir les parcours RH",
    description: "Consulter tous les parcours en cours (embauche, période d'essai, visite médicale...).",
    category: "Actions rapides",
    keywords: ["parcours", "événements", "embauche", "période d'essai", "visite médicale"],
    href: "/dashboard/events",
  },
  {
    id: "action-notifications",
    type: "action",
    title: "Voir les notifications envoyées",
    description: "Consulter l'historique des rappels et résumés.",
    category: "Actions rapides",
    keywords: ["notifications", "rappels", "emails", "historique"],
    href: "/dashboard/notifications",
  },
  {
    id: "action-settings",
    type: "action",
    title: "Modifier mes préférences de notification",
    description: "Régler la fréquence de vos résumés par email.",
    category: "Actions rapides",
    keywords: ["paramètres", "préférences", "fréquence", "notifications"],
    href: "/dashboard/notifications",
  },
];

const FAQ_AS_KNOWLEDGE: KnowledgeEntry[] = FAQ_ENTRIES.map((entry) => ({
  id: entry.id,
  type: "faq",
  title: entry.question,
  description: entry.answer,
  category: entry.category,
  keywords: [entry.category],
  href: `/dashboard/help#${entry.id}`,
}));

const ALL_ENTRIES: KnowledgeEntry[] = [...FAQ_AS_KNOWLEDGE, ...QUICK_ACTIONS];

function getEntry(id: string): KnowledgeEntry | undefined {
  return ALL_ENTRIES.find((entry) => entry.id === id);
}

/**
 * Contrat du moteur de l'assistant — volontairement asynchrone dès
 * aujourd'hui, même si l'implémentation actuelle (recherche par
 * mots-clés) répond quasi instantanément. Un vrai appel à un LLM plus
 * tard respectera exactement la même signature : le composant
 * Assistant n'aura rien à changer, seul `localKeywordSearch` sera
 * remplacé par une nouvelle implémentation de ce même type.
 */
export type AssistantEngine = (query: string) => Promise<KnowledgeEntry[]>;

export const localKeywordSearch: AssistantEngine = async (query) => {
  return searchKnowledgeBase(query);
};

/** Recherche par mots-clés simples — pas de LLM, un score par nombre de termes trouvés. */
function searchKnowledgeBase(query: string, limit = 6): KnowledgeEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return ALL_ENTRIES.map((entry) => {
    const haystack = [entry.title, entry.description, entry.category, ...entry.keywords]
      .join(" ")
      .toLowerCase();
    const score = terms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
    return { entry, score };
  })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => result.entry);
}

const POPULAR_ENTRY_IDS = [
  "faq-how-parcours-works",
  "faq-suggestions",
  "action-new-employee",
  "faq-notifications-work",
];

// Suggestions par page — table de correspondance volontairement
// simple (chemin → identifiants pertinents), pas une vraie
// compréhension du contexte. Suffisant pour donner l'effet "il sait où
// je suis", sans faire remonter de logique métier dans l'assistant.
const CONTEXTUAL_ENTRY_IDS: { prefix: string; ids: string[] }[] = [
  {
    prefix: "/dashboard/employees",
    ids: ["faq-create-employee", "faq-manager-selection", "action-new-employee"],
  },
  {
    prefix: "/dashboard/events",
    ids: ["faq-how-parcours-works", "faq-unassigned", "faq-medical-visit"],
  },
  {
    prefix: "/dashboard/notifications",
    ids: ["faq-notifications-work", "faq-notifications-history", "action-settings"],
  },
];

export function getContextualEntries(pathname: string): KnowledgeEntry[] {
  const match = CONTEXTUAL_ENTRY_IDS.find((entry) => pathname.startsWith(entry.prefix));
  const ids = match?.ids ?? POPULAR_ENTRY_IDS;
  return ids.map(getEntry).filter((entry): entry is KnowledgeEntry => Boolean(entry));
}
