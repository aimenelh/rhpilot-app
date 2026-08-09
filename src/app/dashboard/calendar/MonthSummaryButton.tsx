"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { summarizeMonthAction, type SummarizeMonthState } from "./calendarActions";
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-violet/30 bg-brand-violet/5 px-3 py-1.5 text-sm font-medium text-brand-violet transition-colors hover:bg-brand-violet/10 disabled:opacity-50"
    >
      <Sparkles size={14} />
      {pending ? "Analyse en cours…" : "Résumer mon mois"}
    </button>
  );
}
export function MonthSummaryButton({ year, month }: { year: number; month: number }) {
  const [state, formAction] = useFormState<SummarizeMonthState, FormData>(
    summarizeMonthAction,
    undefined
  );
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <SubmitButton />
      </form>
      {state?.error && <p className="mt-2 text-xs text-accent-rose">{state.error}</p>}
      {state?.summary && (
        <p className="mt-2 max-w-sm whitespace-pre-wrap rounded-lg bg-brand-violet/5 px-3 py-2.5 text-xs leading-relaxed text-ink">
          {state.summary}
        </p>
      )}
    </div>
  );
}
