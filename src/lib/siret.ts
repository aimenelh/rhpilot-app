/**
 * Validation d'un numéro SIRET (14 chiffres) : format et clé de contrôle.
 * Module pur, partagé par le formulaire de création et l'API.
 *
 * La clé est celle de Luhn sur les 14 chiffres. Exception : les
 * établissements de La Poste (SIREN 356 000 000) ont des SIRET dont la
 * somme des chiffres est multiple de 5 (le siège, lui, respecte Luhn).
 */

const LA_POSTE_SIREN = "356000000";

export function normalizeSiret(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/[\s. -]/g, "") : "";
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let value = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return sum % 10 === 0;
}

export type SiretCheck = { ok: true; siret: string } | { ok: false; error: string };

export function checkSiret(raw: unknown): SiretCheck {
  const siret = normalizeSiret(raw);
  if (!siret) return { ok: false, error: "Le SIRET de l'entreprise est obligatoire." };
  if (!/^\d{14}$/.test(siret)) return { ok: false, error: "Le SIRET doit contenir exactement 14 chiffres." };
  const valid = luhnValid(siret) || (siret.startsWith(LA_POSTE_SIREN) && siret.split("").reduce((total, digit) => total + Number(digit), 0) % 5 === 0);
  if (!valid) return { ok: false, error: "Ce SIRET n'est pas valide : vérifiez les 14 chiffres (avis de situation Insee, Kbis ou bulletin de paie)." };
  return { ok: true, siret };
}
