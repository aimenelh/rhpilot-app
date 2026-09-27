"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Fil de chargement : une ligne corail en haut de l'écran qui avance dès le
// clic sur un lien de l'application et se termine quand la nouvelle page
// s'affiche. Le routeur de Next ne signale pas le début d'une navigation :
// on le déduit du clic, et la fin du changement d'adresse.

const TRICKLE_MS = 180;
const GIVE_UP_MS = 8_000;

function isInternalNavigation(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = (event.target as Element | null)?.closest?.("a");
  if (!anchor || !anchor.href || anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const running = useRef(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isInternalNavigation(event)) return;
      running.current = true;
      setProgress(0.08);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // La nouvelle page est là : la ligne se complète puis s'efface.
  useEffect(() => {
    if (!running.current) return;
    running.current = false;
    setProgress(1);
    const hide = window.setTimeout(() => setProgress(null), 320);
    return () => window.clearTimeout(hide);
  }, [pathname, searchParams]);

  // Pendant le chargement, la ligne avance de moins en moins vite sans jamais finir seule.
  useEffect(() => {
    if (progress === null || progress >= 1) return;
    const trickle = window.setInterval(() => setProgress((value) => (value === null || value >= 1 ? value : value + (0.9 - value) * 0.1)), TRICKLE_MS);
    const giveUp = window.setTimeout(() => {
      running.current = false;
      setProgress(null);
    }, GIVE_UP_MS);
    return () => {
      window.clearInterval(trickle);
      window.clearTimeout(giveUp);
    };
  }, [progress === null || progress >= 1]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="nav-progress" data-visible={progress !== null && progress < 1 ? "true" : progress === 1 ? "done" : "false"} aria-hidden="true">
      <span style={{ transform: `scaleX(${progress ?? 0})` }} />
    </div>
  );
}
