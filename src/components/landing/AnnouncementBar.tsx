"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

// Un message différent à chaque arrivée sur une page marketing, pas
// un seul message figé toute la journée -- sinon la rotation ne se
// voit jamais en pratique pour un même visiteur qui navigue le site.
const ANNOUNCEMENTS = [
  {
    text: "Le module Paie arrive sur RH Pilot, disponible sur le palier Pro.",
    href: "/tarifs",
    cta: "En savoir plus",
  },
  {
    text: "Le Copilote RH Pilot répond à vos questions à partir des données de votre organisation.",
    href: "/services#copilote",
    cta: "Voir comment",
  },
  {
    text: "IA et recrutement : ce que la CNIL contrôle vraiment en 2026.",
    href: "/ressources/ia-recrutement-cnil-2026",
    cta: "Lire l’article",
  },
  {
    text: "RH Pilot est gratuit jusqu’à 3 salariés.",
    href: "/tarifs",
    cta: "Voir les tarifs",
  },
];

const STORAGE_KEY = "rhpilot-announcement-dismissed";

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true); // masqué tant qu'on n'a pas vérifié sessionStorage, pour ne pas clignoter à l'affichage
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * ANNOUNCEMENTS.length);
    setIndex(randomIndex);

    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const announcement = ANNOUNCEMENTS[index];

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Stockage indisponible : on masque quand même pour cette page,
      // rien de grave si ça réapparaît à la prochaine navigation.
    }
  }

  return (
    // Texte et lien dans le même flux : sur mobile, la phrase passe à la ligne
    // et le lien reste d'un seul tenant ; la marge de droite garde la place de
    // la croix.
    <div className="relative bg-ink py-2.5 pl-4 pr-10 text-center text-[13px] leading-snug text-white sm:px-10 sm:text-sm">
      <Link href={announcement.href} className="hover:underline">
        {announcement.text}{" "}
        <span className="whitespace-nowrap font-semibold text-brand-primary">{announcement.cta} →</span>
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
