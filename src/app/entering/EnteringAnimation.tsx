"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { ConnexionLoop } from "@/components/ConnexionLoop";

// Durée volontairement fixe, indépendante de la vitesse réelle de
// connexion — 5 secondes laisse voir un peu plus d'un tour complet
// de la boucle (10 poses x 500ms = 5s pile un tour).
const MIN_DISPLAY_MS = 5000;

export function EnteringAnimation() {
  const router = useRouter();

  // Précharge le dashboard dès le début de l'animation — voir
  // CreatingAccountAnimation.tsx pour le détail de ce que ça corrige.
  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/dashboard");
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white">
      <AmbientNetwork />
      <div className="relative flex flex-col items-center gap-5">
        <ConnexionLoop className="h-48 w-64" />
        <p className="text-sm font-medium text-ink-soft">Connexion en cours...</p>
      </div>
    </div>
  );
}
