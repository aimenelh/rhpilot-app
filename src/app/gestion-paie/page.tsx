import Link from "next/link";
import { ArrowRight, Calculator, CalendarDays, FileClock, ReceiptText } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

const ITEMS = [
  { href: "/gestion-paie/production", title: "Production de la paie", text: "Préparer, calculer, contrôler et valider une période de paie.", icon: Calculator },
  { href: "/gestion-paie/variables", title: "Variables de paie", text: "Réunir les éléments du mois et les contrôler avant le calcul.", icon: ReceiptText },
  { href: "/gestion-paie/conges-absences", title: "Congés & absences", text: "Relier les événements RH à leur traitement dans la paie.", icon: CalendarDays },
  { href: "/gestion-paie/arrets-travail", title: "Arrêts de travail", text: "Structurer le suivi d’un arrêt et son impact sur la période.", icon: FileClock },
];

export const metadata = {
  title: "Gestion de la paie, RH Pilot",
  description: "Découvrez comment RH Pilot organise la préparation et le contrôle des données de paie.",
};

export default function GestionPaiePage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <Reveal variant="scale">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Gestion de la paie</p>
            <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              La paie, de la préparation au contrôle.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              RH Pilot organise les informations qui alimentent la paie, applique les règles disponibles et vous laisse la main sur la revue et la validation.
            </p>
          </Reveal>
        </section>

        <section className="border-y border-surface-border bg-white/75 py-16 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold text-ink">Les sujets couverts</p>
                  <h2 className="mt-2 text-3xl font-semibold leading-tight text-ink sm:text-4xl">Choisissez le sujet qui vous intéresse.</h2>
                </div>
              </div>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {ITEMS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.href} delay={index * 70}>
                    <Link href={item.href} className="group block rounded-2xl border border-surface-border bg-white p-7 transition-transform hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-34px_rgba(20,21,26,0.5)]">
                      <div className="flex items-start justify-between gap-5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary"><Icon size={19} /></span>
                        <ArrowRight size={18} className="text-ink-faint transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                      </div>
                      <h3 className="mt-8 text-xl font-semibold text-ink">{item.title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{item.text}</p>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <div className="rounded-[2rem] border border-surface-border bg-surface-subtle p-8 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Notre approche</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">Le moteur calcule. Vous contrôlez.</h2>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-soft">
                RH Pilot sépare le calcul social de l’interface. Les règles produisent le résultat et leur version reste associée au calcul. L’interface vous donne ensuite les éléments nécessaires pour comprendre et vérifier la période.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                <div><p className="text-sm font-semibold text-ink">Règles versionnées</p><p className="mt-1 text-sm text-ink-soft">Le calcul conserve la version du modèle utilisé.</p></div>
                <div><p className="text-sm font-semibold text-ink">Données vérifiables</p><p className="mt-1 text-sm text-ink-soft">Les éléments qui alimentent la période restent visibles.</p></div>
                <div><p className="text-sm font-semibold text-ink">Blocage en cas de manque</p><p className="mt-1 text-sm text-ink-soft">Une donnée indispensable manque ? RH Pilot ne l’invente pas.</p></div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
