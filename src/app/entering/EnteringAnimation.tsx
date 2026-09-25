"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Logomark } from "@/components/Brand";
import { greetingFor } from "@/components/auth/greeting";
import s from "@/components/auth/AuthStage.module.css";

// Suite de la connexion : le même papier, le même fil, une salutation, puis le
// tableau de bord. Court exprès (1,4 s) : on se connecte tous les jours, on
// ne doit pas attendre. Le tableau de bord est préchargé pendant ce temps.
const MIN_DISPLAY_MS = 1400;

export function EnteringAnimation() {
  const router = useRouter();
  // Référence stable : le minuteur ne doit jamais redémarrer si l'objet routeur change.
  const routerRef = useRef(router);
  routerRef.current = router;
  const { user } = useUser();
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingFor(new Date()));
    routerRef.current.prefetch("/dashboard");
    const timeout = window.setTimeout(() => routerRef.current.replace("/dashboard"), MIN_DISPLAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  const first = user?.firstName?.trim();

  return (
    <div className={s.page}>
      <svg className={s.bgThread} data-still="true" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M-40 872 C 260 900 520 820 720 700 C 900 590 830 300 1010 180 C 1170 80 1330 150 1490 86" />
      </svg>
      <div className={s.enter}>
        <Logomark size={40} />
        <p className={s.enterTitle} data-ready={greeting !== null}>
          {greeting ?? "Bonjour"}
          {first ? ` ${first}` : ""}.
        </p>
        <p className={s.enterLead}>Votre tableau de bord s’ouvre.</p>
        <div className={s.enterLine} role="progressbar" aria-label="Ouverture du tableau de bord">
          <span />
        </div>
      </div>
    </div>
  );
}
