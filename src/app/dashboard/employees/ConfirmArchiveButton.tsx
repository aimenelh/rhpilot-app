"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ConfirmArchiveButton({
  action,
  employeeName,
}: {
  action: () => Promise<void>;
  employeeName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className="hidden" />
      <ConfirmDialog
        trigger={
          <Button type="button" variant="danger">
            Archiver
          </Button>
        }
        title="Archiver ce salarié ?"
        description={`${employeeName} disparaîtra des listes actives mais restera consultable dans l'historique. Rien n'est supprimé définitivement.`}
        confirmLabel="Archiver"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
