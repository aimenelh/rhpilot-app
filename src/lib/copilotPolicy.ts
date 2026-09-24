export const COPILOT_REQUESTS_PER_HOUR = 20;

export function isCopilotRateLimited(requestsInLastHour: number): boolean {
  if (!Number.isInteger(requestsInLastHour) || requestsInLastHour < 0) {
    throw new Error("Le compteur de requêtes Copilote doit être un entier positif ou nul.");
  }
  return requestsInLastHour >= COPILOT_REQUESTS_PER_HOUR;
}
