"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircleQuestion, X, Search, Loader2 } from "lucide-react";
import { localKeywordSearch, getContextualEntries, type KnowledgeEntry } from "@/lib/knowledgeBase";
import { TOUR_STORAGE_KEY, TOUR_DONE_VALUE, WELCOME_SEEN_KEY } from "@/lib/tourStorage";
import { Button } from "@/components/ui/Button";

const EXAMPLE_QUERIES = [
  "Comment fonctionne un parcours ?",
  "Salarié sans contrat",
  "Notifications",
];

type AssistantSummary = { userDisplayName: string; overdueCount: number; suggestionsCount: number };

function buildGreeting(summary: AssistantSummary): string {
  const firstName = summary.userDisplayName.split(" ")[0];
  if (summary.overdueCount === 0 && summary.suggestionsCount === 0) {
    return `Bonjour ${firstName} 👋 Aucun point urgent aujourd'hui. Tout est à jour.`;
  }

  const parts: string[] = [];
  if (summary.overdueCount > 0) {
    parts.push(`${summary.overdueCount} tâche${summary.overdueCount > 1 ? "s" : ""} en retard`);
  }
  if (summary.suggestionsCount > 0) {
    parts.push(
      `${summary.suggestionsCount} suggestion${summary.suggestionsCount > 1 ? "s" : ""}`
    );
  }
  return `Bonjour ${firstName} 👋 Vous avez actuellement ${parts.join(" et ")}.`;
}

export function Assistant({ summary }: { summary: AssistantSummary }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Premier lancement uniquement : l'Assistant s'ouvre de lui-même sur
  // le tableau de bord pour proposer la découverte guidée — jamais un
  // robot, jamais imposé, un simple choix une seule fois.
  useEffect(() => {
    if (pathname !== "/dashboard") return;
    try {
      if (!localStorage.getItem(WELCOME_SEEN_KEY)) {
        setShowWelcome(true);
        setOpen(true);
      }
    } catch {
      // Stockage indisponible — on n'affiche simplement pas l'accueil.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markWelcomeSeen() {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      // Sans conséquence grave si ça échoue.
    }
  }

  function startTour() {
    markWelcomeSeen();
    setShowWelcome(false);
    setOpen(false);
    router.push("/dashboard/employees");
  }

  function exploreFreely() {
    markWelcomeSeen();
    // Puisque l'utilisateur choisit explicitement d'explorer seul, le
    // parcours guidé ne doit plus jamais s'imposer non plus.
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, TOUR_DONE_VALUE);
    } catch {
      // Sans conséquence grave si ça échoue.
    }
    setShowWelcome(false);
    setOpen(false);
  }

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Se referme et vide sa recherche à chaque changement de page — sauf
  // au tout premier rendu, sinon ça annulerait l'ouverture automatique
  // de l'accueil de bienvenue juste au-dessus.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setOpen(false);
    setQuery("");
  }, [pathname]);

  const trimmedQuery = query.trim();

  // Appel asynchrone au moteur, avec un léger anti-rebond — le même
  // schéma qu'utiliserait un vrai appel réseau à un LLM plus tard,
  // pour que ce composant n'ait rien à changer le jour du remplacement.
  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timeout = setTimeout(async () => {
      const entries = await localKeywordSearch(trimmedQuery);
      if (!cancelled) {
        setResults(entries);
        setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [trimmedQuery]);

  const displayedEntries = trimmedQuery ? results : getContextualEntries(pathname ?? "/dashboard");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-3 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-95"
        aria-label="Ouvrir l'assistant RH Pilot"
      >
        <MessageCircleQuestion size={18} />
        Assistant
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-ink/20 p-6"
          onClick={showWelcome ? exploreFreely : () => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Assistant RH Pilot"
            className="flex h-[34rem] w-full max-w-sm flex-col rounded-xl border border-surface-border bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-surface-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Assistant RH Pilot</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {showWelcome ? "Bonjour 👋 Bienvenue sur RH Pilot." : buildGreeting(summary)}
                </p>
              </div>
              <button
                onClick={showWelcome ? exploreFreely : () => setOpen(false)}
                aria-label="Fermer l'assistant"
                className="shrink-0 text-ink-faint hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {showWelcome ? (
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Merci de participer à cette bêta ! Je peux vous accompagner pendant moins
                    d&apos;une minute pour découvrir comment RH Pilot fonctionne : créer un
                    salarié, déclencher un premier parcours RH, et voir les tâches apparaître
                    automatiquement.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={startTour} className="w-full">
                    Commencer la découverte
                  </Button>
                  <button
                    onClick={exploreFreely}
                    className="w-full py-2 text-center text-sm font-medium text-ink-faint hover:text-ink-soft"
                  >
                    Je préfère explorer seul
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-surface-border p-3">
                  <div className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2">
                    {loading ? (
                      <Loader2 size={14} className="shrink-0 animate-spin text-ink-faint" />
                    ) : (
                      <Search size={14} className="shrink-0 text-ink-faint" />
                    )}
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Posez votre question..."
                      className="w-full text-sm text-ink outline-none placeholder:text-ink-faint"
                    />
                  </div>

                  {!trimmedQuery && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {EXAMPLE_QUERIES.map((example) => (
                        <button
                          key={example}
                          onClick={() => setQuery(example)}
                          className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-ink-soft hover:bg-brand-blue/10 hover:text-brand-blue"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  {!trimmedQuery && (
                    <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Suggestions pour cet écran
                    </p>
                  )}
                  {trimmedQuery && !loading && displayedEntries.length === 0 ? (
                    <p className="px-1 text-sm text-ink-soft">
                      Aucune réponse trouvée pour cette recherche.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {displayedEntries.map((entry) => (
                        <li key={entry.id}>
                          <Link
                            href={entry.href}
                            onClick={() => setOpen(false)}
                            className="block rounded-lg px-3 py-2 hover:bg-surface-subtle"
                          >
                            <p className="text-sm font-medium text-ink">{entry.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                              {entry.description}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-surface-border px-4 py-2.5">
                  <Link
                    href="/dashboard/help"
                    onClick={() => setOpen(false)}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    Voir toutes les questions →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
