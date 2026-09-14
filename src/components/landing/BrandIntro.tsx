"use client";

import { useEffect, useState } from "react";
import { Logomark } from "@/components/Brand";
import s from "./BrandIntro.module.css";

const VISIT_KEY = "rhpilot-brand-intro-v1";

export function BrandIntro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    try {
      if (sessionStorage.getItem(VISIT_KEY)) return;
      sessionStorage.setItem(VISIT_KEY, "seen");
    } catch {
      /* Storage is optional; the animation still ends automatically. */
    }
    setVisible(true);
    const finish = () => setVisible(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") finish();
    };
    const timer = window.setTimeout(finish, 2100);
    window.addEventListener("keydown", key);
    motion.addEventListener("change", finish);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", key);
      motion.removeEventListener("change", finish);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className={s.intro} data-brand-intro>
      <div className={s.topline} aria-hidden="true">
        <span>RH PILOT</span>
        <span>LE FIL DE VOS RH</span>
      </div>
      <div className={s.stage} aria-hidden="true">
        <svg className={s.orbit} viewBox="0 0 440 440" fill="none">
          <circle cx="220" cy="220" r="180" />
          <circle cx="220" cy="220" r="208" />
        </svg>
        <div className={s.logo}>
          <Logomark size={104} />
        </div>
        <div className={s.name}>
          <span>
            RH <em>Pilot</em>
            <span className={s.dot}>.</span>
          </span>
        </div>
        <div className={s.caption}>Vos équipes avancent. Vos RH suivent.</div>
        <div className={s.stroke} />
      </div>
      <button className={s.skip} onClick={() => setVisible(false)}>
        Passer l’animation <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
