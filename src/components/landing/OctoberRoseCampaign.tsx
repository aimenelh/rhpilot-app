"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { COOKIE_CONSENT_EVENT, hasCookieConsentDecision } from "@/components/CookieConsent";
import {
  isOctoberRoseActive,
  OCTOBER_ROSE_START,
  OCTOBER_ROSE_END,
  OCTOBER_ROSE_SEEN_KEY,
  OCTOBER_ROSE_DONATION_URL,
  OCTOBER_ROSE_INFORMATION_URL,
} from "@/lib/octoberRose";
import s from "./OctoberRoseCampaign.module.css";

const CampaignContext = createContext({ active: false, show: () => {} });
const QUIET_ROUTES = new Set(["/cookies", "/confidentialite", "/mentions-legales", "/cgu"]);
// Repli pour la navigation côté client si le navigateur bloque le stockage.
let seenInMemory = false;

function hasSeenCampaign() {
  if (seenInMemory) return true;
  try {
    return localStorage.getItem(OCTOBER_ROSE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberCampaign() {
  seenInMemory = true;
  try {
    localStorage.setItem(OCTOBER_ROSE_SEEN_KEY, "1");
  } catch {
    // Le choix reste mémorisé pendant cette navigation, sans bloquer le site.
  }
}

function PinkRibbon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="30" viewBox="0 0 32 40" fill="none" aria-hidden="true">
      <path d="M8 9C8 3.5 11.2 1 16 1s8 2.5 8 8c0 7.7-8.1 19.3-16.7 30L1 32C11.5 19 18.5 11.7 18.5 7.7c0-1.8-1-2.7-2.5-2.7s-2.5.9-2.5 2.7C13.5 11.7 20.5 19 31 32l-6.3 7C16.1 28.3 8 16.7 8 9Z" fill="#C43C73" />
      <path d="M8 9C8 3.5 11.2 1 16 1s8 2.5 8 8c0 7.7-8.1 19.3-16.7 30L1 32C11.5 19 18.5 11.7 18.5 7.7c0-1.8-1-2.7-2.5-2.7S8 6 8 9Z" fill="#EB80A6" />
    </svg>
  );
}

export function OctoberRoseRibbonButton() {
  const { active, show } = useContext(CampaignContext);
  if (!active) return null;
  return (
    <button type="button" className={s.ribbonButton} onClick={show} aria-label="Octobre Rose : s’informer et soutenir la lutte contre le cancer" aria-haspopup="dialog" title="Octobre Rose">
      <PinkRibbon />
    </button>
  );
}

export function OctoberRoseAnnouncement({ fallback }: { fallback: ReactNode }) {
  const { active, show } = useContext(CampaignContext);
  if (!active) return <>{fallback}</>;
  return (
    <button type="button" className={s.banner} onClick={show} aria-haspopup="dialog">
      <PinkRibbon className={s.bannerRibbon} />
      <span><strong>Octobre Rose</strong><span className={s.bannerMessage}> · Ensemble, faisons une place à la prévention.</span></span>
      <span className={s.bannerAction}>S’informer et agir <ArrowRight size={14} aria-hidden="true" /></span>
    </button>
  );
}

export function OctoberRoseProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Vérification après hydratation : la date n'est jamais figée au build Next.js.
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const show = useCallback(() => {
    if (isOctoberRoseActive()) setOpen(true);
  }, []);
  const dismiss = useCallback(() => setOpen(false), []);

  useEffect(() => {
    let timer: number;
    const refresh = () => {
      window.clearTimeout(timer);
      const now = Date.now();
      const enabled = isOctoberRoseActive(now);
      setActive(enabled);
      if (!enabled) setOpen(false);
      const nextChange = now < OCTOBER_ROSE_START ? OCTOBER_ROSE_START : OCTOBER_ROSE_END;
      if (now < nextChange) {
        timer = window.setTimeout(refresh, Math.min(nextChange - now, 2_147_483_647));
      }
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    if (!active || QUIET_ROUTES.has(pathname) || hasSeenCampaign()) return;
    let timer: number;
    let consentDecided = hasCookieConsentDecision();
    // L'introduction de marque dure 2,7 s. Lui laisser le temps de se terminer.
    const earliest = Date.now() + 3200;
    const attempt = () => {
      if (hasSeenCampaign() || !isOctoberRoseActive()) return;
      if (!consentDecided || document.hidden) return;
      const otherDialog = Array.from(document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"], [aria-modal="true"]'))
        .some((element) => element.getClientRects().length > 0);
      if (otherDialog) {
        timer = window.setTimeout(attempt, 1000);
        return;
      }
      show();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(attempt, Math.max(600, earliest - Date.now()));
    };
    const consentChanged = () => {
      // L'événement fonctionne même lorsque localStorage est indisponible.
      consentDecided = true;
      schedule();
    };
    schedule();
    window.addEventListener(COOKIE_CONSENT_EVENT, consentChanged);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(COOKIE_CONSENT_EVENT, consentChanged);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [active, pathname, show]);

  useEffect(() => {
    const element = dialog.current;
    if (!active || !open || !element) return;
    // Le dialogue natif gère le focus, Échap et l'inertie du reste de la page.
    element.showModal();
    rememberCampaign();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, [active, open]);

  return (
    <CampaignContext.Provider value={{ active, show }}>
      {children}
      {active ? (
        <dialog ref={dialog} className={s.dialog} aria-labelledby="october-rose-title" aria-describedby="october-rose-description" onCancel={(event) => { event.preventDefault(); dismiss(); }}>
          {open ? (
            <div className={s.panel}>
              <button type="button" className={s.close} onClick={dismiss} aria-label="Fermer le message Octobre Rose" autoFocus><X size={21} aria-hidden="true" /></button>
              <div className={s.visual}>
                <span className={s.edition}>Octobre Rose <span>2026</span></span>
                <Image src="/illustrations/mascot/octobre-rose-2026.webp" alt="La mascotte RH Pilot porte un ruban rose sur sa chemise, la main sur le cœur." width={1024} height={1536} sizes="(max-width: 640px) 170px, 280px" className={s.mascot} />
                <p className={s.visualCaption}>Un petit ruban.<br /><em>Une attention qui compte.</em></p>
              </div>
              <div className={s.content}>
                <p className={s.eyebrow}><PinkRibbon /> RH Pilot relaie Octobre Rose</p>
                <h2 id="october-rose-title" className={s.title}>Ensemble,<br /><em>prenons soin de nous.</em></h2>
                <p id="october-rose-description" className={s.description}>Octobre Rose est l’occasion de s’informer sur le cancer du sein et de rappeler l’importance du dépistage.</p>
                <p className={s.description}>La Ligue contre le cancer soutient la recherche, la prévention et l’accompagnement des personnes malades, contre le cancer du sein et les autres cancers.</p>
                <div className={s.actions}>
                  <a href={OCTOBER_ROSE_DONATION_URL} target="_blank" rel="noopener noreferrer" onClick={dismiss} className={s.donate}>Faire un don à la Ligue <ArrowUpRight size={19} aria-hidden="true" /><span className="sr-only"> contre le cancer (nouvel onglet)</span></a>
                  <a href={OCTOBER_ROSE_INFORMATION_URL} target="_blank" rel="noopener noreferrer" onClick={dismiss} className={s.learn}>S’informer sur Octobre Rose <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (nouvel onglet)</span></a>
                </div>
                <p className={s.note}>Les dons sont effectués directement auprès de la Ligue contre le cancer.</p>
                <button type="button" className={s.continue} onClick={dismiss}>Continuer sur RH Pilot <ArrowRight size={15} aria-hidden="true" /></button>
              </div>
            </div>
          ) : null}
        </dialog>
      ) : null}
    </CampaignContext.Provider>
  );
}
