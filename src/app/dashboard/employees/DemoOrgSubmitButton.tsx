"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FieldHint } from "@/components/ui/Field";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { CoffeeSpillLoop } from "@/components/CoffeeSpillLoop";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Génération en cours..." : "Générer une entreprise de démonstration"}
    </Button>
  );
}

// Affiché tant que le formulaire est en soumission — couvre tout le
// temps réel de génération côté serveur (création des 15 salariés et
// de leurs parcours), pas seulement le court instant de la navigation
// qui suit. useFormStatus fonctionne ici car ce composant est rendu
// à l'intérieur du même <form> que le bouton (voir employees/page.tsx).
function GenerationOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <AmbientNetwork />
      <div className="relative flex flex-col items-center gap-5">
        <CoffeeSpillLoop className="h-48 w-64" />
        <p className="text-sm font-medium text-ink-soft">Préparation de vos données...</p>
      </div>
    </div>
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
      <GenerationOverlay />
    </div>
  );
}
