"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { createPortalSession } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="secondary" type="submit" disabled={pending} className="text-sm">
      {pending ? "Ouverture..." : "Gérer mon abonnement"}
    </Button>
  );
}

export function ManageSubscriptionButton() {
  const [state, formAction] = useFormState(createPortalSession, undefined);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton />
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
