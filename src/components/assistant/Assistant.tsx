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

// Le 👋 fait un vrai petit signe une fois à l'ouverture, plutôt que de
// rester un simple emoji statique dans le texte. Une seule fois, pas
// en boucle — sinon ça distrairait pendant la lecture du reste.
function renderGreeting(text: string) {
  const parts = text.split("👋");
  if (parts.length === 1) return text;
  return (
    <>
      {parts[0]}
      <span
        className="wave-emoji inline-block animate-[wave_1.2s_ease-in-out_1]"
        style={{ transformOrigin: "70% 70%" }}
      >
        👋
      </span>
      {parts[1]}
    </>
  );
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
  const hasCheckedWelcome = useRef(false);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Un seul effet, une seule décision par changement de page — pour
  // éliminer tout risque de conflit d'ordre entre "faut-il montrer
  // l'accueil ici ?" et "faut-il fermer le panneau ?". Les avoir
  // séparés provoquait une fermeture immédiate de l'accueil dans
  // certains cas (redirection après connexion pas encore stabilisée).
  useEffect(() => {
    if (!hasCheckedWelcome.current && pathname === "/dashboard") {
      hasCheckedWelcome.current = true;
      let alreadySeen = true;
      try {
        alreadySeen = Boolean(localStorage.getItem(WELCOME_SEEN_KEY));
      } catch {
        // Stockage indisponible — on considère l'accueil déjà "vu".
      }
      if (!alreadySeen) {
        setShowWelcome(true);
        setOpen(true);
        setQuery("");
        return; // ne pas enchaîner sur la fermeture ci-dessous
      }
    }

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
      <style>{`
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes assistantBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        @keyframes assistantPanelIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes assistantBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .assistant-fab { animation: assistantBreathe 3.5s ease-in-out infinite; }
        .assistant-panel-in { animation: assistantPanelIn 0.25s ease-out both; }
        .assistant-backdrop-in { animation: assistantBackdropIn 0.2s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .assistant-fab, .assistant-panel-in, .assistant-backdrop-in, .wave-emoji { animation: none !important; }
        }
      `}</style>

      <button
        onClick={() => setOpen(true)}
        className="assistant-fab fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand-primary px-4 py-3 text-sm font-medium text-white shadow-card transition-transform duration-150 hover:scale-105 hover:[animation-play-state:paused] active:scale-95"
        aria-label="Ouvrir l'aide RH Pilot"
      >
        <MessageCircleQuestion size={18} />
        Aide
      </button>

      {open && (
        <div
          className="assistant-backdrop-in fixed inset-0 z-50 flex items-end justify-end bg-ink/20 p-6"
          onClick={showWelcome ? exploreFreely : () => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Aide RH Pilot"
            className="assistant-panel-in flex h-[34rem] w-full max-w-sm flex-col rounded-xl border border-surface-border bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-surface-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Aide RH Pilot</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {showWelcome ? renderGreeting("Bonjour 👋 Bienvenue sur RH Pilot.") : renderGreeting(buildGreeting(summary))}
                </p>
              </div>
              <button
                onClick={showWelcome ? exploreFreely : () => setOpen(false)}
                aria-label="Fermer l'aide"
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
                          className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-ink-soft transition-colors duration-150 hover:bg-brand-primary/10 hover:text-brand-primary"
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
                            className="block rounded-lg px-3 py-2 transition-all duration-150 hover:translate-x-0.5 hover:bg-surface-subtle"
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
                    className="text-xs font-medium text-brand-primary hover:underline"
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
