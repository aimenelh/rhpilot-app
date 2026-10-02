export function retryableDatabaseConnection(output: string): boolean;
export function runWithConnectionRetry<T extends { status: number; output: string }>(
  run: () => T,
  wait: (delay: number) => Promise<unknown>,
  logger?: { warn: (message: string) => void },
): Promise<T>;
