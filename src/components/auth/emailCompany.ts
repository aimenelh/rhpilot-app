// Devine un nom d'entreprise à partir de l'adresse e-mail saisie à l'inscription
// (« sofia@boulangerie-martin.fr » → « Boulangerie Martin »). Uniquement pour
// l'aperçu : rien n'est enregistré, le vrai nom est demandé juste après.

const GENERIC_DOMAINS = new Set([
  "gmail", "googlemail", "outlook", "hotmail", "live", "msn", "yahoo", "ymail", "icloud", "me", "mac", "aol",
  "orange", "wanadoo", "free", "sfr", "neuf", "laposte", "bbox", "numericable", "proton", "protonmail", "pm",
  "gmx", "zoho", "mail", "email", "yandex", "tutanota", "hey", "fastmail",
]);

const SMALL_WORDS = new Set(["de", "du", "des", "la", "le", "les", "et", "en", "au", "aux", "sur"]);

export function companyFromEmail(email: string): string | null {
  const match = email.trim().toLowerCase().match(/^[^@\s]+@([a-z0-9.-]+)\.[a-z]{2,}$/);
  if (!match) return null;
  const parts = match[1].split(".");
  const label = parts[parts.length - 1];
  if (!label || label.length < 3 || GENERIC_DOMAINS.has(label)) return null;
  return label
    .split("-")
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      if (!/[aeiouyéèà]/.test(word)) return word.toUpperCase(); // rh, btp, sncf
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}
