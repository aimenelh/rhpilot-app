"use client";

import { useEffect, useRef, useState } from "react";
import { StoryStep1, StoryStep2, StoryStep3 } from "@/components/landing/StorySteps";

const STEPS = [
  { caption: "Vous embauchez Julie Martin.", Step: StoryStep1 },
  { caption: "RH Pilot génère automatiquement le plan d'action.", Step: StoryStep2 },
  { caption: "Les rappels arrivent naturellement, sans y penser.", Step: StoryStep3 },
];

export function JourneyFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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

  return (
    <div ref={ref} className="relative mx-auto mt-12 max-w-4xl">
      <style>{`
        @keyframes journeyPulseX {
          0% { left: 0%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes journeyPulseY {
          0% { top: 0%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      {/* ---------- Desktop : flux horizontal ---------- */}
      <div className="relative hidden items-start justify-between md:flex">
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[52px] h-px origin-left bg-gradient-to-r from-brand-blue/10 via-brand-blue/30 to-brand-violet/10 transition-transform duration-[1200ms] ease-out"
          style={{ transform: visible ? "scaleX(1)" : "scaleX(0)" }}
        />
        {visible && !reducedMotion && (
          <span
            aria-hidden
            className="absolute top-[49px] h-1.5 w-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_2px_rgba(46,111,242,0.5)]"
            style={{ animation: "journeyPulseX 4.5s ease-in-out infinite", animationDelay: "1.2s" }}
          />
        )}

        {/* Le déroulé se lit dans l'ordre grâce à la ligne et au
            point qui la parcourt, plus besoin d'un numéro sur
            chaque étape pour ça, chaque visuel se suffit déjà. */}
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
      <div className="relative mx-auto flex max-w-xs flex-col items-center gap-3 md:hidden">
        <div
          aria-hidden
          className="absolute bottom-4 left-1/2 top-4 w-px origin-top -translate-x-1/2 bg-gradient-to-b from-brand-blue/10 via-brand-blue/30 to-brand-violet/10 transition-transform duration-[1200ms] ease-out"
          style={{ transform: visible ? "scaleY(1)" : "scaleY(0)" }}
        />
        {visible && !reducedMotion && (
          <span
            aria-hidden
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-blue shadow-[0_0_8px_2px_rgba(46,111,242,0.5)]"
            style={{ animation: "journeyPulseY 4.5s ease-in-out infinite", animationDelay: "1.2s" }}
          />
        )}

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
