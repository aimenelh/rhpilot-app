import Link from "next/link";
import {
  MarketingPage,
  PageIntro,
  MarketingCTA,
} from "@/components/landing/MarketingPage";
import { CopilotScene } from "@/components/landing/CopilotScene";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
const ARTICLES = [
  {
    slug: "ia-recrutement-cnil-2026",
    category: "IA et RH",
    title: "IA et recrutement : les contrôles de la CNIL en 2026",
    excerpt:
      "Le recrutement est une priorité de contrôle de la CNIL en 2026, au moment où l’IA Act classe le tri de CV comme un système à haut risque.",
    readTime: "5 min",
  },
  {
    slug: "reforme-arrets-travail-2026",
    category: "Actualité réglementaire",
    title: "Arrêts de travail : ce qui change au 1er septembre 2026",
    excerpt:
      "Un décret plafonne la durée des arrêts de travail prescrits. Les nouvelles règles et leurs effets pour l’employeur.",
    readTime: "5 min",
  },
  {
    slug: "rupture-conventionnelle-chomage-2026",
    category: "Actualité réglementaire",
    title:
      "Rupture conventionnelle : l’indemnisation chômage réduite au 1er septembre 2026",
    excerpt:
      "La durée maximale d’indemnisation après une rupture conventionnelle diminue. Les nouvelles règles et leurs effets sur la négociation.",
    readTime: "4 min",
  },
  {
    slug: "delai-prevenance-periode-essai",
    category: "Obligations RH",
    title:
      "Délai de prévenance en fin de période d’essai",
    excerpt:
      "Le délai dépend du temps de présence du salarié et ne prolonge pas la période d’essai. Les règles et les cas particuliers.",
    readTime: "4 min",
  },
  {
    slug: "visite-medicale-embauche-delai",
    category: "Obligations RH",
    title:
      "Visite médicale d’embauche : délais et exceptions",
    excerpt:
      "Depuis 2017, la visite d’information et de prévention remplace la visite médicale d’embauche. Délais, suivi renforcé et exceptions.",
    readTime: "4 min",
  },
];

export const metadata = {
  title: "Ressources",
  description:
    "Articles sur les obligations RH des TPE et PME : délais, réformes, contrôles, avec les sources officielles.",
};
export default function ResourcesPage() {
  return (
    <MarketingPage>
      <PageIntro
        title="Ressources RH"
        intro="Des articles sur les obligations RH des TPE et PME, avec les textes et les sources officielles."
        scene={
          <CopilotScene
            figure="ressources"
            ask={{ persona: "nadia", text: "Quel délai pour la visite d’embauche ?" }}
            answer="Trois mois au plus après la prise de poste."
          />
        }
      />
      <section className={p.section}>
        <div className={`${s.wrap} ${p.articleList}`}>
          {ARTICLES.map((a, i) => (
            <Link
              key={a.slug}
              className={p.articleLink}
              href={`/ressources/${a.slug}`}
            >
              <span className={p.label}>{a.category}</span>
              <h2>{a.title}</h2>
              <p>{a.excerpt}</p>
              <div className={p.articleMeta}>
                <span>{a.readTime} de lecture</span>
                <span>Lire l’article ↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <MarketingCTA />
    </MarketingPage>
  );
}
