"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

type DemoStep = {
  image: string;
  alt: string;
  // Étiquette courte affichée en tête de la bulle (ex. "Maxime Renard").
  tooltip: string;
  // Phrase complète affichée dans la bulle : ce que la personne
  // regarde, et pourquoi elle clique à cet endroit précis.
  instruction: string;
  cursor: { x: number; y: number };
};

// Les captures 3 et 4 réutilisent volontairement la même image
// (fiche-salarie.png) : on ne dispose que d'une seule capture de la
// fiche de Maxime, donc le point cliquable se déplace deux fois dessus
// avant de passer à l'écran suivant.
//
// Position du point cliquable (`cursor`) en % de la largeur/hauteur de
// l'image d'origine, indépendant de la taille d'affichage réelle. Pour
// ajuster un point : ouvrir l'image en pleine taille, repérer le point
// visé, puis x = (position horizontale / largeur totale) * 100,
// y = (position verticale / hauteur totale) * 100. La bulle se
// repositionne toute seule selon la proximité des bords (voir
// `getBubblePlacement` plus bas), pas besoin d'y toucher.
const DEMO_STEPS: DemoStep[] = [
  {
    image: "/demo/dashboard-vue-ensemble.png",
    alt: "Tableau de bord RH Pilot avec deux tâches en retard signalées",
    tooltip: "2 en retard",
    instruction: "Le tableau de bord signale 2 tâches en retard. Cliquez sur le chiffre pour demander au Copilote de qui il s'agit.",
    cursor: { x: 21, y: 9 },
  },
  {
    image: "/demo/dashboard-copilote.png",
    alt: "Réponse du Copilote RH Pilot sur les parcours à risque",
    tooltip: "Maxime Renard",
    instruction: "Le Copilote a répondu : Maxime Renard est concerné. Cliquez sur son nom pour ouvrir sa fiche.",
    cursor: { x: 43, y: 73 },
  },
  {
    image: "/demo/fiche-salarie.png",
    alt: "Fiche du salarié Maxime Renard avec son parcours d'embauche",
    tooltip: "Voir le parcours",
    instruction: "Vous êtes sur la fiche de Maxime Renard. Cliquez sur son parcours d'embauche pour voir le détail des tâches.",
    cursor: { x: 68, y: 73 },
  },
  {
    image: "/demo/fiche-salarie.png",
    alt: "Parcours d'embauche de Maxime Renard avec deux tâches en retard",
    tooltip: "2 tâches à faire",
    instruction: "Le parcours affiche encore 2 tâches en retard. Cliquez pour voir comment elles avancent.",
    cursor: { x: 26, y: 75 },
  },
  {
    image: "/demo/parcours-avance.png",
    alt: "Étapes du parcours marquées comme faites",
    tooltip: "Fait",
    instruction: "Les tâches se cochent au fur et à mesure, jusqu'à la fin du parcours. Cliquez pour continuer.",
    cursor: { x: 55, y: 83 },
  },
  {
    image: "/demo/suggestions.png",
    alt: "Panneau de suggestions proactives de RH Pilot",
    tooltip: "Créer le parcours",
    instruction: "RH Pilot détecte aussi les oublis avant qu'ils ne deviennent un problème. Cliquez pour créer le parcours manquant.",
    cursor: { x: 67, y: 57 },
  },
  {
    image: "/demo/suggestions-parcours-cree.png",
    alt: "Parcours d'embauche généré automatiquement pour Julien Marchand",
    tooltip: "Voir le calendrier",
    instruction: "Le parcours d'embauche de Julien Marchand vient d'être généré automatiquement. Cliquez sur Calendrier pour voir la suite.",
    cursor: { x: 6, y: 26 },
  },
  {
    image: "/demo/calendrier.png",
    alt: "Vue calendrier de toutes les échéances RH",
    tooltip: "Recommencer",
    instruction: "Toutes les échéances RH, de toute l'organisation, apparaissent au même endroit. Cliquez pour recommencer la démo.",
    cursor: { x: 6, y: 6 },
  },
];

