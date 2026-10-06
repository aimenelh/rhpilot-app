"use client";

import { useEffect } from "react";

/** Mise en scène au défilement, en amélioration progressive.
 *  Pose data-stage="ready" sur la section (état de départ des animations), puis
 *  data-stage="go" quand l'élément observé entre à l'écran. Rien n'est posé si le
 *  visiteur préfère un mouvement réduit ou si l'élément est déjà visible au
 *  chargement : le contenu reste alors affiché tel quel. */
export function ScrollStage({ scopeId, watch, threshold = 0.25 }: { scopeId: string; watch: string; threshold?: number }) {
  useEffect(() => {
    const scope = document.getElementById(scopeId);
    const target = scope?.querySelector(watch);
    if (!scope || !target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (target.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    scope.setAttribute("data-stage", "ready");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          scope.setAttribute("data-stage", "go");
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      scope.removeAttribute("data-stage");
    };
  }, [scopeId, watch, threshold]);
  return null;
}
