/** Uniquement des erreurs de connexion : aucune migration SQL en échec n'est masquée. */
export function retryableDatabaseConnection(output) {
  return /\bP1001\b|\bP1002\b/.test(output) && !/\bP3009\b|\bP3018\b/.test(output);
}

export async function runWithConnectionRetry(run, wait, logger = console) {
  const delays = [2000, 5000];
  for (let attempt = 0; ; attempt += 1) {
    const result = run();
    if (result.status === 0 || attempt >= delays.length || !retryableDatabaseConnection(result.output)) return result;
    logger.warn(`Connexion PostgreSQL indisponible : nouvelle tentative ${attempt + 2}/3 dans ${delays[attempt] / 1000} secondes.`);
    await wait(delays[attempt]);
  }
}
