"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import s from "./MarketingV2.module.css";
const tabs = [
  {
    id: "salaries",
    label: "Dossiers salariés",
    title: "Retrouvez le fil de chaque salarié.",
    text: "Les informations du salarié et ses parcours se consultent au même endroit. Vous savez où en sont les démarches qui le concernent.",
    image: "/demo/fiche-salarie.png",
    alt: "Exemple de fiche salarié dans RH Pilot",
  },
  {
    id: "parcours",
    label: "Parcours RH",
    title: "Un événement. Des actions précises.",
    text: "Préparez les étapes d’une embauche, attribuez les tâches et suivez leur réalisation. Chaque personne connaît la prochaine action à mener.",
    image: "/demo/parcours-avance.png",
    alt: "Parcours RH avec les étapes réalisées et restantes",
  },
  {
    id: "echeances",
    label: "Échéances",
    title: "Voyez ce qui arrive, avant l’urgence.",
    text: "Le calendrier rassemble les échéances de vos parcours. Les rappels et les résumés vous aident à garder le suivi, même quand la semaine se remplit.",
    image: "/marketing/calendar-landing.webp",
    alt: "Calendrier des échéances RH",
  },
  {
    id: "copilote",
    label: "Copilote",
    title: "Posez une question sur votre suivi RH.",
    text: "Retrouvez les parcours à surveiller et les actions en attente à partir des données de votre entreprise. Les suggestions restent à examiner avant d’agir.",
    image: "/marketing/copilot-landing.webp",
    alt: "Réponse du copilote à partir des données RH",
  },
];
export function ProductTabs() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const item = tabs[active];
  return (
    <div>
      <div
        className={s.tabs}
        role="tablist"
        aria-label="Explorer les fonctionnalités"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={index === active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={index === active ? 0 : -1}
            className={s.tab}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setActive(next);
                refs.current[next]?.focus();
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`panel-${item.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${item.id}`}
        tabIndex={0}
        className={s.tabPanel}
      >
        <div>
          <h3>{item.title}</h3>
          <p className={s.copy}>{item.text}</p>
          <Link href={`/services#${item.id}`} className={s.textLink}>
            Découvrir cette fonctionnalité →
          </Link>
        </div>
        <div className={s.tabImage}>
          <Image
            src={item.image}
            alt={item.alt}
            width={1200}
            height={680}
            sizes="(max-width: 700px) 95vw, 65vw"
          />
        </div>
      </div>
    </div>
  );
}
