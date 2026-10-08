import Link from "next/link";
import s from "./CopilotCards.module.css";
import { ScrollStage } from "./ScrollStage";

// Les trois modules : un dirigeant formule un événement,
// le copilote au casque corail en prépare la suite. Trois cartes, une par
// module (suivi RH, paie, espace salarié). Les actions se cochent quand la
// section entre à l'écran (attribut data-stage posé par ScrollStage) ;
// sans JavaScript ou en mouvement réduit, tout est visible.
type Card = {
  key: "suivi" | "paie" | "espace";
  module: string;
  persona: { name: string; place: string; image: string };
  request: string;
  actions: { label: string; date?: string }[];
  result: string;
  href: string;
  link: string;
};

const CARDS: Card[] = [
  {
    key: "suivi",
    module: "Le suivi RH",
    persona: { name: "Nadia", place: "Boulangerie Durand", image: "/illustrations/copilotes/persona-nadia.svg" },
    request: "Léa arrive le 5 octobre.",
    actions: [
      { label: "Préparer le contrat", date: "25 sept." },
      { label: "Déclarer la DPAE", date: "2 oct." },
      { label: "Demander la visite médicale", date: "20 oct." },
    ],
    result: "8 actions datées, chacune avec son responsable et ses rappels.",
    href: "/services",
    link: "Découvrir le logiciel",
  },
  {
    key: "paie",
    module: "La paie",
    persona: { name: "Marc", place: "Garage Duval", image: "/illustrations/copilotes/persona-marc.svg" },
    request: "On lance la paie d’octobre.",
    actions: [
      { label: "Absences et congés repris" },
      { label: "Bulletins calculés et contrôlés" },
      { label: "Bulletins prêts à valider", date: "28 oct." },
    ],
    result: "Vous validez, RH Pilot publie les bulletins. En accès anticipé, sur invitation.",
    href: "/gestion-paie",
    link: "Voir le module paie",
  },
  {
    key: "espace",
    module: "L’espace salarié",
    persona: { name: "Sophie", place: "Agence Lumen", image: "/illustrations/copilotes/persona-sophie.svg" },
    request: "Mes salariés demandent leurs bulletins.",
    actions: [
      { label: "Bulletin d’octobre publié", date: "28 oct." },
      { label: "Demande de congés de Tom reçue" },
      { label: "Documents de fin de contrat en ligne" },
    ],
    result: "Sur le téléphone de chaque salarié, sans coût par compte.",
    href: "/espace-salarie",
    link: "Découvrir l’espace salarié",
  },
];

export function CopilotCards() {
  return (
    <section className={s.section} aria-labelledby="copilotes-title" id="copilotes" data-no-reveal>
      <ScrollStage scopeId="copilotes" watch="[data-grid]" threshold={0.2} />
      <div className={s.inner}>
        <div className={s.head}>
          <h2 id="copilotes-title">Le suivi RH, la paie et l’espace salarié</h2>
          <p>
            Les trois modules partagent les mêmes fiches salariés : une information saisie une fois est reprise dans
            chaque module. Pour chaque événement, RH Pilot prépare les étapes, les dates et les responsables.
          </p>
        </div>
        <div className={s.grid} data-grid>
          {CARDS.map((card, i) => (
            <article key={card.key} className={s.card} style={{ ["--i" as string]: i }} data-tone={card.key}>
              <div className={s.stage}>
                <figure className={s.request}>
                  <div className={s.ident}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.persona.image} alt="" width={38} height={49} className={s.persona} />
                    <span className={s.who}>
                      {card.persona.name}
                      <br />
                      {card.persona.place}
                    </span>
                  </div>
                  <figcaption>
                    <q>{card.request}</q>
                  </figcaption>
                </figure>
                <div className={s.copilot} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/illustrations/copilotes/${card.key}.svg`} alt="" width={320} height={400} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/illustrations/copilotes/${card.key}-blink.svg`} alt="" width={320} height={400} className={s.blink} />
                </div>
              </div>
              <div className={s.body}>
                <h3>{card.module}</h3>
                <ul className={s.actions}>
                  {card.actions.map((action, j) => (
                    <li key={action.label} style={{ ["--j" as string]: j }}>
                      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" className={s.tick}>
                        <path d="M3.5 10.5 8 15 16.5 5" pathLength={1} />
                      </svg>
                      <span>{action.label}</span>
                      {action.date && <time>{action.date}</time>}
                    </li>
                  ))}
                </ul>
                <p className={s.result}>{card.result}</p>
                <Link href={card.href} className={s.link}>
                  {card.link}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
