"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Logomark } from "@/components/Brand";
import s from "@/components/auth/AuthStage.module.css";
import c from "./CreatingAccount.module.css";

// Suite directe de l'inscription : la même fenêtre revient au centre et le
// fil corail pose, une à une, les briques de l'espace pendant que le compte
// se prépare. Même durée qu'avant (3,4 s), puis le tableau de bord.

const STEPS = [
  "Votre compte est créé",
  "Les parcours RH sont prêts : embauche, fin d’essai, visite médicale",
  "Le calendrier des échéances vous attend",
  "Il reste à nommer votre entreprise et à ajouter un premier salarié",
];
const STEP_MS = 650;
const TOTAL_MS = 3400;

export function CreatingAccountAnimation() {
  const router = useRouter();
  // Référence stable : l'animation ne doit jamais redémarrer si l'objet routeur change.
  const routerRef = useRef(router);
  routerRef.current = router;
  const { user } = useUser();
  const [shown, setShown] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setShown(STEPS.length);
    const timers = reduce ? [] : STEPS.map((_, index) => window.setTimeout(() => setShown((n) => Math.max(n, index + 1)), 250 + index * STEP_MS));
    const readyTimer = window.setTimeout(() => setReady(true), reduce ? 600 : 250 + STEPS.length * STEP_MS);
    const done = window.setTimeout(() => routerRef.current.replace("/dashboard"), reduce ? 2000 : TOTAL_MS);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(readyTimer);
      window.clearTimeout(done);
    };
  }, []);

  const name = user?.firstName?.trim();
  return (
    <div className={s.page}>
      <svg className={`${s.bgThread} ${c.drawn}`} viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M-40 760 C 180 700 260 520 430 540 C 620 560 640 760 820 700 C 1000 640 980 380 1140 330 C 1270 290 1350 180 1490 120" />
      </svg>
      <main className={c.center}>
        <div className={`${s.window} ${c.window}`}>
          <div className={s.bar}>
            <Logomark size={16} />
            <span>RH Pilot</span>
          </div>
          <div className={s.head}>
            <p className={s.eyebrow}>Espace RH de</p>
            <p className={s.name}>{name || "vous"}</p>
          </div>
          <ol className={c.steps}>
            {STEPS.map((step, index) => (
              <li key={step} data-on={index < shown} data-link={index + 1 < shown}>
                <i aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className={c.status} role="status">
            {ready ? "C’est prêt." : "Préparation de votre espace…"}
          </p>
        </div>
      </main>
    </div>
  );
}
