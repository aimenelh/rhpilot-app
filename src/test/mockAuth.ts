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
 * next/navigation.redirect() lève une exception spéciale en dehors
 * d'un vrai rendu Next.js — on la simule de la même façon (elle lève
 * "NEXT_REDIRECT") pour rester fidèle au comportement réel : le code
 * après un redirect() réussi ne s'exécute jamais, ici comme en
 * production. Un test qui atteint le redirect (donc qui a réussi)
 * doit s'attendre à cette exception plutôt qu'à un retour normal.
 */
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
