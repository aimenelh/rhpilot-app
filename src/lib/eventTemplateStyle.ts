// Un cerveau reconnaît une couleur avant un texte (retour produit).
// Mappage explicite par clé de gabarit plutôt que dynamique, pour
// garder la main sur l'identité visuelle de chaque parcours. Un futur
// gabarit non listé ici (V2) reçoit une couleur neutre par défaut,
// sans jamais planter.
const EVENT_TEMPLATE_DOT_COLORS: Record<string, string> = {
  embauche: "bg-accent-teal",
  fin_periode_essai: "bg-accent-amber",
  visite_medicale: "bg-brand-blue",
};

export function getEventTemplateDotColor(key: string) {
  return EVENT_TEMPLATE_DOT_COLORS[key] ?? "bg-brand-blue";
}
