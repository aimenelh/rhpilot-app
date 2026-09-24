"use client";

import { useEffect, useRef } from "react";
import { Logomark } from "@/components/Brand";
import s from "./BrandIntro.module.css";

// Nouvelle clé : chaque visiteur voit une fois la nouvelle introduction.
const VISIT_KEY = "rhpilot-brand-intro-v3";
// Repères de la chorégraphie (ms depuis le premier affichage), alignés sur
// BrandIntro.module.css. EXIT_AT : le fil se rembobine et la page prend le relais.
const EXIT_AT = 1650;
const END_AT = 2700;

// Exécuté pendant la lecture du HTML, avant le premier affichage : décide si
// l'introduction joue. Pas de flash de la page d'accueil avant l'intro, pas
// d'intro pour « mouvement réduit » ni au deuxième passage dans la session.
// Sans JavaScript, l'attribut reste "pending" et l'intro reste masquée.
const BOOT = `(function(){var el=document.currentScript&&document.currentScript.parentElement;if(!el)return;var play=true;try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)play=false;else if(sessionStorage.getItem("${VISIT_KEY}"))play=false;else sessionStorage.setItem("${VISIT_KEY}","1")}catch(e){}el.setAttribute("data-state",play?"play":"off")})();`;

// Le fil arrive depuis la gauche (bureau) ou depuis le bas (mobile), fait une
// boucle, puis dessine le contour du logo. Coordonnées en pixels réels, centrées
// sur l'écran : le contour tombe exactement sur le logo quelle que soit la taille.
const THREAD_WIDE =
  "M700 960 C860 990 1010 930 1120 850 C1215 780 1250 680 1190 660 C1130 640 1110 740 1180 780 C1250 820 1330 780 1347 700";
const THREAD_NARROW =
  "M1540 1135 C1530 1060 1450 1040 1470 960 C1490 880 1580 900 1560 950 C1540 1000 1450 980 1450 900 C1450 830 1440 752 1399 752";
const OUTLINE =
  "M1347 700 V674 A26 26 0 0 1 1373 648 H1425 A26 26 0 0 1 1451 674 V726 A26 26 0 0 1 1425 752 H1373 A26 26 0 0 1 1347 726 Z";
// Sur mobile, le fil arrive par-dessous : le contour démarre au milieu du bord bas.
const OUTLINE_NARROW =
  "M1399 752 H1373 A26 26 0 0 1 1347 726 V674 A26 26 0 0 1 1373 648 H1425 A26 26 0 0 1 1451 674 V726 A26 26 0 0 1 1425 752 Z";

export function BrandIntro() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || el.getAttribute("data-state") !== "play") return;
    const lockup = el.querySelector<HTMLElement>("[data-intro-logo]");
    const stage = lockup?.parentElement;

    // Position du logo dans l'en-tête : l'ensemble logo + nom s'y pose à la fin.
    // Départ mesuré sans transformation (repère fixe au centre), pour rester juste
    // même quand on remesure pendant le vol.
    const place = () => {
      const target = document.querySelector<HTMLElement>("[data-header-lockup] svg");
      if (!lockup || !stage || !target) return;
      const origin = stage.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const size = lockup.firstElementChild instanceof HTMLElement ? lockup.firstElementChild.offsetHeight : 0;
      if (!size || !b.height) return;
      el.style.setProperty("--fly-x", `${b.left - (origin.left + lockup.offsetLeft)}px`);
      el.style.setProperty("--fly-y", `${b.top - (origin.top + lockup.offsetTop)}px`);
      el.style.setProperty("--fly-k", String(b.height / size));
      el.style.setProperty("--fly-o", "1");
    };

    // Temps écoulé dans la chorégraphie, lu sur les animations CSS elles-mêmes.
    const elapsed = () => {
      const t = el.getAnimations({ subtree: true })[0]?.currentTime;
      return typeof t === "number" ? t : 0;
    };

    // Suivre l'en-tête pendant le vol (la barre d'annonce peut apparaître tard).
    let frame = 0;
    const follow = () => {
      place();
      if (elapsed() < END_AT) frame = requestAnimationFrame(follow);
    };
    const followTimer = window.setTimeout(follow, Math.max(0, EXIT_AT - elapsed() - 150));
    place();

    // Passer l'intro : toute la page avance jusqu'au rembobinage du fil, qui se
    // joue normalement. Le titre et les captures suivent sans à-coup.
    const skip = () => {
      const delta = EXIT_AT - elapsed();
      if (delta <= 0) return;
      place();
      document.getAnimations().forEach((animation) => {
        const t = animation.currentTime;
        if (typeof t === "number") animation.currentTime = t + delta;
      });
      window.clearTimeout(followTimer);
      cancelAnimationFrame(frame);
      follow();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab" || event.key === "Enter" || event.key === " ") skip();
    };
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });
    el.addEventListener("pointerdown", skip);
    window.addEventListener("resize", place);
    media.addEventListener("change", skip);
    const cleanup = window.setTimeout(() => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    }, END_AT + 400);
    return () => {
      window.clearTimeout(followTimer);
      window.clearTimeout(cleanup);
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      el.removeEventListener("pointerdown", skip);
      window.removeEventListener("resize", place);
      media.removeEventListener("change", skip);
    };
  }, []);

  return (
    <div ref={root} className={s.intro} data-state="pending" suppressHydrationWarning aria-hidden="true">
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <div className={s.paper} />
      <div className={s.stage}>
        <svg className={s.thread} width="3000" height="1400" viewBox="0 0 3000 1400" fill="none">
          <defs>
            <linearGradient id="rh-intro-tail-wide" gradientUnits="userSpaceOnUse" x1="720" y1="0" x2="930" y2="0">
              <stop offset="0" stopColor="#E8432E" stopOpacity="0" />
              <stop offset="1" stopColor="#E8432E" />
            </linearGradient>
            <linearGradient id="rh-intro-tail-narrow" gradientUnits="userSpaceOnUse" x1="0" y1="1125" x2="0" y2="1000">
              <stop offset="0" stopColor="#E8432E" stopOpacity="0" />
              <stop offset="1" stopColor="#E8432E" />
            </linearGradient>
          </defs>
          <path className={`${s.line} ${s.wide}`} d={THREAD_WIDE} pathLength={1} stroke="url(#rh-intro-tail-wide)" />
          <path className={`${s.line} ${s.narrow}`} d={THREAD_NARROW} pathLength={1} stroke="url(#rh-intro-tail-narrow)" />
          <path className={`${s.outline} ${s.wide}`} d={OUTLINE} pathLength={1} stroke="#E8432E" />
          <path className={`${s.outline} ${s.narrow}`} d={OUTLINE_NARROW} pathLength={1} stroke="#E8432E" />
        </svg>
        <div className={s.lockup} data-intro-logo>
          <div className={s.mark}>
            <Logomark size={104} />
          </div>
          <div className={s.name}>
            <span className={s.mask}>
              <span className={s.word}>RH</span>
            </span>{" "}
            <span className={s.mask}>
              <span className={`${s.word} ${s.pilot}`}>Pilot</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
