"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, Send, X, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Logomark } from "@/components/Brand";
import { askAboutOrganizationAction, type AskAboutOrganizationState } from "@/app/dashboard/aiActions";
import { TOUR_STORAGE_KEY, TOUR_DONE_VALUE, WELCOME_SEEN_KEY } from "@/lib/tourStorage";

// Un exemple de question sur les données, un sur le fonctionnement du
// site : ça montre tout de suite que le Copilote répond aux deux
// registres, pas seulement aux données de l'organisation.
const SUGGESTION_QUESTIONS = [
  "Qui est en retard ?",
  "Quels sont les parcours à risque ?",
  "RH Pilot remplace-t-il mon logiciel de paie ?",
];

// La page /dashboard affiche déjà une version complète du Copilote en
// plein écran (voir AskAboutOrganization) — y superposer la bulle
// flottante créerait un doublon confus. On la masque uniquement là.
const HIDDEN_ON_PATHS = ["/dashboard"];

type Message = { role: "user" | "assistant"; text: string; time: string };
type Summary = { userDisplayName: string; overdueCount: number; suggestionsCount: number };

function nowLabel() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function timeGreeting(): string {
  return new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
}

// Repris tel quel de l'ancien Assistant : le message d'accueil
// personnalisé selon ce qui attend réellement la personne aujourd'hui.
function buildGreeting(summary: Summary): string {
  const firstName = summary.userDisplayName.split(" ")[0];
  const hello = timeGreeting();
  if (summary.overdueCount === 0 && summary.suggestionsCount === 0) {
    return `${hello} ${firstName} 👋 Aucun point urgent aujourd'hui. Tout est à jour.`;
  }
  const parts: string[] = [];
  if (summary.overdueCount > 0) {
    parts.push(`${summary.overdueCount} tâche${summary.overdueCount > 1 ? "s" : ""} en retard`);
  }
  if (summary.suggestionsCount > 0) {
    parts.push(`${summary.suggestionsCount} suggestion${summary.suggestionsCount > 1 ? "s" : ""}`);
  }
  return `${hello} ${firstName} 👋 Vous avez actuellement ${parts.join(" et ")}.`;
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
      <span className="wave-emoji inline-block animate-[wave_1.2s_ease-in-out_1]" style={{ transformOrigin: "70% 70%" }}>
        👋
      </span>
      {parts[1]}
    </>
  );
}

// Filet de sécurité : le system prompt interdit le Markdown à l'IA,
// mais un modèle peut occasionnellement en glisser malgré tout. Plutôt
// que d'afficher des astérisques bruts à l'écran, on les convertit en
// vrai gras — sans dangerouslySetInnerHTML, juste un découpage de texte.
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-label="Poser la question"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white disabled:opacity-50"
    >
      <Send size={15} />
    </button>
  );
}

// "En train d'écrire..." pendant que l'IA réfléchit — doit être un
// enfant du <form> pour lire son état via useFormStatus.
function TypingIndicator() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="flex items-end gap-2">
      <span className="mb-1 shrink-0">
        <Logomark size={18} />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2.5">
        <span className="motion-reduce:animate-none h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
        <span className="motion-reduce:animate-none h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
        <span className="motion-reduce:animate-none h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" />
      </div>
    </div>
  );
}

