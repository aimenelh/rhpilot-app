"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import type { MascotPose } from "@/components/Mascot";
import { AnimatedTourMascot } from "./AnimatedTourMascot";
import {
  TOUR_STORAGE_KEY,
  TOUR_DONE_VALUE,
  WELCOME_SEEN_KEY,
} from "@/lib/tourStorage";

const PRODUCT_TOUR_STORAGE_KEY = "rhpilot_product_tour_v3";

type TourStep = {
  route: string;
  selector: string | null;
  title: string;
  text: string;
  pose: MascotPose;
  eyebrow: string;
  checklist?: string[];
};

const STEPS: TourStep[] = [
  {
    route: "/dashboard",
    selector: '[data-tour="dashboard-attention"], #workspace-main h1',
    eyebrow: "Votre point de départ",
    title: "Le tableau de bord garde l’essentiel sous les yeux",
    text: "Priorités, échéances et points à traiter : c’est ici que vous voyez rapidement ce qui mérite votre attention aujourd’hui.",
    pose: "dashboard",
  },
  {
    route: "/dashboard/employees",
    selector: '[data-tour="add-employee"], #workspace-main h1',
    eyebrow: "Vos collaborateurs",
    title: "Chaque salarié a son espace de suivi",
    text: "Retrouvez les informations utiles, l’historique et les actions liées à chaque salarié sans disperser le suivi entre plusieurs fichiers.",
    pose: "hire",
  },
  {
    route: "/dashboard/events",
    selector: "#workspace-main h1",
    eyebrow: "Le cœur de RH Pilot",
    title: "Les parcours transforment un événement RH en plan d’action",
    text: "Embauche, période d’essai, visite médicale, fin de contrat… RH Pilot structure les tâches, responsables et échéances à suivre.",
    pose: "createJourney",
  },
  {
    route: "/dashboard/absences",
    selector: "#workspace-main h1",
    eyebrow: "Absences",
    title: "Demandes, justificatifs et planning restent au même endroit",
    text: "Vous gardez une vue claire sur les absences de l’équipe, leur statut et les documents associés, sans perdre le contexte.",
    pose: "calm",
  },
  {
    route: "/dashboard/obligations",
    selector: "#workspace-main h1",
    eyebrow: "Obligations RH",
    title: "Les obligations à anticiper deviennent visibles",
    text: "Entretiens de parcours professionnel, DUERP, CSE et autres échéances sont regroupés pour vous aider à identifier ce qui approche.",
    pose: "reminder",
  },
  {
    route: "/dashboard/calendar",
    selector: "#workspace-main h1",
    eyebrow: "Calendrier",
    title: "Toutes les échéances se retrouvent dans une même vue",
    text: "Le calendrier replace les tâches et événements RH dans le temps pour vous aider à anticiper plutôt que réagir au dernier moment.",
    pose: "reminder",
  },
  {
    route: "/dashboard/notifications",
    selector: "#workspace-main h1",
    eyebrow: "Notifications",
    title: "RH Pilot vous signale ce qui demande votre attention",
    text: "Les rappels font remonter les sujets utiles au bon moment, sans vous obliger à parcourir chaque module pour vérifier.",
    pose: "urgent",
  },
  {
    route: "/dashboard/team",
    selector: "#workspace-main h1",
    eyebrow: "Votre espace",
    title: "L’équipe travaille dans le même environnement",
    text: "Gérez les membres de votre espace RH Pilot et retrouvez les réglages de l’organisation dans Configuration.",
    pose: "calm",
  },
  {
    route: "/dashboard/employees",
    selector: 'button[aria-label="Ouvrir le Copilote RH Pilot"], button[aria-label="Fermer le Copilote"]',
    eyebrow: "Copilote RH Pilot",
    title: "Besoin d’un repère ? Le Copilote reste à portée de main",
    text: "Il vous aide à retrouver l’essentiel, comprendre ce qui se passe dans votre espace et mieux prioriser vos prochaines actions.",
    pose: "copilot",
  },
  {
    route: "/dashboard",
    selector: null,
    eyebrow: "Vous avez fait le tour",
    title: "Vous pouvez maintenant prendre RH Pilot en main",
    text: "Commencez par une première action concrète. Vous pourrez relancer cette visite à tout moment depuis la page Aide.",
    pose: "completedJourney",
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

  const readRect = useCallback((selector: string) => {
    const element = visibleTarget(selector);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { top: box.top, left: box.left, width: box.width, height: box.height };
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
      if (welcomeSeen && legacyTourState !== TOUR_DONE_VALUE && pathname !== "/dashboard") {
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
    if (pathname !== step.route) {
      setRect(null);
      return;
    }

    if (!step.selector) {
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

      if (attempts < 16) {
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

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
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
  const isLastStep = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const padding = 10;
  const spotlight = rect
    ? {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        right: Math.min(window.innerWidth, rect.left + rect.width + padding),
        bottom: Math.min(window.innerHeight, rect.top + rect.height + padding),
      }
    : null;
  const cardOnLeft = rect ? rect.left > window.innerWidth / 2 : false;
  const isChangingPage = pathname !== step.route;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Visite guidée RH Pilot">
      {spotlight ? (
        <>
          <div className="fixed left-0 right-0 top-0 bg-black/40" style={{ height: spotlight.top }} />
          <div className="fixed bottom-0 left-0 right-0 bg-black/40" style={{ top: spotlight.bottom }} />
          <div
            className="fixed left-0 bg-black/40"
            style={{ top: spotlight.top, width: spotlight.left, height: spotlight.bottom - spotlight.top }}
          />
          <div
            className="fixed right-0 bg-black/40"
            style={{ top: spotlight.top, left: spotlight.right, height: spotlight.bottom - spotlight.top }}
          />
          <div
            className="pointer-events-none fixed z-[72] rounded-xl ring-2 ring-brand-primary/80 ring-offset-4 ring-offset-white/70 transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.right - spotlight.left,
              height: spotlight.bottom - spotlight.top,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/40" />
      )}

      <div
        className={`tour-fade-in fixed z-[75] w-[min(25rem,calc(100vw-2rem))] overflow-visible rounded-2xl border border-surface-border bg-white shadow-elevated ${
          rect ? (cardOnLeft ? "bottom-6 left-6" : "bottom-6 right-6") : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        } max-md:bottom-4 max-md:left-4 max-md:right-4 max-md:top-auto max-md:w-auto max-md:translate-x-0 max-md:translate-y-0`}
      >
        <div className="absolute -top-20 left-4 z-10 max-sm:-top-14">
          <AnimatedTourMascot pose={step.pose} stepKey={stepIndex} />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="h-1 bg-surface-subtle">
            <div className="h-full bg-brand-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="relative px-5 pb-5 pt-14 max-sm:pt-12">
            <button
              type="button"
              onClick={finishTour}
              aria-label="Quitter la visite guidée"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-subtle hover:text-ink"
            >
              <X size={16} />
            </button>

            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary">{step.eyebrow}</p>
            <h2 className="mt-1.5 max-w-[20rem] text-base font-semibold leading-snug text-ink">{step.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{step.text}</p>

            {isChangingPage && (
              <p className="mt-3 text-xs font-medium text-ink-faint">Ouverture de la page…</p>
            )}

            {step.checklist && (
              <div className="mt-4 rounded-xl border border-surface-border bg-surface-subtle/60 p-3.5">
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

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || isChangingPage}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowLeft size={14} />
                  Précédent
                </button>
                <span className="text-[11px] tabular-nums text-ink-faint">{stepIndex + 1}/{STEPS.length}</span>
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
                  Suivant
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
