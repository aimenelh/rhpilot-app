import { checkSiret } from "../siret";

export function dsnOpsSiret(value: string, label: string): string {
  const normalized = value.replace(/\s+/g, "");
  const checked = checkSiret(normalized);
  if (!checked.ok) throw new Error(`DSN bloquée : ${label} : ${checked.error}`);
  return normalized;
}

/** IBAN français : contrôle de format, de longueur et de la clé ISO 13616. */
export function dsnPaymentIban(value: string): string {
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  if (!/^FR\d{12}[A-Z0-9]{11}\d{2}$/.test(normalized)) throw new Error("DSN bloquée : renseignez un IBAN français valide de 27 caractères.");
  const reordered = normalized.slice(4) + normalized.slice(0, 4);
  let remainder = 0;
  for (const character of reordered) {
    const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  if (remainder !== 1) throw new Error("DSN bloquée : la clé de contrôle de l'IBAN est invalide.");
  return normalized;
}
export function dsnPaymentBic(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized)) throw new Error("DSN bloquée : le BIC doit contenir 8 ou 11 caractères valides.");
  return normalized;
}
