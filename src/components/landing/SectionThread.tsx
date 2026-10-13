"use client";

import { useEffect, useRef } from "react";
import s from "./SectionThread.module.css";

type SectionThreadProps = {
  /** Côté par lequel le fil entre dans la section : il ressort par l'autre. */
  from: "left" | "right";
  /** Couleur du fil : corail sur fond clair, blanc sur aplat corail. */
  tone?: "coral" | "white";
};

/**
 * Le fil qui traverse la page d'accueil d'un chapitre à l'autre.
 * Il entre par un bord, vient souligner la dernière ligne du titre marqué
 * `data-thread-target`, puis ressort par le bord opposé, sous le bloc marqué
 * `data-thread-zone` (le titre lui-même s'il n'y en a pas). D'une section à la
 * suivante, il alterne de sens : la page se lit comme une couture.
 *
 * À placer en premier enfant d'une section en `position: relative`, dont le
 * contenu passe au-dessus (z-index 1). Tracé en pixels réels à partir du titre,
 * recalculé au redimensionnement ; dessiné quand la section entre à l'écran,
 * tout de suite si le visiteur préfère un mouvement réduit.
 */
export function SectionThread({ from, tone = "coral" }: SectionThreadProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    const section = svg?.parentElement;
    const path = svg?.querySelector("path");
    if (!svg || !section || !path) return;

    // Positions de mise en page, sans les transformations des animations d'apparition
    // (sinon le fil se calerait sur un titre encore en mouvement).
    const offsetIn = (el: HTMLElement) => {
      let x = 0;
      let y = 0;
      let node: HTMLElement | null = el;
      while (node && node !== section) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return { x, y };
    };

    const draw = () => {
      const target = section.querySelector<HTMLElement>("[data-thread-target]");
      if (!target) return;
      const zone = section.querySelector<HTMLElement>("[data-thread-zone]") ?? target;
      const range = document.createRange();
      range.selectNodeContents(target);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 2);
      if (!rects.length) return;
      // Lignes du titre, ramenées dans le repère du titre puis de la section.
      const tr = target.getBoundingClientRect();
      const kx = target.offsetWidth / (tr.width || 1);
      const ky = target.offsetHeight / (tr.height || 1);
      const at = offsetIn(target);
      const lines = rects.map((r) => ({
        left: at.x + (r.left - tr.left) * kx,
        right: at.x + (r.right - tr.left) * kx,
        bottom: at.y + (r.bottom - tr.top) * ky,
      }));
      const lastBottom = Math.max(...lines.map((r) => r.bottom));
      const line = lines.filter((r) => r.bottom > lastBottom - 4);
      const fs = parseFloat(getComputedStyle(target).fontSize) || 40;
      const W = section.clientWidth;
      const H = section.clientHeight;
      const left = Math.min(...line.map((r) => r.left));
      const right = Math.max(...line.map((r) => r.right));
      // Sous la ligne de base de la dernière ligne du titre, comme le fil sous « H Pilot ».
      const yU = lastBottom - fs * 0.04;
      // Couloir d'entrée et de sortie : sous le bloc d'en-tête quand le texte voisin est à côté
      // du titre (grand écran) ; juste sous le titre quand il passe dessous (téléphone),
      // pour ne jamais traverser un paragraphe.
      const zoneBottom = offsetIn(zone).y + zone.offsetHeight;
      const yLow = zoneBottom - lastBottom > fs ? yU + 22 : zoneBottom + 26;
      const span = right - left;
      const f = (n: number) => n.toFixed(1);
      const near = from === "right" ? right : left;
      const far = from === "right" ? left : right;
      const dir = from === "right" ? -1 : 1;
      const edgeIn = from === "right" ? W + 40 : -40;
      const edgeOut = from === "right" ? -40 : W + 40;
      const d = [
        `M ${f(edgeIn)} ${f(yLow + 4)}`,
        `C ${f(edgeIn + dir * (Math.abs(edgeIn - near) * 0.55))} ${f(yLow + 2)} ${f(near - dir * fs * 1.1)} ${f(yU + 3)} ${f(near - dir * fs * 0.15)} ${f(yU)}`,
        `C ${f(near + dir * span * 0.35)} ${f(yU - 3)} ${f(far - dir * span * 0.35)} ${f(yU + 3)} ${f(far)} ${f(yU)}`,
        `C ${f(far + dir * fs * 0.9)} ${f(yU - 1)} ${f(edgeOut - dir * (Math.abs(edgeOut - far) * 0.5))} ${f(yLow + 10)} ${f(edgeOut)} ${f(yLow + 14)}`,
      ].join(" ");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      path.setAttribute("d", d);
      svg.dataset.ready = "true";
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(section);
    void document.fonts?.ready.then(draw);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    if (reduce.matches) {
      svg.dataset.drawn = "instant";
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            svg.dataset.drawn = "true";
            observer?.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      observer.observe(section);
    }
    return () => {
      ro.disconnect();
      observer?.disconnect();
    };
  }, [from]);

  return (
    <svg ref={ref} className={s.thread} data-tone={tone} aria-hidden="true" focusable="false">
      <path pathLength={1} />
    </svg>
  );
}
