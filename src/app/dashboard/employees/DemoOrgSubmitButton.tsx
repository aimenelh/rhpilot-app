"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function DemoOrgSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Génération en cours..." : "Générer une entreprise de démonstration"}
    </Button>
  );
}
