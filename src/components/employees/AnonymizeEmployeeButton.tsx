"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Anonymisation d'un salarié archivé : irréversible, d'où la confirmation détaillée.
export function AnonymizeEmployeeButton({ action, employeeName }: { action: () => Promise<void>; employeeName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={formRef} action={action} className="hidden" />
      <ConfirmDialog
        trigger={<button type="button" className="text-xs font-medium text-ink-faint hover:text-accent-rose hover:underline">Anonymiser</button>}
        title={`Anonymiser ${employeeName} ?`}
        description="Son nom, ses coordonnées, ses justificatifs d'arrêt, les pièces jointes de ses parcours et son identité DSN (NIR, naissance, adresse) sont supprimés définitivement. Ses bulletins et son historique de paie sont conservés, comme la loi l'impose. Cette action est irréversible."
        confirmLabel="Anonymiser"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