// Position du bouton "Commencer la démo" sur l'écran d'intro, dans le
// même système de coordonnées que les points cliquables ci-dessus.
const INTRO_TARGET = { x: 50, y: 72 };

// Hauteur fixe de la barre façon navigateur (les trois points), en
// pixels. Sert à aligner exactement la zone cliquable/bulle sur
// l'image, qui commence juste en dessous.
const CHROME_BAR_HEIGHT = 36;

// Sur mobile, forcer l'image à occuper toute la largeur de l'écran la
// rendrait illisible (ce sont des captures d'interface desktop, avec
// du texte fin). On l'affiche donc à une taille lisible fixe, quitte
// à devoir la faire défiler horizontalement — avec un recentrage
// automatique sur le point cliquable à chaque étape (voir plus bas).
const MOBILE_IMAGE_HEIGHT = 260;
const MOBILE_IMAGE_WIDTH = Math.round(MOBILE_IMAGE_HEIGHT * (1882 / 1030));

const TRAVEL_MS = 650; // le point cliquable se déplace vers sa cible
const CLICK_MS = 350; // effet de clic avant de passer à l'écran suivant
const FADE_MS = 300; // fondu entre deux captures

type Phase = "arriving" | "waiting" | "clicking";

// Choisit de quel côté du point afficher la bulle d'explication, pour
// qu'elle reste toujours visible à l'intérieur du cadre plutôt que de
// se faire rogner près d'un bord (c'est le bug corrigé ici : la bulle
// sortait du cadre quand le point était trop près du haut ou du bord
// gauche).
function getBubblePlacement(x: number, y: number) {
  const side: "top" | "bottom" = y < 22 ? "bottom" : "top";
  const align: "start" | "center" | "end" = x < 18 ? "start" : x > 82 ? "end" : "center";
  return { side, align };
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10" />
      <span className={`text-2xl font-semibold ${light ? "text-white" : "text-ink"}`}>
        RH <span className="text-brand-blue">Pilot</span>
      </span>
    </div>
  );
}

