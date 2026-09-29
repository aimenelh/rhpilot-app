/**
 * Message d'erreur montrable à l'utilisateur. Les messages métier en français
 * (« Calcul bloqué pour… ») passent tels quels ; une erreur technique (Prisma,
 * pile d'appels, message anglais du système) est journalisée côté serveur et
 * remplacée par un message générique, pour ne jamais exposer la structure de la base.
 */
export function userFacingError(error: unknown, fallback = "Une erreur est survenue. Réessayez dans un instant."): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message ?? "";
  const technical =
    error.name.startsWith("PrismaClient") ||
    /prisma|invalid `|\n\s+at |ECONN|ETIMEDOUT|constraint|violates|relation ".*" does not exist|column ".*" does not exist/i.test(message) ||
    message.length > 600;
  if (technical || !message.trim()) {
    console.error("Erreur technique masquée à l'utilisateur :", error);
    return fallback;
  }
  return message;
}
