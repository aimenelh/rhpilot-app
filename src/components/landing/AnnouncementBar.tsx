"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

// Un message différent par jour, pas par visite -- évite l'effet
// "loterie" à chaque rechargement. Simple modulo sur le jour de
// l'année, pas besoin de logique côté serveur pour ça.
const ANNOUNCEMENTS = [
  {
    text: "Le module Paie arrive sur RH Pilot, disponible sur le palier Pro.",
    href: "/tarifs",
    cta: "En savoir plus",
  },
  {
    text: "Le Copilote RH Pilot répond à vos questions RH en langage courant.",
    href: "/questions",
    cta: "Voir des exemples",
  },
  {
    text: "Délai de prévenance en fin de période d'essai : ce qu'il faut savoir.",
    href: "/ressources/delai-prevenance-periode-essai",
    cta: "Lire l'article",
  },
  {
    text: "RH Pilot est gratuit jusqu'à 3 salariés, sans engagement.",
    href: "/tarifs",
    cta: "Voir les tarifs",
  },
];

const STORAGE_KEY = "rhpilot-announcement-dismissed";

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true); // masqué tant qu'on n'a pas vérifié sessionStorage, pour ne pas clignoter à l'affichage
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    const todayIndex = dayOfYear % ANNOUNCEMENTS.length;
    setIndex(todayIndex);

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      setDismissed(stored === String(todayIndex));
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const announcement = ANNOUNCEMENTS[index];

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(index));
    } catch {
      // Stockage indisponible : on masque quand même pour cette page,
      // rien de grave si ça réapparaît à la prochaine navigation.
    }
  }

  return (
    <div className="relative bg-ink px-4 py-2.5 text-center text-sm text-white">
      <Link href={announcement.href} className="inline-flex items-center gap-1.5 hover:underline">
        {announcement.text}
        <span className="font-semibold text-brand-primary">{announcement.cta} →</span>
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer ce message"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  );
}
