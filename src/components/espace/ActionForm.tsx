"use client";

import type { ReactNode } from "react";
import { useFormState } from "react-dom";

type State = { error?: string; success?: string } | undefined;

/** Formulaire relié à une action serveur, avec son message d'erreur ou de réussite. */
export function ActionForm({ action, children, className }: { action: (state: State, formData: FormData) => Promise<State>; children: ReactNode; className?: string }) {
  const [state, formAction] = useFormState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error ? <p role="alert" className="mt-3 text-sm text-accent-rose">{state.error}</p> : null}
      {state?.success ? <p role="status" className="mt-3 text-sm text-accent-teal">{state.success}</p> : null}
    </form>
  );
}
