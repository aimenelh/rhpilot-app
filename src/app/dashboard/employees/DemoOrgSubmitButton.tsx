"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FieldHint } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Génération en cours..." : "Générer une entreprise de démonstration"}
    </Button>
  );
}

export function DemoOrgSubmitButton() {
  return (
    <div>
      <SubmitButton />
      <FieldHint>
        Génère 15 salariés fictifs pour découvrir RH Pilot. Ces fiches sont temporaires : elles
        seront automatiquement archivées après 48h, sauf si vous passez sur Pro entre-temps.
      </FieldHint>
    </div>
  );
}
