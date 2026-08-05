"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Sparkles, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { askAboutOrganizationAction, type AskAboutOrganizationState } from "@/app/dashboard/aiActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Poser la question"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white disabled:opacity-50"
    >
      <Send size={16} />
    </button>
  );
}

export function AskAboutOrganization() {
  const [state, formAction] = useFormState<AskAboutOrganizationState, FormData>(
    askAboutOrganizationAction,
    undefined
  );

  return (
    <Card className="mt-5 border-brand-violet/20 bg-gradient-to-br from-brand-violet/[0.03] to-brand-blue/[0.03]">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-brand-violet" />
        <h2 className="text-sm font-semibold text-ink">Posez une question sur votre organisation</h2>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        Par exemple : « Qui risque d'avoir un souci dans les 2 prochaines semaines ? » — la réponse
        s'appuie uniquement sur vos données réelles, jamais inventée.
      </p>

      <form action={formAction} className="mt-3 flex gap-2">
        <Input
          name="question"
          placeholder="Votre question..."
          required
          maxLength={500}
          className="flex-1"
        />
        <SubmitButton />
      </form>

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
