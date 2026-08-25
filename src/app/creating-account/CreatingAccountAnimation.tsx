"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { SignupSearchSequence } from "@/components/SignupSearchSequence";

// Durée totale de la séquence (4 poses, 3 transitions de 900ms) + une
// courte pause sur la dernière pose avant de rediriger — la fin de
// l'histoire doit être visible un instant, pas coupée sèchement dès
// que la dernière image apparaît.
const SEQUENCE_MS = 3 * 900;
const HOLD_ON_LAST_FRAME_MS = 700;
const TOTAL_MS = SEQUENCE_MS + HOLD_ON_LAST_FRAME_MS;

export function CreatingAccountAnimation() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRedirecting(true);
      router.replace("/dashboard");
    }, TOTAL_MS);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white">
      <AmbientNetwork />
      <div className="relative flex flex-col items-center gap-5">
        <SignupSearchSequence className="h-48 w-64" />
        <p className="text-sm font-medium text-ink-soft">
          {redirecting ? "C'est prêt..." : "Création de votre compte RH Pilot..."}
        </p>
      </div>
    </div>
  );
}
