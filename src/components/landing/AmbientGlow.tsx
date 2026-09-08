"use client";

import { useEffect, useRef, useState } from "react";

// Grain fin en SVG (turbulence en niveaux de gris) — statique, jamais animé :
// c'est la tache corail en dessous qui donne la vie, le grain donne juste
// une texture de papier plutôt qu'un aplat numérique plat.
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E";

/**
 * Fond ambiant de RH Pilot : grain léger + une masse de corail qui dérive
 * lentement. Remplace l'ancien réseau de points connectés (couleurs
 * bleu/violet hors charte, motif "IA générique").
 *
 * `animated=false` désactive la dérive et le parallax de scroll — à utiliser
 * sur les écrans où l'on travaille en continu (dashboard, fiches salarié),
 * où un fond qui bouge en permanence fatigue plus qu'il n'anime. Le grain,
 * lui, reste dans les deux cas puisqu'il est statique.
 */
export function AmbientGlow({
  className = "",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    if (mql.matches || !animated) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (parallaxRef.current) {
          parallaxRef.current.style.transform = `translateY(${window.scrollY * 0.02}px)`;
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [animated]);

  const shouldAnimate = animated && !reducedMotion;

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-white ${className}`}>
      {shouldAnimate && (
        <style>{`
          @keyframes ambientGlowDrift {
            0%, 100% { transform: translate(0%, 0%) scale(1); }
            50% { transform: translate(-2%, 2%) scale(1.05); }
          }
          .ambient-glow-blob { animation: ambientGlowDrift 30s ease-in-out infinite; }
        `}</style>
      )}

      <div
        ref={parallaxRef}
        className="absolute inset-0"
        style={{ willChange: shouldAnimate ? "transform" : undefined }}
      >
        <div
          className={`absolute -inset-[15%] ${shouldAnimate ? "ambient-glow-blob" : ""}`}
          style={{
            background:
              "radial-gradient(45% 40% at 20% 20%, rgba(232,67,46,0.07), transparent 65%), " +
              "radial-gradient(38% 38% at 85% 75%, rgba(184,50,31,0.05), transparent 65%)",
          }}
        />
      </div>

      <div
        className="absolute inset-0"
        style={{
          opacity: 0.4,
          backgroundImage: `url("${NOISE_SVG}")`,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}
