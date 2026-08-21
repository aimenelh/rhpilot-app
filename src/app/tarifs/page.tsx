import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

export const metadata = {
  title: "Tarifs, RH Pilot",
  description: "Un prix simple, par salarié. Le Copilote IA reste gratuit pendant toute la bêta.",
};

function Dot({ color }: { color: string }) {
  return <span aria-hidden className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />;
}

export default function TarifsPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      {/* Le manifeste, même registre que le reste du site */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Reveal variant="scale">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Un prix simple, <span className="bg-brand-gradient bg-clip-text text-transparent">par salarié</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
            Pas de palier caché ni de fonctionnalité verrouillée pour vous faire changer d&apos;offre.
            Le Copilote IA est inclus partout, gratuitement, pendant toute la durée de la bêta.
          </p>
        </Reveal>
      </section>

      {/* Gratuit et Pro, en vis-à-vis plutôt qu'en cartes identiques :
          Pro porte le vrai poids visuel, c'est le produit tel qu'il
          est pensé pour durer, pas une case parmi d'autres. */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-10 border-t border-surface-border pt-12 sm:grid-cols-5 sm:gap-12">
          <div className="sm:col-span-2">
            <Reveal variant="left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Gratuit</p>
              <p className="mt-3 text-4xl font-bold text-ink">0 €</p>
              <p className="mt-1 text-sm text-ink-soft">Pour découvrir RH Pilot, jusqu&apos;à 3 salariés.</p>

              <div className="mt-6 flex flex-col gap-3 text-sm text-ink-soft">
                <div className="flex items-start gap-2.5">
                  <Dot color="bg-accent-teal" />
                  <span>Parcours et rappels illimités</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Dot color="bg-accent-teal" />
                  <span>Copilote IA inclus (gratuit pendant la bêta)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Dot color="bg-accent-teal" />
                  <span>Hébergé en Europe, sans engagement</span>
                </div>
              </div>

              <Link href="/sign-up" className="mt-6 inline-block">
                <Button variant="secondary" className="text-sm">
                  Essayer gratuitement
                </Button>
              </Link>
            </div>
            </Reveal>
          </div>

          <div className="sm:col-span-3">
            <Reveal variant="right" delay={100}>
            <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue/[0.03] p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-blue">Pro</p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-ink">15 €</span>
                <span className="text-sm text-ink-soft">/ mois</span>
                <span className="text-base text-ink-faint">+ 3 € / salarié / mois</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Salariés illimités, pour les équipes qui veulent que RH Pilot suive vraiment leur
                effectif au quotidien.
              </p>

              <div className="mt-6 flex flex-col gap-3 text-sm text-ink-soft">
                <div className="flex items-start gap-2.5">
                  <Dot color="bg-brand-blue" />
                  <span>Tout ce qui est dans Gratuit, sans limite de salariés</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Dot color="bg-brand-blue" />
                  <span>Copilote IA inclus, gratuit pendant toute la bêta</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Dot color="bg-brand-blue" />
                  <span>Facture unique mensuelle, forfait de base + salariés détaillés</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Dot color="bg-brand-blue" />
                  <span>Résiliable à tout moment</span>
                </div>
              </div>

              <Link href="/sign-up" className="mt-6 inline-block">
                <Button className="text-sm">
                  <span className="inline-flex items-center gap-2">
                    Essayer gratuitement <ArrowRight size={16} />
                  </span>
                </Button>
              </Link>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Enterprise, en ligne discrète plutôt qu'une troisième carte
          identique aux deux premières */}
      <section className="mx-auto max-w-4xl border-t border-surface-border px-6 py-10">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-ink">Besoin sur mesure ? Plusieurs sites, SIRH existant, accompagnement dédié.</p>
              <p className="mt-1 text-sm text-ink-soft">Enterprise — sur devis, on en discute directement.</p>
            </div>
            <Link
              href="mailto:aimenoffi@gmail.com"
              className="shrink-0 text-sm font-medium text-brand-blue hover:underline"
            >
              Nous contacter →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Honnêteté sur la bêta, cohérent avec le reste du site */}
      <section className="mx-auto max-w-2xl px-6 pb-16 text-center">
        <Reveal>
          <p className="text-sm text-ink-faint">
            RH Pilot est en bêta. Le Copilote IA reste gratuit pour tout le monde tant que la bêta
            dure, quel que soit le palier choisi.
          </p>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
