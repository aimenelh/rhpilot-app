import { createHash, randomBytes } from "node:crypto";

/**
 * Jetons d'invitation d'équipe : seule leur empreinte SHA-256 est stockée, le jeton
 * lui-même ne circule que dans le lien envoyé par e-mail. Une fuite de la base ne
 * permet donc pas de rejoindre une organisation. Les invitations créées avant ce
 * changement (jeton en clair) restent acceptées jusqu'à leur expiration.
 */
const PREFIX = "sha256:";

export function hashInvitationToken(token: string): string {
  return PREFIX + createHash("sha256").update(token).digest("hex");
}

export function newInvitationToken(): { token: string; stored: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, stored: hashInvitationToken(token) };
}

/**
 * Condition de recherche d'une invitation à partir du jeton reçu dans le lien.
 * La comparaison en clair ne sert qu'aux anciens jetons (UUID) : une valeur qui
 * ressemble à une empreinte stockée n'est jamais acceptée telle quelle, sinon une
 * fuite de la base redonnerait des liens d'invitation valides.
 */
export function invitationTokenWhere(token: string) {
  const hashed = { token: hashInvitationToken(token) };
  if (token.startsWith(PREFIX)) return hashed;
  return { OR: [hashed, { token }] };
}
