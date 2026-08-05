"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Sparkles, Send, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { askAboutOrganizationAction, type AskAboutOrganizationState } from "@/app/dashboard/aiActions";

const SUGGESTIONS = [
  "Qui risque un oubli administratif ?",
  "Quels dossiers sont incomplets ?",
  "Quels contrats arrivent bientôt à échéance ?",
];

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-label="Poser la question"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white disabled:opacity-50"
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
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="mt-5 border-brand-violet/25 bg-gradient-to-br from-brand-violet/[0.04] to-brand-blue/[0.04]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-violet" />
          <h2 className="text-sm font-semibold text-ink">RH Pilot AI</h2>
          <span className="rounded-full bg-brand-violet/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-violet">
            Bêta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
            <span
              className={`h-1.5 w-1.5 rounded-full ${aiEnabled ? "bg-accent-teal" : "bg-ink-faint"}`}
            />
            {aiEnabled ? "En ligne" : "Indisponible"}
          </span>
          <Info
            size={14}
            className="text-ink-faint"
            aria-label="Les réponses s'appuient uniquement sur les données réelles de votre organisation, jamais inventées."
          />
        </div>
      </div>

      <p className="mt-1 text-xs text-ink-faint">
        Posez une question sur votre organisation. Recevez des réponses basées sur vos données RH.
      </p>

      <form action={formAction} className="mt-3 flex gap-2">
        <Input
          ref={inputRef}
          name="question"
          placeholder="Ex : Qui nécessite mon attention cette semaine ?"
          required
          maxLength={500}
          disabled={!aiEnabled}
          className="flex-1"
        />
        <SubmitButton disabled={!aiEnabled} />
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">Suggestions :</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={!aiEnabled}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.value = suggestion;
                inputRef.current.focus();
              }
            }}
            className="rounded-full border border-brand-violet/20 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand-violet/40 hover:text-brand-violet disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-accent-rose">
          {state.error}
        </p>
      )}

      {state?.answer && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white px-3.5 py-3 text-sm text-ink">
          {state.answer}
        </p>
      )}
    </Card>
  );
}
