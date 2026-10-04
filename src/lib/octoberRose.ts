// Bornes de la campagne 2026 à minuit, heure de Paris (changement d'heure inclus).
export const OCTOBER_ROSE_START = Date.parse("2026-10-01T00:00:00+02:00");
export const OCTOBER_ROSE_END = Date.parse("2026-11-01T00:00:00+01:00");
export const OCTOBER_ROSE_SEEN_KEY = "rhpilot.october-rose.2026.seen.v1";
export const OCTOBER_ROSE_DONATION_URL = "https://don.ligue-cancer.net/";
export const OCTOBER_ROSE_INFORMATION_URL = "https://www.ligue-cancer.net/octobre-rose";

export function isOctoberRoseActive(now = Date.now()): boolean {
  return now >= OCTOBER_ROSE_START && now < OCTOBER_ROSE_END;
}
