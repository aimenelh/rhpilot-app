"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import { AnimatedTourMascot, type TourMascotPose } from "./AnimatedTourMascot";
import {
  TOUR_STORAGE_KEY,
  TOUR_DONE_VALUE,
  WELCOME_SEEN_KEY,
} from "@/lib/tourStorage";

const PRODUCT_TOUR_STORAGE_KEY = "rhpilot_product_tour_v4";

type TourStep = {
  route: string;
  selector: string | null;
  eyebrow: string;
  title: string;
  text: string;
  pose: TourMascotPose;
  checklist?: string[];
};

const STEPS: TourStep[] = [
  {
    route: "/dashboard",
    selector: null,
    eyebrow: "Bienvenue",
    title: "Bienvenue dans RH Pilot",
    text: "Je vais vous montrer les principaux espaces du logiciel pour vous aider à prendre vos repères. La visite prend moins de deux minutes.",
    pose: "welcome",
  },
  {
    route: "/dashboard",
    selector: '[data-tour="dashboard-attention"], #workspace-main h1',
    eyebrow: "Tableau de bord",
    title: "Gardez l’essentiel sous les yeux",
    text: "Priorités, échéances et points à traiter : le tableau de bord vous montre ce qui mérite votre attention en premier.",
    pose: "present",
  },
  {
    route: "/dashboard/employees",
    selector: '[data-tour="add-employee"], #workspace-main h1',
    eyebrow: "Salariés",
    title: "Chaque salarié a son espace de suivi",
    text: "Retrouvez les informations utiles, l’historique et les éléments liés à chaque salarié sans disperser votre suivi.",
    pose: "point",
  },
  {
    route: "/dashboard/events",
    selector: "#workspace-main h1",
    eyebrow: "Parcours",
    title: "Transformez un événement RH en plan d’action",
    text: "Embauche, période d’essai, visite médicale ou fin de contrat : RH Pilot structure les actions, responsables et échéances à suivre.",
    pose: "present",
  },
  {
    route: "/dashboard/absences",
    selector: "#workspace-main h1",
    eyebrow: "Absences",
    title: "Demandes, justificatifs et planning restent réunis",
    text: "Le module Absences centralise les demandes, leur statut, les justificatifs et la visibilité équipe dans un même espace.",
    pose: "point",
  },
  {
    route: "/dashboard/obligations",
    selector: "#workspace-main h1",
    eyebrow: "Obligations RH",
    title: "Anticipez ce qui doit l’être",
    text: "Entretiens de parcours, DUERP, CSE et autres échéances sont regroupés pour vous aider à repérer rapidement ce qui approche.",
    pose: "tip",
  },
  {
    route: "/dashboard/calendar",
    selector: "#workspace-main h1",
    eyebrow: "Calendrier",
    title: "Replacez vos sujets RH dans le temps",
    text: "Le calendrier rassemble les tâches et événements à venir pour vous aider à anticiper plutôt que réagir au dernier moment.",
    pose: "present",
  },
  {
    route: "/dashboard/notifications",
    selector: "#workspace-main h1",
    eyebrow: "Notifications",
    title: "Les rappels font remonter ce qui compte",
    text: "RH Pilot vous signale les sujets utiles au bon moment, sans vous obliger à parcourir chaque module pour vérifier.",
    pose: "tip",
  },
  {
    route: "/dashboard/team",
    selector: "#workspace-main h1",
    eyebrow: "Équipe",
    title: "Travaillez dans le même environnement",
    text: "Gérez ici les membres de votre espace RH Pilot et répartissez plus facilement le suivi entre les personnes concernées.",
    pose: "present",
  },
  {
    route: "/dashboard",
    selector: 'button[aria-label="Ouvrir le Copilote RH Pilot"], button[aria-label="Fermer le Copilote"]',
    eyebrow: "Copilote",
    title: "Besoin d’un repère ? Le Copilote reste à portée de main",
    text: "Il vous aide à retrouver l’essentiel, comprendre votre espace et mieux prioriser vos prochaines actions.",
    pose: "point",
  },
  {
    route: "/dashboard",
    selector: null,
    eyebrow: "C’est parti",
    title: "Vous avez vu l’essentiel",
    text: "Vous pouvez maintenant commencer votre suivi dans RH Pilot. Vous pourrez relancer cette visite à tout moment depuis la page Aide.",
    pose: "success",
    checklist: [
      "Ajouter un premier salarié",
      "Créer ou déclencher un premier parcours",
      "Vérifier les échéances du calendrier",
      "Découvrir les absences",
      "Explorer les obligations RH",
    ],
  },
];

