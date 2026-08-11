import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

export const metadata = {
  title: "Ressources — RH Pilot",
  description:
    "Guides pratiques sur les obligations RH : délais légaux, échéances à ne pas manquer, et ce que le Code du travail dit vraiment.",
};

const ARTICLES = [
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

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Reveal variant="scale">
          <span className="inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Ressources
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Ce que le Code du travail dit vraiment.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-ink-soft">
            Des délais légaux expliqués simplement, sourcés, sans jargon inutile.
          </p>
        </Reveal>
      </section>

      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 sm:grid-cols-2">
          {ARTICLES.map((article, index) => (
            <Reveal key={article.slug} variant="bounce" delay={index * 120}>
              <Link
                href={`/ressources/${article.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-surface-border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="inline-flex w-fit items-center rounded-full bg-brand-blue/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
                  {article.category}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-ink">{article.title}</h2>
                <p className="mt-2 flex-1 text-sm text-ink-soft">{article.excerpt}</p>
                <div className="mt-5 flex items-center justify-between border-t border-surface-border pt-4">
                  <span className="flex items-center gap-1 text-xs text-ink-faint">
                    <Clock size={12} /> {article.readTime} de lecture
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-brand-blue opacity-0 transition-opacity group-hover:opacity-100">
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
