"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { resetDemoPayrollAction, type DemoPayrollResetState } from "./demoPayrollActions";

function Trigger({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="button" variant="secondary" disabled={pending}>{pending ? "Préparation en cours…" : label}</Button>;
}

export function DemoPayrollSetupButton({ hasPayroll }: { hasPayroll: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState<DemoPayrollResetState, FormData>(resetDemoPayrollAction, undefined);
  const label = hasPayroll ? "Repartir de zéro" : "Préparer la paie de démonstration";
  return (
    <form ref={formRef} action={action} className="flex flex-col items-start gap-2 sm:items-end">
      <input type="hidden" name="confirmation" value="REMETTRE-A-ZERO" />
      <ConfirmDialog
        trigger={<Trigger label={label} />}
        title={hasPayroll ? "Repartir d'une paie de démonstration propre ?" : "Préparer la paie de démonstration ?"}
        description="Tous les mois de paie, bulletins et DSN d'essai de cette entreprise fictive sont effacés. Les salariés fictifs reçoivent leurs salaires, leurs cumuls depuis janvier et leurs données DSN, puis le mois en cours est ouvert."
        confirmLabel={hasPayroll ? "Tout effacer et repartir" : "Préparer"}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
      {state?.error ? <p role="alert" className="max-w-md text-sm text-accent-amber sm:text-right">{state.error}</p> : null}
    </form>
  );
}