type Rect = { top: number; left: number; width: number; height: number };
type Viewport = { width: number; height: number };

function visibleTarget(selector: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    candidates.find((element) => {
      const box = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }) ?? null
  );
}

export function TourGuide() {
  const pathname = usePathname();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1440, height: 900 });

  const readRect = useCallback((selector: string) => {
    const element = visibleTarget(selector);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { top: box.top, left: box.left, width: box.width, height: box.height };
  }, []);

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const replayRequested = params.get("tour") === "1";

      if (replayRequested) {
        localStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, "0");
        setStepIndex(0);

        params.delete("tour");
        const query = params.toString();
        const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history.replaceState(window.history.state, "", cleanUrl);
        return;
      }

      const stored = localStorage.getItem(PRODUCT_TOUR_STORAGE_KEY);
      if (stored === TOUR_DONE_VALUE) {
        setStepIndex(null);
        return;
      }

      if (stored !== null) {
        const savedIndex = Number(stored);
        if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < STEPS.length) {
          setStepIndex(savedIndex);
          return;
        }
      }

      const welcomeSeen = Boolean(localStorage.getItem(WELCOME_SEEN_KEY));
      const legacyTourState = localStorage.getItem(TOUR_STORAGE_KEY);
      if (welcomeSeen && legacyTourState !== TOUR_DONE_VALUE) {
        localStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, "0");
        setStepIndex(0);
      }
    } catch {
      // Le produit reste utilisable si le stockage navigateur est indisponible.
    }
  }, [pathname]);

  useEffect(() => {
    if (stepIndex === null) return;
    const step = STEPS[stepIndex];
    if (pathname !== step.route) {
      setRect(null);
      router.push(step.route);
    }
  }, [pathname, router, stepIndex]);

  useEffect(() => {
    if (stepIndex === null) {
      setRect(null);
      return;
    }

    const step = STEPS[stepIndex];
    if (pathname !== step.route || !step.selector) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const measure = () => {
      if (cancelled || !step.selector) return;
      const target = visibleTarget(step.selector);
      if (target) {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        timeout = setTimeout(() => {
          if (cancelled || !step.selector) return;
          const nextRect = readRect(step.selector);
          if (nextRect) setRect(nextRect);
        }, 220);
        return;
      }

      if (attempts < 18) {
        attempts += 1;
        timeout = setTimeout(measure, 120);
      } else {
        setRect(null);
      }
    };

    measure();

    const onViewportChange = () => {
      if (!step.selector) return;
      const nextRect = readRect(step.selector);
      if (nextRect) setRect(nextRect);
    };

    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [pathname, readRect, stepIndex]);

  useEffect(() => {
    if (stepIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishTour();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  function persist(index: number | "done") {
    try {
      localStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, index === "done" ? TOUR_DONE_VALUE : String(index));
      if (index === "done") localStorage.setItem(TOUR_STORAGE_KEY, TOUR_DONE_VALUE);
    } catch {
      // Sans conséquence grave si ça échoue.
    }
  }

  function goNext() {
    if (stepIndex === null) return;
    if (stepIndex >= STEPS.length - 1) {
      finishTour();
      return;
    }
    const next = stepIndex + 1;
    persist(next);
    setRect(null);
    setStepIndex(next);
  }

  function goBack() {
    if (stepIndex === null || stepIndex === 0) return;
    const previous = stepIndex - 1;
    persist(previous);
    setRect(null);
    setStepIndex(previous);
  }

  function finishTour() {
    persist("done");
    setRect(null);
    setStepIndex(null);
  }

  if (stepIndex === null) return null;

  const step = STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const isChangingPage = pathname !== step.route;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const padding = 10;
  const spotlight = rect
    ? {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        right: Math.min(viewport.width, rect.left + rect.width + padding),
        bottom: Math.min(viewport.height, rect.top + rect.height + padding),
      }
    : null;
  const cardOnLeft = rect ? rect.left + rect.width / 2 > viewport.width / 2 : false;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Visite guidée RH Pilot">
      {spotlight ? (
        <>
          <div className="fixed left-0 right-0 top-0 bg-black/38" style={{ height: spotlight.top }} />
          <div className="fixed bottom-0 left-0 right-0 bg-black/38" style={{ top: spotlight.bottom }} />
          <div
            className="fixed left-0 bg-black/38"
            style={{ top: spotlight.top, width: spotlight.left, height: spotlight.bottom - spotlight.top }}
          />
          <div
            className="fixed right-0 bg-black/38"
            style={{ top: spotlight.top, left: spotlight.right, height: spotlight.bottom - spotlight.top }}
          />
          <div
            className="pointer-events-none fixed z-[72] rounded-xl ring-2 ring-brand-primary/75 ring-offset-4 ring-offset-white/70 transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.right - spotlight.left,
              height: spotlight.bottom - spotlight.top,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/38" />
      )}

      <div
        className={`tour-fade-in fixed z-[75] w-[min(31rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-surface-border bg-white shadow-elevated ${
          rect ? (cardOnLeft ? "bottom-6 left-6" : "bottom-6 right-6") : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        } max-md:bottom-4 max-md:left-4 max-md:right-4 max-md:top-auto max-md:w-auto max-md:translate-x-0 max-md:translate-y-0`}
      >
        <div className="h-1 bg-surface-subtle">
          <div className="h-full bg-brand-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="relative p-5">
          <button
            type="button"
            onClick={finishTour}
            aria-label="Quitter la visite guidée"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-subtle hover:text-ink"
          >
            <X size={16} />
          </button>

          <div className="grid grid-cols-[9rem_1fr] items-end gap-4 pr-7 max-sm:grid-cols-[6rem_1fr] max-sm:gap-3">
            <AnimatedTourMascot pose={step.pose} stepKey={stepIndex} />
            <div className="min-w-0 self-center pb-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary">{step.eyebrow}</p>
                <span className="text-[11px] tabular-nums text-ink-faint">{stepIndex + 1}/{STEPS.length}</span>
              </div>
              <h2 className="mt-1.5 text-base font-semibold leading-snug text-ink">{step.title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{step.text}</p>
              {isChangingPage && <p className="mt-2 text-xs font-medium text-ink-faint">Ouverture de la page…</p>}
            </div>
          </div>

          {step.checklist && (
            <div className="mt-4 rounded-xl border border-surface-border bg-surface-subtle/55 p-3.5">
              <p className="mb-2.5 text-xs font-semibold text-ink">Pour bien démarrer</p>
              <div className="space-y-2">
                {step.checklist.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-surface-border pt-4">
            <div className="flex items-center gap-2">
              {isFirstStep ? (
                <button
                  type="button"
                  onClick={finishTour}
                  className="h-9 rounded-lg px-2 text-xs font-medium text-ink-faint transition-colors hover:text-ink"
                >
                  Passer la visite
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-subtle"
                >
                  <ArrowLeft size={14} />
                  Précédent
                </button>
              )}
            </div>

            {isLastStep ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/employees/new"
                  onClick={finishTour}
                  className="hidden rounded-lg border border-brand-primary/25 px-3 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary/5 sm:inline-flex"
                >
                  Ajouter un salarié
                </Link>
                <button
                  type="button"
                  onClick={finishTour}
                  className="inline-flex h-9 items-center rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Terminer
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={isChangingPage}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-55"
              >
                {isFirstStep ? "Commencer" : "Suivant"}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
