"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";

// Astuces sur des fonctionnalités qui existent vraiment — jamais rien
// d'inventé ni de futur.
const DID_YOU_KNOW_TIPS = [
  "Vous pouvez personnaliser vos modèles de parcours directement depuis un parcours déjà généré, sans jamais toucher à ce que voient les autres organisations.",
  "Un salarié archivé n'est jamais perdu : retrouvez-le à tout moment depuis l'onglet Archivés, sur la page Salariés.",
  "RH Pilot n'interprète jamais votre convention collective : il vous oriente simplement vers la bonne source officielle, au bon moment.",
  "Le Calendrier vous permet de basculer entre vos propres tâches et celles de toute l'organisation, en un clic.",
  "Vous pouvez exporter l'ensemble de vos données à tout moment, conformément au RGPD, depuis Configuration.",
  "Une étape que vous ne faites jamais chez vous peut être supprimée définitivement de vos futurs parcours, pas seulement annulée à chaque fois.",
];

const ROTATION_MS = 12000;
const FADE_MS = 300;

export function DidYouKnowCard() {
  // Départ aléatoire pour ne pas toujours voir la même astuce en
  // premier à chaque visite — la rotation elle-même reste régulière.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * DID_YOU_KNOW_TIPS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const timeout = setTimeout(() => {
        setIndex((current) => (current + 1) % DID_YOU_KNOW_TIPS.length);
        setVisible(true);
      }, FADE_MS);
      return () => clearTimeout(timeout);
    }, ROTATION_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="mt-5 flex items-start gap-2.5 bg-surface-subtle">
      <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent-amber" />
      <div className="min-h-[40px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Le saviez-vous ?</p>
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
