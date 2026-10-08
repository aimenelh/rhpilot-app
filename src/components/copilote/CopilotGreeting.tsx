"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import s from "./CopilotGreeting.module.css";

const COOKIE_CONSENT_KEY = "rhpilot.cookie-consent.v1";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : la bulle reviendra, sans gravité.
  }
}

/**
 * Bulle de présentation de l'assistante, affichée une seule fois (clé
 * `storageKey`), après le choix des cookies pour ne pas se superposer au
 * bandeau. Elle se ferme seule après quelques secondes.
 */
export function CopilotGreeting({
  storageKey,
  message,
  delayMs = 1800,
  onShow,
  onOpen,
}: {
  storageKey: string;
  message: string;
  delayMs?: number;
  /** Appelé à l'apparition (pour faire parler l'avatar). */
  onShow?: () => void;
  /** Clic sur la bulle : ouvre le panneau de l'assistante. */
  onOpen?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;

  useEffect(() => {
    if (read(storageKey)) return;
    let showTimer = 0;
    let hideTimer = 0;
    let poll = 0;
    const schedule = () => {
      showTimer = window.setTimeout(() => {
        setVisible(true);
        onShowRef.current?.();
        hideTimer = window.setTimeout(() => {
          setVisible(false);
          write(storageKey, "1");
        }, 14000);
      }, delayMs);
    };
    if (read(COOKIE_CONSENT_KEY)) {
      schedule();
    } else {
      poll = window.setInterval(() => {
        if (read(COOKIE_CONSENT_KEY)) {
          window.clearInterval(poll);
          schedule();
        }
      }, 1200);
    }
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearInterval(poll);
    };
  }, [storageKey, delayMs]);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    write(storageKey, "1");
  };

  return (
    <div className={s.bubble} role="status">
      <button
        type="button"
        className={s.text}
        onClick={() => {
          close();
          onOpen?.();
        }}
      >
        {message}
      </button>
      <button type="button" className={s.close} onClick={close} aria-label="Fermer le message">
        <X size={14} />
      </button>
    </div>
  );
}
