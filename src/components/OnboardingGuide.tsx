"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/Button";

const STORAGE_KEY = "rhpilot_onboarding_seen";

const STEPS = [
  { number: "1", label: "Ajoutez un salarié" },
  { number: "2", label: "Déclenchez un parcours RH" },
  { number: "3", label: "Revenez sur le tableau de bord" },
];

export function OnboardingGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // Stockage indisponible (mode privé strict, etc.) — on n'affiche
      // simplement pas le guide plutôt que de faire planter la page.
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Rien de grave si ça échoue — au pire, le guide réapparaîtra.
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-label="Bienvenue sur RH Pilot"
        className="w-full max-w-sm rounded-xl border border-surface-border bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold text-ink">Bienvenue sur RH Pilot 👋</h2>
          <button
            onClick={dismiss}
            aria-label="Fermer"
            className="text-ink-faint hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">Pour découvrir le produit en 30 secondes :</p>

        <ol className="mt-5 flex flex-col gap-3">
          {STEPS.map((step) => (
            <li key={step.number} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                {step.number}
              </span>
              <span className="text-sm text-ink">{step.label}</span>
            </li>
          ))}
        </ol>

        <Button onClick={dismiss} className="mt-6 w-full">
          Commencer
        </Button>
      </div>
    </div>
  );
}
