import Link from "next/link";
import { MarketingPage, MarketingCTA } from "@/components/landing/MarketingPage";
import { WhyConversationScene } from "@/components/landing/WhyConversationScene";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import w from "./WhyPage.module.css";

export const metadata = {
  title: "Pourquoi RH Pilot ?",
  description:
    "Des responsabilités claires et des échéances visibles pour accompagner votre équipe.",
};

export default function WhyPage() {
  return (
    <MarketingPage>
      <section className={w.hero}>
        <div className={`${s.wrap} ${w.heroGrid}`}>
          <div className={w.heroCopy}>
            <p className={s.eyebrow}>Pourquoi RH Pilot</p>
            <h1 className={w.heroTitle}>
              Tout commence parfois par un <em>« je pensais que c’était toi ».</em>
            </h1>
            <p className={w.heroLead}>
              Une arrivée, un document, une échéance. Quand les informations se
              dispersent entre messages, fichiers et habitudes de travail, les
              sujets RH deviennent difficiles à suivre. RH Pilot remet la suite
              au clair.
            </p>
            <div className={w.actions}>
              <Link href="/services" className={s.primary}>
                Découvrir RH Pilot ↗
              </Link>
              <a href="#origine" className={s.secondary}>
                Comprendre le constat ↓
              </a>
            </div>
            <p className={w.microcopy}>
              La scène ci-contre reprend une situation banale : personne n’a
              oublié volontairement. Chacun pensait simplement que quelqu’un
              d’autre s’en occupait.
            </p>
          </div>

          <WhyConversationScene />
        </div>
      </section>

      <section id="origine" className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <h2 className={s.title}>Moins de choses à garder en tête.</h2>
          <div className={p.story}>
            <p className={w.storyLead}>
              Dans une petite équipe, les sujets RH sont rarement confiés à une
              seule personne. Ils circulent entre le dirigeant, le manager,
              l’administratif et parfois un prestataire externe.
            </p>
            <p>
              Le problème n’est pas le manque d’implication. C’est que les
              informations se dispersent facilement entre les messages, les
              fichiers, les agendas et ce que chacun pense avoir retenu.
            </p>
            <p>
              RH Pilot est construit autour d’un besoin simple : retrouver ce
              qui doit être fait, pour qui, par qui et pour quand, sans demander
              à quelqu’un de tout garder en mémoire.
            </p>
            <blockquote className={p.quote}>
              La mémoire ne devrait pas être le principal outil d’une équipe RH.
            </blockquote>
          </div>
        </div>
      </section>

      <section className={`${p.section} ${p.tint}`}>
        <div className={s.wrap}>
          <div className={p.columns}>
            <div>
              <p className={s.eyebrow}>Notre façon de construire</p>
              <h2 className={s.title}>Rendre la suite visible.</h2>
            </div>
            <div className={p.story}>
              <p>
                RH Pilot ne cherche pas à ajouter une couche de complexité. Le
                logiciel donne un cadre aux sujets qui existent déjà dans
                l’entreprise et les rend plus simples à suivre dans le temps.
              </p>
            </div>
          </div>

          <div className={w.pillars}>
            <article className={w.pillar}>
              <span className={w.pillarIndex}>Au lieu de chercher</span>
              <h3>Centraliser</h3>
              <p>
                Réunir les informations, documents et échéances au même endroit
                plutôt que de les chercher dans plusieurs outils.
              </p>
            </article>
            <article className={w.pillar}>
              <span className={w.pillarIndex}>Au lieu de supposer</span>
              <h3>Clarifier</h3>
              <p>
                Savoir qui doit intervenir et ce qui reste à organiser, sans
                dépendre des suppositions de chacun.
              </p>
            </article>
            <article className={w.pillar}>
              <span className={w.pillarIndex}>Au lieu d’oublier</span>
              <h3>Suivre</h3>
              <p>
                Garder les prochaines actions visibles jusqu’à leur réalisation,
                avec un historique compréhensible.
              </p>
            </article>
          </div>
        </div>
      </section>

      <MarketingCTA
        title="Voyez comment cela prend forme."
        text="Découvrez RH Pilot et la manière dont le logiciel structure les sujets RH du quotidien."
      />
    </MarketingPage>
  );
}
