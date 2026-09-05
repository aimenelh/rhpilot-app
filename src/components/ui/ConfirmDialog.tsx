"use client";

import { useRef } from "react";
import { Button } from "./Button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmer",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <span onClick={() => dialogRef.current?.showModal()}>{trigger}</span>
      <dialog
        ref={dialogRef}
        className="rounded-xl border border-surface-border p-0 shadow-elevated backdrop:bg-ink/40"
      >
        <div className="w-80 p-5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm text-ink-soft">{description}</p>
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                dialogRef.current?.close();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
