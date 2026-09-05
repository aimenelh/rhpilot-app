"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { TOUR_STORAGE_KEY as STORAGE_KEY, TOUR_DONE_VALUE as DONE_VALUE } from "@/lib/tourStorage";

type TourStep = {
  selector: string;
  matches: (pathname: string) => boolean;
  title: string;
  text: string;
  placement: "top" | "bottom";
};

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="add-employee"]',
    matches: (p) => p === "/dashboard/employees",
    title: "1. Ajoutez votre premier salarié",
    text: "Cliquez ici pour créer votre première fiche, ça prend moins d'une minute.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="submit-employee"]',
    matches: (p) => p === "/dashboard/employees/new",
    title: "2. Enregistrez la fiche",
    text: "Le prénom, le nom et la date d'embauche suffisent pour commencer. Le reste peut attendre.",
    placement: "top",
  },
  {
    selector: '[data-tour="trigger-event"]',
    matches: (p) => /^\/dashboard\/employees\/[^/]+$/.test(p),
    title: "3. Déclenchez un parcours RH",
    text: "Choisissez un événement (par exemple Embauche) : RH Pilot génère automatiquement le plan d'action complet.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="dashboard-attention"]',
    matches: (p) => p === "/dashboard",
    title: "🎉 Bravo, vous avez créé votre premier parcours RH !",
    text: "Vous pouvez maintenant consulter les tâches générées, revenir ici à tout moment, et voir les rappels arriver automatiquement le moment venu.",
    placement: "bottom",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

export function TourGuide() {
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { top: box.top, left: box.left, width: box.width, height: box.height };
  }, []);

  // Détermine, à chaque changement de page, si l'étape *attendue* du
  // parcours se trouve ici. La progression est strictement
  // séquentielle : `stored` représente l'étape qu'on cherche
  // actuellement, pas la dernière montrée — ça évite qu'une
  // navigation dans le désordre saute une étape ou en réaffiche une
  // déjà faite.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (stored === DONE_VALUE) return;

    const expectedIndex = stored ? Number(stored) : 0;
    if (expectedIndex >= STEPS.length) {
      try {
        localStorage.setItem(STORAGE_KEY, DONE_VALUE);
      } catch {
        // Sans conséquence grave si ça échoue.
      }
      return;
    }

    const expectedStep = STEPS[expectedIndex];
    if (!expectedStep.matches(pathname ?? "")) {
      setStepIndex(null);
      return;
    }

    setStepIndex(expectedIndex);
    try {
      localStorage.setItem(STORAGE_KEY, String(expectedIndex + 1));
    } catch {
      // Sans conséquence grave si ça échoue.
    }
  }, [pathname]);

  // Cherche la position réelle de la cible — avec quelques tentatives,
  // le temps que la page ait fini de s'afficher après une navigation.
  useEffect(() => {
    if (stepIndex === null) {
      setRect(null);
      return;
    }
    const step = STEPS[stepIndex];
    let attempts = 0;
    let cancelled = false;

    function tryMeasure() {
      if (cancelled) return;
      const found = measure(step.selector);
      if (found) {
        setRect(found);
      } else if (attempts < 10) {
        attempts += 1;
        setTimeout(tryMeasure, 150);
      } else {
        setRect(null);
      }
    }
    tryMeasure();

    function onViewportChange() {
      const found = measure(step.selector);
      if (found) setRect(found);
    }
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [stepIndex, measure]);

  function skip() {
    setStepIndex(null);
    setRect(null);
    try {
      localStorage.setItem(STORAGE_KEY, DONE_VALUE);
    } catch {
      // Sans conséquence grave si ça échoue.
    }
  }

  if (stepIndex === null || !rect) return null;

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  // Bulle positionnée au-dessus ou en dessous de la cible, en
  // s'assurant de rester dans l'écran.
  const bubbleTop =
    step.placement === "bottom" ? rect.top + rect.height + 12 : Math.max(12, rect.top - 12);
  const bubbleLeft = Math.min(Math.max(12, rect.left), window.innerWidth - 300);

  return (
    <>
      {/* Halo autour de la cible réelle — pulse une fois à l'apparition de chaque étape */}
      <div
        key={`halo-${stepIndex}`}
        className="pointer-events-none fixed z-[60] rounded-lg ring-4 ring-brand-primary/50 tour-pulse-once transition-[top,left,width,height] duration-200"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />

      {/* Bulle d'explication avec flèche — rejoue son apparition à chaque étape */}
      <div
        key={`bubble-${stepIndex}`}
        className={`tour-fade-in fixed z-[60] w-72 rounded-xl border border-surface-border bg-white p-4 shadow-elevated transition-[top,left] duration-200 ${
          step.placement === "top" ? "-translate-y-full" : ""
        }`}
        style={{ top: bubbleTop, left: bubbleLeft }}
      >
        {step.placement === "bottom" && (
          <span className="absolute -top-1.5 left-6 h-3 w-3 rotate-45 border-l border-t border-surface-border bg-white" />
        )}
        {step.placement === "top" && (
          <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-surface-border bg-white" />
        )}

        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          Étape {stepIndex + 1} sur {STEPS.length}
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">{step.title}</p>
        <p className="mt-1.5 text-sm text-ink-soft">{step.text}</p>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={skip}
            className="text-xs font-medium text-ink-faint hover:text-ink-soft"
          >
            Passer la découverte
          </button>
          {isLastStep && (
            <button
              onClick={skip}
              className="text-xs font-medium text-brand-primary hover:underline"
            >
              Terminer la découverte
            </button>
          )}
        </div>
      </div>
    </>
  );
}
