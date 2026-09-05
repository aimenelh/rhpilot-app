import { vi } from "vitest";

/**
 * React `cache()` est pensée pour dérouler une seule requête dans un
 * vrai rendu Next.js (App Router / React Server Components) — hors de
 * ce contexte (donc dans nos tests, sous Node/Vitest), ce n'est même
 * pas une fonction utilisable ("cache is not a function"). On la
 * remplace par un simple passe-plat : la fonction d'origine s'exécute
 * à chaque appel, sans mémoisation. C'est en réalité préférable pour
 * des tests — on ne veut jamais qu'un résultat mis en cache fuite d'un
 * scénario à l'autre (utilisateur A puis utilisateur B dans le même
 * fichier de test, par exemple).
 */
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
  };
});

/**
 * Simule uniquement la frontière externe (Clerk) — tout le reste
 * (nos propres requêtes Prisma, notre logique métier) tourne pour de
 * vrai contre une base de données réelle. On ne veut jamais mocker
 * notre propre code, seulement ce qui vient de l'extérieur.
 *
 * `authState.userId` doit être défini (ou remis à null) avant chaque
 * appel à une Server Action, pour simuler "quel utilisateur Clerk est
 * connecté" au moment de l'appel.
 */
export const authState: { userId: string | null } = { userId: null };

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => ({ userId: authState.userId }),
}));

/**
 * next/navigation.redirect() et next/cache.revalidatePath() lèvent
 * toutes les deux une exception ("Invariant: static generation store
 * missing...") en dehors d'un vrai rendu Next.js — confirmé par
 * l'exécution réelle (createEmployee appelle revalidatePath juste
 * avant son redirect final). On simule les deux à l'identique :
 * redirect lève une exception reconnaissable, revalidatePath ne fait
 * simplement rien (on ne teste jamais la vraie invalidation de cache
 * ici, seulement que le code qui l'appelle ne plante pas).
 */
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
