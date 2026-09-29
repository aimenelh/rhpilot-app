"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

export type AskOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  /** Présent : un champ de saisie est demandé (motif…), prérempli avec cette valeur. */
  input?: { label: string; defaultValue?: string; required?: boolean };
};

type Pending = AskOptions & { resolve: (value: string | null) => void };

/**
 * Remplace window.confirm et window.prompt par une fenêtre intégrée à l'application.
 * `ask` renvoie le texte saisi (ou "" sans champ), ou null si la personne annule.
 */
export function useAskDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const ask = (options: AskOptions) => new Promise<string | null>((resolve) => setPending({ ...options, resolve }));
  const dialog = pending ? (
    <AskDialog
      key={pending.title}
      options={pending}
      onClose={(value) => {
        pending.resolve(value);
        setPending(null);
      }}
    />
  ) : null;
  return { ask, dialog, isOpen: pending !== null };
}

function AskDialog({ options, onClose }: { options: AskOptions; onClose: (value: string | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(options.input?.defaultValue ?? "");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const invalid = Boolean(options.input?.required && !value.trim());
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose(null);
      }}
      className="rounded-xl border border-surface-border p-0 shadow-elevated backdrop:bg-ink/40"
    >
      <form
        method="dialog"
        className="w-[min(24rem,calc(100vw-2rem))] p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) onClose(options.input ? value.trim() : "");
        }}
      >
        <h2 className="text-sm font-semibold text-ink">{options.title}</h2>
        {options.description ? <p className="mt-2 text-sm leading-6 text-ink-soft">{options.description}</p> : null}
        {options.input ? (
          <label className="mt-4 block text-sm font-medium text-ink">
            {options.input.label}
            <textarea
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink focus:border-brand-primary focus:outline-none"
            />
          </label>
        ) : null}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onClose(null)}>
            Annuler
          </Button>
          <Button type="submit" variant={options.danger ? "danger" : "primary"} disabled={invalid}>
            {options.confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
