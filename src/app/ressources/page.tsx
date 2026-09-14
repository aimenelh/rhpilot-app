import Link from "next/link";
import {
  MarketingPage,
  PageIntro,
  MarketingCTA,
} from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
const ARTICLES = [
  {
    slug: "ia-recrutement-cnil-2026",
    category: "IA et RH",
    title: "IA et recrutement : ce que la CNIL va réellement contrôler en 2026",
    excerpt:
      "Le recrutement est une priorité de contrôle CNIL en 2026, au moment où l'IA Act classe le tri de CV comme un système à haut risque.",
    readTime: "5 min",
  },
  {
    slug: "reforme-arrets-travail-2026",
    category: "Actualité réglementaire",
    title: "Arrêts de travail : ce qui change réellement au 1er septembre 2026",
    excerpt:
      "Un décret plafonne pour la première fois la durée des arrêts de travail prescrits. Ce que ça change pour une équipe RH.",
    readTime: "5 min",
  },
  {
    slug: "rupture-conventionnelle-chomage-2026",
    category: "Actualité réglementaire",
    title:
      "Rupture conventionnelle : l'indemnisation chômage baisse depuis le 1er septembre 2026",
    excerpt:
      "La durée maximale d'indemnisation après une rupture conventionnelle diminue. Ce que ça change dans une négociation.",
    readTime: "4 min",
  },
  {
    slug: "delai-prevenance-periode-essai",
    category: "Obligations RH",
    title:
      "Délai de prévenance en fin de période d'essai : le détail que presque tout le monde oublie",
    excerpt:
      "Le délai grandit avec l'ancienneté du salarié, et un piège précis peut faire déraper une rupture bien préparée.",
    readTime: "4 min",
  },
  {
    slug: "visite-medicale-embauche-delai",
    category: "Obligations RH",
    title:
      "Visite médicale d'embauche : ce qu'il faut savoir (et le nom a changé)",
    excerpt:
      "La visite médicale d'embauche a été remplacée en 2017. Ses vrais délais, ses exceptions, et pourquoi elle passe souvent à la trappe.",
    readTime: "4 min",
  },
];

export const metadata = {
  title: "Ressources, RH Pilot",
  description:
    "Des repères pour le quotidien RH : articles et points de vigilance.",
};
export default function ResourcesPage() {
  return (
    <MarketingPage>
      <PageIntro
        eyebrow="Les ressources"
        title="Des repères pour votre quotidien RH."
        intro="Prenez le temps de comprendre un sujet, puis retrouvez les sources et les points de vigilance dans chaque article."
        mascot="/illustrations/mascot/search.png"
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
