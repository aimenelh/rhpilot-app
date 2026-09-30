"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { completeDashboardTask } from "./events/actions";

function CompleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="fil-task-check" disabled={pending} aria-label={`Marquer comme fait : ${label}`} title="Marquer comme fait">{pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}</button>;
}

export function CompleteDashboardTask({ id, label }: { id: string; label: string }) {
  const [state, action] = useFormState(completeDashboardTask.bind(null, id), undefined);
  return <form action={action} className="fil-task-complete"><CompleteButton label={label} />{state?.error ? <p role="alert" className="fil-inline-error">{state.error}</p> : null}</form>;
}
