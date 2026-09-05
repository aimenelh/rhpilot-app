"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { StoryStep1, StoryStep2, StoryStep3 } from "@/components/landing/StorySteps";

const STEPS = [
  { caption: "Vous embauchez Julie Martin.", Step: StoryStep1 },
  { caption: "RH Pilot génère automatiquement le plan d'action.", Step: StoryStep2 },
  { caption: "Les rappels arrivent naturellement, sans y penser.", Step: StoryStep3 },
];

// Les 3 poses du cycle de marche, dimensions réelles des fichiers
// (nécessaires à next/image pour calculer le bon ratio). La ligne de
// sol (les pieds) est alignée sur le bord bas de chacune.
const WALK_POSES = [
  { src: "/illustrations/illu-walk-1.png", width: 555, height: 906 },
  { src: "/illustrations/illu-walk-2.png", width: 275, height: 914 },
  { src: "/illustrations/illu-walk-3.png", width: 533, height: 903 },
];
const WALK_CYCLE = [0, 1, 2, 1];
const STRIDE = 0.12;

export function JourneyFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const walkerDesktopRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const poseIndexRef = useRef(0);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    if (mql.matches) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Le personnage avance le long du tracé en fonction de la position de
  // scroll. Position écrite directement via ref à chaque frame ; la
  // pose passe par du state, mise à jour seulement quand elle change.
  useEffect(() => {
    if (reducedMotion) return;
    const node = ref.current;
    if (!node) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));

      if (walkerDesktopRef.current) {
        walkerDesktopRef.current.style.left = `${progress * 100}%`;
      }

      const step = Math.floor(progress / STRIDE) % WALK_CYCLE.length;
      const nextPose = WALK_CYCLE[step];
      if (nextPose !== poseIndexRef.current) {
        poseIndexRef.current = nextPose;
        setPoseIndex(nextPose);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  const pose = WALK_POSES[poseIndex];

  return (
    <div ref={ref} className="relative mx-auto mt-12 max-w-4xl">
      {/* ---------- Desktop : flux horizontal ---------- */}
      <div className="relative hidden items-start justify-between md:flex">
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[52px] h-px origin-left bg-gradient-to-r from-brand-primary/10 via-brand-primary/30 to-brand-primary-dark/10 transition-transform duration-[1200ms] ease-out"
          style={{ transform: visible ? "scaleX(1)" : "scaleX(0)" }}
        />
        {visible && !reducedMotion && (
          <div
            ref={walkerDesktopRef}
            aria-hidden
            className="pointer-events-none absolute top-[52px] left-0 z-20 -translate-x-1/2 -translate-y-full"
          >
            <Image
              src={pose.src}
              alt=""
              width={pose.width}
              height={pose.height}
              className="h-14 w-auto drop-shadow-md"
            />
          </div>
        )}

        {STEPS.map(({ caption, Step }, i) => (
          <div
            key={i}
            className="relative z-10 flex w-56 flex-col items-center gap-3 text-center transition-all duration-700 ease-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)",
              transitionDelay: visible ? `${i * 200}ms` : "0ms",
            }}
          >
            <Step />
            <p className="text-sm text-ink-soft">{caption}</p>
          </div>
        ))}
      </div>

      {/* ---------- Mobile : flux vertical ---------- */}
      {/* Pas de personnage ici : sur une colonne aussi étroite, les
          légendes prennent toute la largeur des deux côtés de la
          ligne, aucun endroit où le poser sans chevaucher le texte.
          La ligne et les étapes suffisent à raconter la séquence. */}
      <div className="relative mx-auto flex max-w-xs flex-col items-center gap-3 md:hidden">
        <div
          aria-hidden
          className="absolute bottom-4 left-1/2 top-4 w-px origin-top -translate-x-1/2 bg-gradient-to-b from-brand-primary/10 via-brand-primary/30 to-brand-primary-dark/10 transition-transform duration-[1200ms] ease-out"
          style={{ transform: visible ? "scaleY(1)" : "scaleY(0)" }}
        />

        {STEPS.map(({ caption, Step }, i) => (
          <div
            key={i}
            className="relative z-10 flex w-full flex-col items-center gap-3 py-2 transition-all duration-700 ease-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transitionDelay: visible ? `${i * 200}ms` : "0ms",
            }}
          >
            <Step />
            <p className="text-sm text-ink-soft">{caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
