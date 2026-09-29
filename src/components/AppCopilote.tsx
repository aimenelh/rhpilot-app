"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Logomark } from "@/components/Brand";
import { askAboutOrganizationAction, type AskAboutOrganizationState } from "@/app/dashboard/aiActions";

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
// flottante en mode chat créerait un doublon confus. On la masque sur
// ces chemins, sauf quand elle affiche l'écran de bienvenue (voir plus
// bas) : ce n'est pas un chat, donc pas un doublon.
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
  // Sans prénom connu, le nom affiché est l'e-mail : on salue sans le citer.
  const firstName = summary.userDisplayName.includes("@") ? "" : summary.userDisplayName.split(" ")[0];
  const hello = firstName ? `${timeGreeting()} ${firstName}.` : `${timeGreeting()}.`;
  if (summary.overdueCount === 0 && summary.suggestionsCount === 0) {
    return `${hello} Aucun point urgent aujourd'hui, tout est à jour.`;
  }
  const parts: string[] = [];
  if (summary.overdueCount > 0) {
    parts.push(`${summary.overdueCount} tâche${summary.overdueCount > 1 ? "s" : ""} en retard`);
  }
  if (summary.suggestionsCount > 0) {
    parts.push(`${summary.suggestionsCount} suggestion${summary.suggestionsCount > 1 ? "s" : ""}`);
  }
  return `${hello} Vous avez actuellement ${parts.join(" et ")}.`;
}

function renderGreeting(text: string) {
  return text;
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
      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
    >
      Demander
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
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState<AskAboutOrganizationState, FormData>(
    askAboutOrganizationAction,
    undefined
  );
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const lastHandled = useRef<AskAboutOrganizationState>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Masquée sur /dashboard pour éviter le doublon avec le chat plein
  // écran (AskAboutOrganization) — mais l'écran de bienvenue reste
  // affiché même là, car ce n'est pas un chat, seulement un onboarding
  // ponctuel. Sinon un nouvel utilisateur qui atterrit directement sur
  // /dashboard ne verrait jamais la bulle avant d'avoir navigué ailleurs.
  if (HIDDEN_ON_PATHS.includes(pathname ?? "")) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <style>{`
        @keyframes copiloteBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        .copilote-fab { animation: copiloteBreathe 3.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .copilote-fab { animation: none !important; }
        }
      `}</style>

      {isOpen && (
        <div className="mb-3 flex h-[32rem] w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-elevated">
          <div className="flex items-center justify-between border-b border-surface-border bg-gradient-to-br from-brand-primary-dark/[0.04] to-brand-primary/[0.04] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <Logomark size={26} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Copilote RH Pilot</p>
                <span className="text-xs text-ink-faint">
                  {aiEnabled ? "Répond à partir de vos données" : "Momentanément indisponible"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le Copilote"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-subtle"
            >
              <X size={16} />
            </button>
          </div>

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
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-primary px-3.5 py-2 text-sm text-white">
                        {m.text}
                      </div>
                      <span className="flex items-center gap-1 pr-1 text-[10px] text-ink-faint">
                        {m.time}
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
                      className="rounded-full border border-brand-primary-dark/20 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand-primary-dark/40 hover:text-brand-primary-dark disabled:opacity-50"
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
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Fermer le Copilote" : "Ouvrir le Copilote RH Pilot"}
        aria-expanded={isOpen}
        className={`motion-reduce:transition-none relative flex h-14 w-14 items-center justify-center rounded-full border border-surface-border bg-white shadow-card transition-transform hover:scale-105 hover:[animation-play-state:paused] active:scale-95 ${
          isOpen ? "" : "copilote-fab"
        }`}
      >
        {isOpen ? (
          <X size={22} className="text-ink-soft" />
        ) : (
          <span className="relative inline-flex">
            <Logomark size={30} />
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
