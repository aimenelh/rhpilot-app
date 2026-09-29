"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createCheckoutSession } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="text-sm">
      {pending ? "Redirection..." : "Passer sur Pro"}
    </Button>
  );
}

export function UpgradeToProButton() {
  const [state, formAction] = useFormState(createCheckoutSession, undefined);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <label className="flex max-w-lg items-start gap-2 text-sm text-ink-soft"><input type="checkbox" name="acceptTerms" required className="mt-1" /><span>J’accepte les <Link href="/cgv" target="_blank" className="underline">CGV</Link>, les <Link href="/cgu" target="_blank" className="underline">CGU</Link> et le <Link href="/dpa" target="_blank" className="underline">contrat de sous-traitance</Link> (version du 29 septembre 2026).</span></label>
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
