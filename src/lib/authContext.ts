export const AUTH_CONTEXT_COOKIE = "rhpilot_auth_context";
export type AuthContext = "rh" | "employee";

function pathMatches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Routes qui appartiennent réellement au portail salarié, pas /espace-salarie (page vitrine). */
export function isEmployeePortalPath(pathname: string): boolean {
  return pathMatches(pathname, "/espace");
}

/** Entrées explicites vers l'application RH. Elles permettent de changer volontairement de contexte. */
export function isRhAuthEntryPath(pathname: string): boolean {
  return pathMatches(pathname, "/sign-in") || pathMatches(pathname, "/sign-up");
}

function isEmployeeApi(pathname: string): boolean {
  return pathMatches(pathname, "/api/espace");
}

function isMachineApi(pathname: string): boolean {
  return pathMatches(pathname, "/api/webhooks") || pathMatches(pathname, "/api/cron");
}

/**
 * En contexte salarié, aucune page ni API RH privée n'est accessible.
 * Ce verrou complète les contrôles Membership côté serveur : il évite qu'une
 * identité ayant plusieurs usages passe silencieusement du portail salarié
 * au back-office RH.
 */
export function employeeContextBlocks(pathname: string): boolean {
  if (
    pathMatches(pathname, "/dashboard") ||
    pathMatches(pathname, "/entering") ||
    pathMatches(pathname, "/creating-account")
  ) {
    return true;
  }

  if (pathMatches(pathname, "/api")) {
    return !isEmployeeApi(pathname) && !isMachineApi(pathname);
  }

  return false;
}