export function InteractiveDemo() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [isFading, setIsFading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isFirstRender = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // À chaque changement d'écran (intro -> étape 1, étape 1 -> étape 2,
  // ..., dernière étape -> écran de fin), le point cliquable "arrive"
  // avant de devenir cliquable (et avant que sa bulle n'apparaisse).
  // Pas d'animation d'arrivée au tout premier affichage.
  useEffect(() => {
    if (prefersReducedMotion) return;
    clearTimers();
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setPhase("waiting");
      return;
    }
    setPhase("arriving");
    const t = setTimeout(() => setPhase("waiting"), TRAVEL_MS);
    timers.current.push(t);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, index, isFinished, prefersReducedMotion]);

  useEffect(() => clearTimers, []);

  const goToIndex = (next: number) => {
    clearTimers();
    setIsFading(true);
    const t = setTimeout(() => {
      setIndex(next);
      setIsFading(false);
    }, FADE_MS);
    timers.current.push(t);
  };

  const handleHotspotClick = () => {
    if (phase !== "waiting") return;
    setPhase("clicking");
    const t = setTimeout(() => {
      if (!hasStarted) {
        setHasStarted(true);
      } else if (index === DEMO_STEPS.length - 1) {
        // Dernière étape : direction l'écran de fin plutôt qu'une
        // boucle silencieuse vers le début.
        setIsFading(true);
        const t2 = setTimeout(() => {
          setIsFinished(true);
          setIsFading(false);
        }, FADE_MS);
        timers.current.push(t2);
      } else {
        goToIndex(index + 1);
      }
    }, CLICK_MS);
    timers.current.push(t);
  };

  const handleBack = () => {
    if (!hasStarted) return;
    if (isFinished) {
      // Retour à la dernière étape depuis l'écran de fin.
      clearTimers();
      setIsFading(true);
      const t = setTimeout(() => {
        setIsFinished(false);
        setIsFading(false);
      }, FADE_MS);
      timers.current.push(t);
      return;
    }
    goToIndex((index - 1 + DEMO_STEPS.length) % DEMO_STEPS.length);
  };

  // Revoir les 8 étapes directement, sans repasser par l'écran d'intro.
  const handleReplay = () => {
    clearTimers();
    setIsFading(true);
    const t = setTimeout(() => {
      setIndex(0);
      setIsFinished(false);
      setIsFading(false);
    }, FADE_MS);
    timers.current.push(t);
  };

  const handleRestart = () => {
    clearTimers();
    setIsFading(true);
    const t = setTimeout(() => {
      setHasStarted(false);
      setIsFinished(false);
      setIndex(0);
      setIsFading(false);
    }, FADE_MS);
    timers.current.push(t);
  };

  const step = hasStarted && !isFinished ? DEMO_STEPS[index] : null;
  const target = step ? step.cursor : INTRO_TARGET;

  // Vue compacte scrollable : uniquement sur mobile, et seulement
  // pendant une vraie étape (pas sur l'intro / l'écran de fin, qui
  // n'ont pas besoin de cette largeur supplémentaire).
  const useCompactMobileFrame = isMobile && hasStarted && !isFinished;

  // Recentre la vue sur le point cliquable à chaque changement
  // d'étape, pour ne jamais laisser la personne chercher où défiler.
  useEffect(() => {
    if (!useCompactMobileFrame) return;
    const el = scrollRef.current;
    if (!el) return;
    const targetX = (target.x / 100) * MOBILE_IMAGE_WIDTH;
    const left = Math.max(0, targetX - el.clientWidth / 2);
    el.scrollTo({ left, behavior: prefersReducedMotion ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, hasStarted, isFinished, isMobile]);

  // Version simplifiée pour "mouvement réduit" : pas de point animé ni
  // de bulle, juste des captures et des boutons Précédent / Suivant
  // classiques, avec l'explication en texte simple au-dessus.
  if (prefersReducedMotion) {
    const isLastStep = index === DEMO_STEPS.length - 1;
    return (
      <div className="mx-auto max-w-4xl">
        {hasStarted && !isFinished && (
          <div className="mb-3 min-h-[3rem]">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
              Étape {index + 1} / {DEMO_STEPS.length}
            </span>
            <p className="mt-1 text-sm text-ink-soft">{DEMO_STEPS[index].instruction}</p>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-surface-border bg-surface-subtle px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-rose/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-amber/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-teal/50" />
          </div>
          <div className="relative aspect-[1882/1030] w-full bg-surface-subtle">
            {!hasStarted ? (
              <div className="flex h-full flex-col items-center justify-center gap-8 bg-ink px-8 text-center">
                <Logo light />
                <p className="max-w-sm text-sm text-white/70">
                  Suivez, étape par étape, comment RH Pilot repère un oubli RH et génère le plan
                  d&apos;action correspondant.
                </p>
                <Button onClick={() => setHasStarted(true)} className="px-6 py-3 text-base">
                  Commencer la démo
                </Button>
              </div>
            ) : isFinished ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink px-8 text-center">
                <Image src="/icon-192.png" alt="" width={56} height={56} className="h-14 w-14" />
                <h3 className="text-xl font-semibold text-white">Ce n&apos;était qu&apos;un aperçu.</h3>
                <p className="max-w-sm text-sm text-white/70">
                  RH Pilot a bien plus à montrer : parcours personnalisables, rappels automatiques,
                  recherche globale... La meilleure façon de le découvrir, c&apos;est de l&apos;essayer.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
                  <Link href="/sign-up">
                    <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
                  </Link>
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="text-sm font-medium text-white/70 hover:text-white hover:underline"
                  >
                    Revoir la démo
                  </button>
                </div>
              </div>
            ) : (
              <Image
                src={DEMO_STEPS[index].image}
                alt={DEMO_STEPS[index].alt}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 900px, 100vw"
              />
            )}
          </div>
        </div>
        {hasStarted && (
          <div className="mt-5 flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              className="!px-2.5 !py-2"
              aria-label="Étape précédente"
              onClick={handleBack}
            >
              <ChevronLeft size={16} />
            </Button>
            {!isFinished && (
              <Button
                variant="secondary"
                onClick={() => (isLastStep ? setIsFinished(true) : setIndex((i) => i + 1))}
              >
                {isLastStep ? "Terminer" : "Étape suivante"}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  const placement = getBubblePlacement(target.x, target.y);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Colonne capture : l'image et son point cliquable. En
            second sur mobile, pour que l'explication (colonne
            "Copilote" ci-dessous) se lise avant de regarder l'écran. */}
        <div className="order-2 lg:order-1">
        <div
          ref={useCompactMobileFrame ? scrollRef : undefined}
          className={useCompactMobileFrame ? "overflow-x-auto [-webkit-overflow-scrolling:touch]" : ""}
        >
        {/* Wrapper SANS overflow-hidden : c'est ce qui permet à
            l'étiquette de s'afficher entièrement même quand le point
            cliquable est tout près d'un bord, au lieu d'être rognée
            par le cadre. */}
        <div className="relative" style={useCompactMobileFrame ? { width: MOBILE_IMAGE_WIDTH } : undefined}>
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
          {/* Barre façon navigateur, cohérente avec le reste du site */}
          <div className="flex items-center gap-1.5 border-b border-surface-border bg-surface-subtle px-3" style={{ height: CHROME_BAR_HEIGHT }}>
            <span className="h-2.5 w-2.5 rounded-full bg-accent-rose/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-amber/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-teal/50" />
          </div>

          <div
            className={`relative bg-surface-subtle ${useCompactMobileFrame ? "" : "aspect-[1882/1030] w-full"}`}
            style={useCompactMobileFrame ? { width: MOBILE_IMAGE_WIDTH, height: MOBILE_IMAGE_HEIGHT } : undefined}
          >
            <div className={`absolute inset-0 transition-opacity duration-300 ${isFading ? "opacity-0" : "opacity-100"}`}>
              {!hasStarted ? (
                <div className="flex h-full flex-col items-center justify-start gap-6 bg-ink px-8 pt-[14%] text-center">
                  <Logo light />
                  <p className="max-w-sm text-sm text-white/70">
                    Suivez, étape par étape, comment RH Pilot repère un oubli RH et génère le plan
                    d&apos;action correspondant.
                  </p>
                </div>
              ) : isFinished ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink px-8 text-center">
                  <Image src="/icon-192.png" alt="" width={56} height={56} className="h-14 w-14" />
                  <h3 className="text-xl font-semibold text-white sm:text-2xl">
                    Ce n&apos;était qu&apos;un aperçu.
                  </h3>
                  <p className="max-w-sm text-sm text-white/70">
                    RH Pilot a bien plus à montrer. La meilleure façon de le découvrir, c&apos;est de
                    l&apos;essayer par vous-même.
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
                    <Link href="/sign-up">
                      <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
                    </Link>
                    <button
                      type="button"
                      onClick={handleReplay}
                      className="text-sm font-medium text-white/70 hover:text-white hover:underline"
                    >
                      Revoir la démo
                    </button>
                  </div>
                </div>
              ) : (
                <Image
                  src={DEMO_STEPS[index].image}
                  alt={DEMO_STEPS[index].alt}
                  fill
                  className="object-contain"
                  sizes="(min-width: 1024px) 820px, 100vw"
                />
              )}
            </div>
          </div>
        </div>

        {/* Calque du point cliquable + de sa bulle, dimensionné pour
            correspondre exactement à la zone image (donc décalé sous
            la barre façon navigateur), mais SANS être rogné par elle. */}
        <div
          role="group"
          aria-label="Démonstration interactive de RH Pilot"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
          style={{ top: CHROME_BAR_HEIGHT }}
        >
          <div className="relative h-full w-full">
            {!isFinished && (
            <button
              type="button"
              onClick={handleHotspotClick}
              disabled={phase !== "waiting"}
              aria-label={!hasStarted ? "Commencer la démo" : `${step?.tooltip}. ${step?.instruction}`}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] ease-out disabled:cursor-default"
              style={{ left: `${target.x}%`, top: `${target.y}%`, transitionDuration: `${TRAVEL_MS}ms` }}
            >
              {!hasStarted ? (
                // Sur l'intro, le point cliquable EST le bouton principal.
                <span className="relative inline-flex">
                  {phase === "waiting" && (
                    <span className="absolute -inset-3 animate-ping rounded-full bg-brand-blue/30" />
                  )}
                  <span
                    className={`relative inline-flex items-center justify-center rounded-lg bg-brand-gradient px-6 py-3 text-base font-medium text-white shadow-card transition-transform ${
                      phase === "clicking" ? "scale-95" : "scale-100"
                    }`}
                  >
                    Commencer la démo
                  </span>
                </span>
              ) : (
                <span className="relative flex h-11 w-11 items-center justify-center">
                  {phase === "waiting" && (
                    <span className="absolute h-8 w-8 animate-ping rounded-full bg-brand-blue/40" />
                  )}
                  <span
                    className={`relative flex items-center justify-center transition-transform ${
                      phase === "clicking" ? "scale-90" : "scale-100"
                    }`}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
                      <path
                        d="M4 2L4 20L9 15.3L12.4 21.8L15 20.4L11.6 14L18 14L4 2Z"
                        fill="white"
                        stroke="#14151A"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  {/* Étiquette courte : juste de quoi confirmer ce
                      qu'on s'apprête à cliquer, sans recouvrir le
                      contenu de la capture. L'explication complète
                      est au-dessus du cadre. */}
                  {phase === "waiting" && step && (
                    <div
                      className={`absolute z-20 max-w-[70vw] whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-left shadow-lg ${
                        placement.side === "top" ? "bottom-full mb-2.5" : "top-full mt-2.5"
                      } ${
                        placement.align === "start"
                          ? "left-0"
                          : placement.align === "end"
                            ? "right-0"
                            : "left-1/2 -translate-x-1/2"
                      }`}
                    >
                      <p className="text-xs font-medium text-white">{step.tooltip}</p>
                      <span
                        className={`absolute h-2.5 w-2.5 rotate-45 bg-ink ${
                          placement.side === "top" ? "-bottom-1" : "-top-1"
                        } ${
                          placement.align === "start"
                            ? "left-4"
                            : placement.align === "end"
                              ? "right-4"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      />
                    </div>
                  )}
                </span>
              )}
            </button>
            )}
          </div>
        </div>
        </div>
        </div>
        </div>

        {/* Colonne "Copilote" : l'explication complète, présentée
            comme une note du Copilote plutôt qu'un simple paragraphe
            perdu au-dessus de l'écran. En premier sur mobile, pour se
            lire avant de regarder la capture. */}
        <div className="order-1 lg:order-2">
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-white">
                R
              </span>
              <span className="text-sm font-semibold text-ink">Copilote RH Pilot</span>
              <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium text-brand-blue">
                IA
              </span>
            </div>
            <div className={`mt-3 transition-opacity duration-300 ${isFading ? "opacity-0" : "opacity-100"}`}>
              {!hasStarted ? (
                <p className="text-sm leading-relaxed text-ink-soft">
                  Cliquez sur le bouton pour lancer la visite guidée, capture par capture.
                </p>
              ) : isFinished ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Et ce n&apos;est pas tout
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
                      Parcours personnalisables pour chaque type d&apos;événement RH
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
                      Rappels automatiques, quotidiens ou hebdomadaires
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
                      Recherche globale sur les salariés et les tâches
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
                      Et bien d&apos;autres choses à découvrir
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Étape {index + 1} / {DEMO_STEPS.length}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{DEMO_STEPS[index].instruction}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation de secours (retour arrière, redémarrage, repères) */}
      {hasStarted && (
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button variant="ghost" className="!px-2.5 !py-2" aria-label="Étape précédente" onClick={handleBack}>
            <ChevronLeft size={16} />
          </Button>

          <div className="flex items-center gap-1.5" aria-hidden>
            {DEMO_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full ${i <= index ? "bg-brand-blue/60" : "bg-surface-border"}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            className="!px-2.5 !py-2"
            aria-label="Revoir l'introduction"
            onClick={handleRestart}
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