export function AppCopilote({ summary, aiEnabled = true }: { summary: Summary; aiEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [state, formAction] = useFormState<AskAboutOrganizationState, FormData>(
    askAboutOrganizationAction,
    undefined
  );
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const lastHandled = useRef<AskAboutOrganizationState>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasCheckedWelcome = useRef(false);

  useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.answer) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text: state.question, time: nowLabel() },
        { role: "assistant", text: state.answer, time: nowLabel() },
      ]);
      setQuestion("");
    }
  }, [state]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Repris tel quel de l'ancien Assistant : à la toute première visite
  // du tableau de bord, propose l'accueil plutôt que d'attendre une
  // question. Une seule fois, jamais imposé à nouveau ensuite.
  useEffect(() => {
    if (hasCheckedWelcome.current || pathname !== "/dashboard") return;
    hasCheckedWelcome.current = true;
    let alreadySeen = true;
    try {
      alreadySeen = Boolean(localStorage.getItem(WELCOME_SEEN_KEY));
    } catch {
      // Stockage indisponible — on considère l'accueil déjà "vu".
    }
    if (!alreadySeen) {
      setShowWelcome(true);
      setIsOpen(true);
    }
  }, [pathname]);

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
    setIsOpen(false);
    router.push("/dashboard/employees");
  }

  function exploreFreely() {
    markWelcomeSeen();
    // Puisque la personne choisit explicitement d'explorer seule, le
    // parcours guidé ne doit plus jamais s'imposer non plus.
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, TOUR_DONE_VALUE);
    } catch {
      // Sans conséquence grave si ça échoue.
    }
    setShowWelcome(false);
  }

  if (HIDDEN_ON_PATHS.includes(pathname ?? "")) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <style>{`
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes copiloteBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        .copilote-fab { animation: copiloteBreathe 3.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .copilote-fab, .wave-emoji { animation: none !important; }
        }
      `}</style>

      {isOpen && (
        <div className="mb-3 flex h-[32rem] w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-border bg-gradient-to-br from-brand-violet/[0.04] to-brand-blue/[0.04] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <Logomark size={26} />
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-violet text-white ring-2 ring-white">
                  <Sparkles size={8} />
                </span>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  Copilote RH Pilot
                  <span className="rounded-full bg-brand-violet/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-violet">
                    IA
                  </span>
                </p>
                <span className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                  <span className={`h-1.5 w-1.5 rounded-full ${aiEnabled ? "bg-accent-teal" : "bg-ink-faint"}`} />
                  {aiEnabled ? "En ligne" : "Indisponible"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={showWelcome ? exploreFreely : () => setIsOpen(false)}
              aria-label="Fermer le Copilote"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-subtle"
            >
              <X size={16} />
            </button>
          </div>

          {showWelcome ? (
            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <p className="text-sm font-medium text-ink">
                  {renderGreeting(`${timeGreeting()} 👋 Bienvenue sur RH Pilot.`)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
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
            <form action={formAction} className="flex flex-1 flex-col overflow-hidden px-4 py-3">
              <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <div className="flex items-end gap-2">
                    <span className="mb-1 shrink-0">
                      <Logomark size={18} />
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2 text-sm text-ink">
                      {renderGreeting(buildGreeting(summary))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="flex flex-col items-end gap-1">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-blue px-3.5 py-2 text-sm text-white">
                        {m.text}
                      </div>
                      <span className="flex items-center gap-1 pr-1 text-[10px] text-ink-faint">
                        {m.time} <CheckCheck size={12} className="text-brand-blue" aria-hidden />
                      </span>
                    </div>
                  ) : (
                    <div key={i} className="flex items-end gap-2">
                      <span className="mb-4 shrink-0">
                        <Logomark size={18} />
                      </span>
                      <div className="flex max-w-[85%] flex-col gap-1">
                        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2 text-sm text-ink">
                          {renderFormattedText(m.text)}
                        </div>
                        <span className="pl-1 text-[10px] text-ink-faint">{m.time}</span>
                      </div>
                    </div>
                  )
                )}
                <TypingIndicator />
              </div>

              {state?.error && (
                <p role="alert" className="mt-2 text-sm text-accent-rose">
                  {state.error}
                </p>
              )}

              {messages.length === 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {SUGGESTION_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={!aiEnabled}
                      onClick={() => setQuestion(suggestion)}
                      className="rounded-full border border-brand-violet/20 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand-violet/40 hover:text-brand-violet disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Input
                  name="question"
                  placeholder="Posez votre question..."
                  required
                  maxLength={500}
                  disabled={!aiEnabled}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="flex-1"
                />
                <SubmitButton disabled={!aiEnabled} />
              </div>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Fermer le Copilote" : "Ouvrir le Copilote RH Pilot"}
        aria-expanded={isOpen}
        className={`motion-reduce:transition-none relative flex h-14 w-14 items-center justify-center rounded-full border border-surface-border bg-white shadow-xl transition-transform hover:scale-105 hover:[animation-play-state:paused] active:scale-95 ${
          isOpen ? "" : "copilote-fab"
        }`}
      >
        {isOpen ? (
          <X size={22} className="text-ink-soft" />
        ) : (
          <span className="relative inline-flex">
            <Logomark size={30} />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-violet text-white ring-2 ring-white">
              <Sparkles size={9} />
            </span>
          </span>
        )}
        {!isOpen && summary.overdueCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-rose text-[10px] font-bold text-white ring-2 ring-white">
            {summary.overdueCount > 9 ? "9+" : summary.overdueCount}
          </span>
        )}
      </button>
    </div>
  );
}
