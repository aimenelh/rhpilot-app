type AppUrlEnvironment = {
  APP_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
};

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function resolveAppUrl(env: AppUrlEnvironment): string {
  const explicit = env.APP_URL || env.NEXT_PUBLIC_APP_URL;
  if (explicit?.trim()) return normalizeUrl(explicit);

  // Le domaine canonique doit rester stable dans les emails et retours
  // Stripe de production, même si une variable de confort est oubliée.
  if (env.VERCEL_ENV === "production") return "https://rhpilot.fr";

  if (env.VERCEL_URL?.trim()) {
    return normalizeUrl(`https://${env.VERCEL_URL}`);
  }

  return "http://localhost:3000";
}

export function getAppUrl(): string {
  return resolveAppUrl(process.env);
}
