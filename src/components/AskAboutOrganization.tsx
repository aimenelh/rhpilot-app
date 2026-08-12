"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Sparkles, Send, Info, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Logomark } from "@/components/Brand";
import { askAboutOrganizationAction, type AskAboutOrganizationState } from "@/app/dashboard/aiActions";
const SUGGESTION_QUESTIONS = ["Qui est en retard ?", "Quels sont les parcours à risque ?", "Quelles échéances cette semaine ?"];
type Message = { role: "user" | "assistant"; text: string; time: string };
function nowLabel() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white disabled:opacity-50"
    >
      <Send size={16} />
    </button>
  );
}
export function AskAboutOrganization({ aiEnabled = true }: { aiEnabled?: boolean }) {
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
  return (
    <Card className="border-brand-violet/25 bg-gradient-to-br from-brand-violet/[0.04] to-brand-blue/[0.04]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <Logomark size={30} />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-violet text-white ring-2 ring-white">
              <Sparkles size={9} />
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            Copilote RH Pilot
            <span className="rounded-full bg-brand-violet/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-violet">
              IA
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
            <span className={`h-1.5 w-1.5 rounded-full ${aiEnabled ? "bg-accent-teal" : "bg-ink-faint"}`} />
            {aiEnabled ? "En ligne" : "Indisponible"}
          </span>
          <Info
            size={14}
            className="text-ink-faint"
            aria-label="Les réponses s'appuient uniquement sur les données réelles de votre organisation, jamais inventées."
          />
        </div>
      </div>
      {messages.length === 0 ? (
        <p className="mt-2 text-xs text-ink-faint">
          Posez une question sur votre organisation. Recevez des réponses basées sur vos données RH.
        </p>
      ) : (
        <div ref={scrollRef} className="mt-3 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex flex-col items-end gap-1">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-blue px-3.5 py-2 text-sm text-white">
                  {m.text}
                </div>
                <span className="flex items-center gap-1 pr-1 text-[10px] text-ink-faint">
                  {m.time} <CheckCheck size={12} className="text-brand-blue" aria-hidden />
                </span>
              </div>
            ) : (
              <div key={i} className="flex items-end gap-2">
                <span className="mb-4 shrink-0">
                  <Logomark size={20} />
                </span>
                <div className="flex max-w-[80%] flex-col gap-1">
                  <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-sm text-ink shadow-sm">
                    {renderFormattedText(m.text)}
                  </div>
                  <span className="pl-1 text-[10px] text-ink-faint">{m.time}</span>
                </div>
              </div>
            )
          )}
        </div>
      )}
      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-accent-rose">
          {state.error}
        </p>
      )}
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
        <Link
          href="/dashboard/calendar"
          className="rounded-full border border-brand-violet/20 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand-violet/40 hover:text-brand-violet"
        >
          Voir le calendrier
        </Link>
      </div>
      <form action={formAction} className="mt-3 flex gap-2">
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
      </form>
    </Card>
  );
}
