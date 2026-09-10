import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientGlow } from "@/components/landing/AmbientGlow";
import { Reveal } from "@/components/landing/Reveal";
import { PricingCalculator } from "@/components/landing/PricingCalculator";

export const metadata = {
  title: "Tarifs, RH Pilot",
  description: "Un prix simple, par salarié. Le Copilote IA reste gratuit pendant toute la bêta.",
};

function FeatureLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Check size={16} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export default function TarifsPage() {
  return (
    <div className="min-h-screen">
      <AmbientGlow />
      <MarketingHeader />

      {/* Le manifeste, même registre que le reste du site */}
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
        <Reveal variant="scale">
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Un prix simple, <span className="bg-brand-primary bg-clip-text text-transparent">par salarié</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
            Pas de palier caché ni de fonctionnalité verrouillée pour vous faire changer d&apos;offre.
          </p>
        </Reveal>
      </section>

      {/* Le calculateur d'abord : la formule de prix n'est pas un slogan,
          c'est un vrai calcul. Autant laisser le visiteur le faire lui-même
          plutôt que de le lui résumer en une ligne. */}
      <section className="mx-auto max-w-xl px-6 pb-16">
        <Reveal variant="up">
          <PricingCalculator />
        </Reveal>
      </section>

      {/* Pro comme seul vrai contenu de cette section, pas une carte parmi
          deux : c'est le produit tel qu'il est pensé pour durer. Gratuit
          redescend en simple mention texte plus bas, pas en case
          concurrente au même niveau visuel. */}
      <section className="mx-auto max-w-3xl border-t border-surface-border px-6 py-16">
        <Reveal>
          <div className="grid gap-10 sm:grid-cols-[auto_1fr] sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-primary">Pro</p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold text-ink">15 €</span>
              </p>
              <p className="text-sm text-ink-faint">+ 3 € / salarié / mois</p>
            </div>

            <div>
              <p className="text-base leading-relaxed text-ink-soft">
                Salariés illimités, pour les équipes qui veulent que RH Pilot suive vraiment leur
                effectif au quotidien.
              </p>

              <div className="mt-6 flex flex-col gap-3 text-sm text-ink-soft">
                <FeatureLine>Parcours et rappels illimités, sans limite de salariés</FeatureLine>
                <FeatureLine>
                  Toute la gestion de la paie : bulletins, cotisations sociales, congés et absences,
                  arrêts de travail, référentiel conventionnel, contexte employeur
                </FeatureLine>
                <FeatureLine>Copilote IA inclus, gratuit à vie</FeatureLine>
                <FeatureLine>Facture unique mensuelle, forfait de base + salariés détaillés</FeatureLine>
                <FeatureLine>Résiliable à tout moment</FeatureLine>
              </div>

              <Link href="/sign-up" className="mt-7 inline-block">
                <Button className="text-sm">
                  <span className="inline-flex items-center gap-2">
                    Créer mon compte <ArrowRight size={16} />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Gratuit et Enterprise, deux mentions discrètes au même registre,
          pas deux cartes qui concurrencent Pro visuellement. */}
      <section className="mx-auto max-w-3xl divide-y divide-surface-border border-t border-surface-border px-6">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-ink">
                Vous voulez tester avant ? Le palier Gratuit couvre jusqu&apos;à 3 salariés, Copilote IA
                inclus le temps de la bêta.
              </p>
              <p className="mt-1 text-sm text-ink-soft">Sans engagement, hébergé en Europe.</p>
            </div>
            <Link href="/sign-up" className="shrink-0 text-sm font-medium text-brand-primary hover:underline">
              Essayer gratuitement →
            </Link>
          </div>
        </Reveal>
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-ink">Besoin sur mesure ? Plusieurs sites, SIRH existant, accompagnement dédié.</p>
              <p className="mt-1 text-sm text-ink-soft">Enterprise sur devis, on en discute directement.</p>
            </div>
            <Link
              href="mailto:aimenoffi@gmail.com"
              className="shrink-0 text-sm font-medium text-brand-primary hover:underline"
            >
              Nous contacter →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Honnêteté sur la bêta, cohérent avec le reste du site */}
      <section className="mx-auto max-w-2xl px-6 py-16 text-center">
        <Reveal>
          <p className="text-sm text-ink-faint">
            RH Pilot est en bêta. Sur le palier Gratuit, le Copilote IA reste inclus tant que la bêta
            dure. Sur le palier Pro, il reste inclus gratuitement, bêta ou pas. Le module Paie continue
            de se construire vers une conformité complète.
          </p>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
