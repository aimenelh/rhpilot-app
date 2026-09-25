// Salutation selon l'heure du navigateur (jamais celle du serveur, qui tourne
// en UTC) : à appeler après le montage.
export function greetingFor(date: Date): "Bonjour" | "Bonsoir" {
  const hour = date.getHours();
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

const GENERIC_LOCALS = /^(contact|info|infos|rh|admin|hello|bonjour|direction|compta|accueil|office|mail|test|paie|drh|service|equipe|team|support)$/;

// Prénom deviné depuis une adresse « prenom.nom@… » uniquement : « jdupont@ »
// donnerait « Jdupont », mieux vaut ne rien afficher.
export function firstNameFromEmail(email: string): string {
  const match = email.trim().toLowerCase().match(/^([^@\s]+)@[^@\s]+\.[a-z]{2,}$/);
  if (!match) return "";
  const parts = match[1].split(/[._-]/).filter(Boolean);
  const first = parts[0] ?? "";
  if (parts.length < 2 || first.length < 3 || !/^[a-zà-ÿ]+$/.test(first) || GENERIC_LOCALS.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}
