import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

export const metadata = {
  title: "Ressources, RH Pilot",
  description:
    "Actualité réglementaire RH, IA et recrutement, délais légaux sourcés : ce qu'une équipe RH doit vraiment savoir, sans jargon inutile.",
};

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
    title: "Rupture conventionnelle : l'indemnisation chômage baisse depuis le 1er septembre 2026",
    excerpt:
      "La durée maximale d'indemnisation après une rupture conventionnelle diminue. Ce que ça change dans une négociation.",
    readTime: "4 min",
  },
  {
    slug: "delai-prevenance-periode-essai",
    category: "Obligations RH",
    title: "Délai de prévenance en fin de période d'essai : le détail que presque tout le monde oublie",
    excerpt:
      "Le délai grandit avec l'ancienneté du salarié, et un piège précis peut faire déraper une rupture bien préparée.",
    readTime: "4 min",
  },
  {
    slug: "visite-medicale-embauche-delai",
    category: "Obligations RH",
    title: "Visite médicale d'embauche : ce qu'il faut savoir (et le nom a changé)",
    excerpt:
      "La visite médicale d'embauche a été remplacée en 2017. Ses vrais délais, ses exceptions, et pourquoi elle passe souvent à la trappe.",
    readTime: "4 min",
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      <section className="relative min-h-[470px] overflow-hidden border-b border-surface-border bg-white/90 backdrop-blur-[1px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_50%,rgba(240,72,49,0.10),transparent_30%)]" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[470px] max-w-6xl items-center gap-4 px-6 py-8 sm:grid-cols-[0.98fr_1.02fr] sm:gap-0 sm:px-8">
          <Reveal variant="left">
            <div className="relative z-10 max-w-xl pb-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-primary">
                Ressources
              </span>
              <h1 className="mt-4 max-w-[610px] text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[52px]">
                Ce que le droit du travail dit vraiment, maintenant.
              </h1>
              <p className="mt-5 max-w-[520px] text-base leading-relaxed text-ink-soft sm:text-lg">
                Actualité réglementaire, IA et recrutement, délais légaux. Sourcé, sans jargon inutile.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120} variant="scale">
            <div className="relative -mr-4 h-[430px] w-[calc(100%+1rem)] sm:-mr-10 sm:h-[455px] sm:w-[calc(100%+2.5rem)]">
              <div
                aria-hidden="true"
                className="absolute right-[6%] top-[14%] h-[70%] w-[68%] rotate-[-7deg] rounded-[3.2rem] bg-brand-primary shadow-[0_24px_70px_rgba(240,72,49,0.12)]"
              />
              <div
                aria-hidden="true"
                className="absolute right-[17%] bottom-[7%] h-28 w-28 rounded-full bg-brand-primary/20 blur-3xl"
              />
              <img
                src="https://images.pexels.com/photos/36826291/pexels-photo-36826291.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Portrait d'une femme souriante en pull noir"
                className="absolute bottom-0 right-[1%] h-[94%] w-[92%] object-contain object-bottom mix-blend-multiply [filter:brightness(1.12)_contrast(1.04)]"
                loading="eager"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 sm:grid-cols-2">
          {ARTICLES.map((article, index) => (
            <Reveal key={article.slug} variant="bounce" delay={index * 120}>
              <Link
                href={`/ressources/${article.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-surface-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
              >
                <span className="inline-flex w-fit items-center rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                  {article.category}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-ink">{article.title}</h2>
                <p className="mt-2 flex-1 text-sm text-ink-soft">{article.excerpt}</p>
                <div className="mt-5 flex items-center justify-between border-t border-surface-border pt-4">
                  <span className="flex items-center gap-1 text-xs text-ink-faint">
                    <Clock size={12} /> {article.readTime} de lecture
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-brand-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Lire <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
