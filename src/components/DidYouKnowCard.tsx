"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";

// Astuces sur des fonctionnalités qui existent vraiment — jamais rien
// d'inventé ni de futur.
const DID_YOU_KNOW_TIPS = [
  "Vous pouvez personnaliser vos modèles de parcours depuis un parcours déjà généré. Les modifications ne concernent que votre organisation.",
  "Les salariés archivés restent consultables dans l’onglet Archivés de la page Salariés.",
  "Les rappels liés à la convention collective renvoient vers la source officielle. Le texte de la convention n’est pas interprété.",
  "Le Calendrier vous permet de basculer entre vos propres tâches et celles de toute l'organisation.",
  "Vous pouvez exporter l'ensemble de vos données à tout moment, conformément au RGPD, depuis Configuration.",
  "Une étape qui ne s’applique pas dans votre organisation peut être retirée définitivement de vos futurs parcours, au lieu d’être annulée à chaque fois.",
];

const ROTATION_MS = 12000;
const FADE_MS = 300;

export function DidYouKnowCard() {
  // Départ toujours identique côté serveur et côté client (index 0) —
  // le tirage aléatoire n'a lieu qu'après le montage, dans l'effet
  // ci-dessous, pour éviter tout désaccord d'hydratation entre les
  // deux rendus (Math.random() dans useState() donnait un résultat
  // différent à chaque exécution serveur/client).
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * DID_YOU_KNOW_TIPS.length));
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setVisible(false);
      timeout = setTimeout(() => {
        setIndex((current) => (current + 1) % DID_YOU_KNOW_TIPS.length);
        setVisible(true);
      }, FADE_MS);

    }, ROTATION_MS);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  return (
    <Card className="mt-5 flex items-start gap-2.5 bg-surface-subtle">
      <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent-amber" />
      <div className="min-h-[40px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Astuce</p>
        <p
          className={`mt-1 text-sm text-ink-soft transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {DID_YOU_KNOW_TIPS[index]}
        </p>
      </div>
    </Card>
  );
}
