"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveDsnOrganizationSettings, type DsnFormState } from "./dsnActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Enregistrement…" : "Enregistrer le contact DSN"}
    </button>
  );
}

export default function DsnOrganizationForm({
  initial,
}: {
  initial: { contactName: string; contactEmail: string; contactPhone: string };
}) {
  const [state, action] = useFormState<DsnFormState, FormData>(saveDsnOrganizationSettings, undefined);
  return (
    <form action={action} className="mt-4 grid gap-4 md:grid-cols-3">
      <label className="text-sm text-ink-soft">
        Nom du contact DSN
        <input
          name="contactName"
          required
          defaultValue={initial.contactName}
          className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink"
        />
      </label>
      <label className="text-sm text-ink-soft">
        Email du contact
        <input
          name="contactEmail"
          type="email"
          required
          defaultValue={initial.contactEmail}
          className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink"
        />
      </label>
      <label className="text-sm text-ink-soft">
        Téléphone du contact
        <input
          name="contactPhone"
          required
          defaultValue={initial.contactPhone}
          className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink"
        />
      </label>
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <SubmitButton />
        <p className="text-xs text-ink-faint">Le mode réel reste désactivé : les exports actuels sont réservés au pré-contrôle.</p>
      </div>
      {state?.error ? <p className="md:col-span-3 rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="md:col-span-3 rounded-lg bg-surface-subtle px-3 py-2 text-sm text-ink-soft" role="status">{state.success}</p> : null}
    </form>
  );
}
