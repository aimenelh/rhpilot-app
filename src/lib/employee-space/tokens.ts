import { createHash, randomBytes } from "node:crypto";

/** Durée de validité d'une invitation à l'espace salarié. */
export const INVITE_VALID_DAYS = 14;

/**
 * Jeton d'invitation : seule son empreinte est conservée en base, le jeton
 * lui-même ne circule que dans le lien envoyé au salarié.
 */
export function newInviteToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Forme attendue d'un jeton (évite une requête pour une URL fantaisiste). */
export function isPlausibleInviteToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** Redirection après connexion : uniquement vers l'espace salarié, jamais vers un autre site. */
export function safeEspaceRedirect(raw: unknown, fallback = "/espace"): string {
  if (typeof raw !== "string") return fallback;
  if (!/^\/espace(\/[A-Za-z0-9/_-]*)?$/.test(raw)) return fallback;
  if (raw.startsWith("/espace/connexion") || raw.startsWith("/espace/inscription")) return fallback;
  return raw;
}
