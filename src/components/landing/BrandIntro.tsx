"use client";

import { useEffect, useState } from "react";
import { Logomark } from "@/components/Brand";
import s from "./BrandIntro.module.css";

const VISIT_KEY = "rhpilot-brand-intro-v2";

export function BrandIntro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    try {
      if (sessionStorage.getItem(VISIT_KEY)) return;
    } catch {
      /* Storage is optional; the animation still ends automatically. */
    }
    let started = false;
    let timer: number;
    const sprite = new window.Image();
    const start = () => {
      if (started) return;
      started = true;
      try {
        sessionStorage.setItem(VISIT_KEY, "seen");
      } catch {}
      setVisible(true);
      timer = window.setTimeout(finish, 4450);
    };
    const finish = () => setVisible(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") finish();
    };
    sprite.onload = start;
    sprite.onerror = start;
    sprite.src = "/illustrations/mascot/intro-push-wave.png";
    const loadDeadline = window.setTimeout(start, 900);
    window.addEventListener("keydown", key);
    motion.addEventListener("change", finish);
    return () => {
      started = true;
      sprite.onload = null;
      sprite.onerror = null;
      window.clearTimeout(loadDeadline);
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
        <div className={s.vignette}>
          <div className={s.mascot}>
            <svg className={s.pushPose} viewBox="0 140 700 970" fill="none">
              <image
                href="/illustrations/mascot/intro-push-wave.png"
                width="1254"
                height="1254"
              />
            </svg>
            <svg className={s.wavePose} viewBox="680 140 574 970" fill="none">
              <image
                href="/illustrations/mascot/intro-push-wave.png"
                width="1254"
                height="1254"
              />
            </svg>
          </div>
          <div className={s.logo}>
            <Logomark size={96} />
          </div>
          <span className={s.effort}>… hop !</span>
          <span className={s.spark}>✦</span>
          <div className={s.ground} />
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
