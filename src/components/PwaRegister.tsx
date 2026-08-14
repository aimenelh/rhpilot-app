"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux — l'application fonctionne normalement
        // même si l'enregistrement du service worker échoue.
      });
    }
  }, []);

  return null;
}
