import Link from "next/link";
import {
  MarketingPage,
  PageIntro,
  MarketingCTA,
} from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
export const metadata = {
  title: "Pourquoi RH Pilot ?",
  description:
    "Des responsabilités claires et des échéances visibles pour accompagner votre équipe.",
};
export default function WhyPage() {
  return (
    <MarketingPage>
      <PageIntro
        eyebrow="Pourquoi RH Pilot"
        title="Une équipe avance mieux quand la suite est claire."
        intro="Une arrivée à préparer, une période d’essai à suivre, un document à retrouver. RH Pilot rassemble les étapes qui font le quotidien d’une petite équipe."
        mascot="/illustrations/mascot/calm.png"
      />
      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <h2 className={s.title}>Moins de choses à garder en tête.</h2>
          <div className={p.story}>
            <p>
              Quand les RH reposent sur plusieurs personnes, les informations se
              dispersent facilement entre les messages, les fichiers et les
              agendas.
            </p>
            <p>
              Nous construisons RH Pilot autour d’un besoin simple : retrouver
              ce qui doit être fait, pour qui, et par qui. Les parcours donnent
              un cadre. Le calendrier et les rappels permettent de suivre la
              suite.
            </p>
            <blockquote className={p.quote}>
              La mémoire ne devrait pas être le principal outil d’une équipe RH.
            </blockquote>
          </div>
        </div>
      </section>
      <section className={`${p.section} ${p.tint}`}>
        <div className={`${s.wrap} ${p.columns}`}>
          <div>
            <p className={s.eyebrow}>Notre façon de construire</p>
            <h2 className={s.title}>Rendre les choses visibles.</h2>
          </div>
          <ul className={p.rows}>
            <li>
              <h3>Des responsabilités explicites</h3>
              <p>
                Une tâche sans responsable reste « À assigner ». Chacun peut
                voir ce qui reste à organiser.
              </p>
            </li>
            <li>
              <h3>Des suggestions à vérifier</h3>
              <p>
                Le Copilote aide à préparer le travail. Vous gardez la main sur
                les informations et les décisions.
              </p>
            </li>
            <li>
              <h3>Un suivi qui reste lisible</h3>
              <p>
                Les étapes, les pièces manquantes et les échéances sont réunies
                dans le parcours concerné.
              </p>
            </li>
          </ul>
        </div>
      </section>
      <MarketingCTA title="Voyez comment cela prend forme." />
    </MarketingPage>
  );
}
