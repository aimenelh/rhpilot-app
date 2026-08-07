import Link from "next/link";
import { TriangleAlert, Sparkles, Send, CircleCheck, BarChart3, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { TestimonialsCarousel } from "@/components/landing/TestimonialsCarousel";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { JourneyFlow } from "@/components/landing/JourneyFlow";

const BENEFITS = [
  {
    icon: TriangleAlert,
    title: "Rien ne passe inaperçu",
    description:
      "Les tâches en retard et les échéances proches remontent toujours en premier, sans avoir à les chercher.",
  },
  {
    icon: Sparkles,
    title: "Des suggestions, pas seulement des données",
    description:
      "RH Pilot détecte les oublis probables, comme une période d'essai qui approche ou un parcours jamais créé, et propose l'action en un clic.",
  },
  {
    icon: Send,
    title: "Des rappels qui partent tout seuls",
    description:
      "Résumés automatiques et rappels manuels, envoyés directement à la bonne personne, pas seulement à vous.",
  },
  {
    icon: CircleCheck,
    title: "Un vrai parcours, pas une case à cocher",
    description:
      "Chaque événement RH devient un plan complet (tâches, échéances, preuves attendues), pas juste un rappel isolé.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      <section className="relative overflow-hidden">
        {/* Fond vivant : halos diffus + points lumineux */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-blue/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-violet/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-accent-teal/10 blur-3xl"
        />
        <span aria-hidden className="pointer-events-none absolute left-[15%] top-[20%] h-1.5 w-1.5 rounded-full bg-brand-blue/50 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute right-[20%] top-[14%] h-2 w-2 rounded-full bg-brand-violet/50 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute bottom-[18%] right-[10%] h-1.5 w-1.5 rounded-full bg-accent-teal/50 blur-[1px]" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
              La mémoire ne devrait{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">jamais</span>{" "}
              être le principal outil d&apos;une équipe RH.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft">
              RH Pilot transforme chaque événement RH en plan d&apos;action clair : les bonnes
              échéances, les bons responsables, une vue d&apos;ensemble de ce qui reste à
              faire.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/sign-up">
                <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
              </Link>
              <Link href="/sign-in" className="text-sm font-medium text-ink-soft hover:text-ink">
                J&apos;ai déjà un compte →
              </Link>
            </div>
          </div>

          {/* Mobile / tablette : aperçu simple, la composition complète est réservée au desktop */}
          <div className="flex justify-center lg:hidden">
            <ProductPreview />
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold text-ink">
              Comment un simple événement devient un parcours complet
            </h2>
          </Reveal>

          <JourneyFlow />
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-6 py-16">
        <Reveal>
          <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-0">
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 hidden h-28 w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-surface-border to-transparent sm:block"
            />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 hidden h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-brand-blue/50 sm:block"
            />

            <div className="text-center sm:pr-12 sm:text-right">
              <p className="flex items-baseline justify-center gap-2 sm:justify-end">
                <BarChart3 size={18} className="text-brand-blue/50" />
                <span className="text-6xl font-bold tracking-tight text-ink">
                  45<span className="text-brand-blue">%</span>
                </span>
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                des salariés français travaillent dans une TPE ou une PME.
              </p>
              <p className="mt-1.5 text-sm font-medium text-brand-blue">
                → RH Pilot a été pensé pour elles.
              </p>
              <p className="mt-4 text-[11px] text-ink-faint">Insee</p>
            </div>

            <div className="text-center sm:pl-12 sm:text-left">
              <p className="flex items-baseline justify-center gap-2 sm:justify-start">
                <Timer size={18} className="text-brand-violet/50" />
                <span className="text-6xl font-bold tracking-tight text-ink">
                  60<span className="text-brand-violet">%</span>
                </span>
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                des RH passent au moins la moitié de leur journée sur des tâches
                administratives.
              </p>
              <p className="mt-1.5 text-sm font-medium text-brand-violet">
                → RH Pilot veille simplement à ce que rien ne soit oublié.
              </p>
              <p className="mt-4 text-[11px] text-ink-faint">
                Baromètre RH au quotidien, Éditions Tissot / PayFit, 2026
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6">
          <Reveal>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ink">Ils en parlent</h2>
              <p className="mt-3 text-sm text-ink-soft">
                Avant même la première version de RH Pilot, nous avons interrogé des
                professionnels RH sur les tâches qui leur demandaient le plus de vigilance.
                Voici ce qu&apos;ils nous ont répondu.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-8">
              <TestimonialsCarousel />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold text-ink">
            Pourquoi les RH choisissent RH Pilot
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {BENEFITS.map((benefit, index) => (
            <Reveal key={benefit.title} delay={(index % 2) * 150}>
              <div className="group flex gap-4 rounded-2xl border border-surface-border bg-white/70 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue transition-colors duration-300 group-hover:bg-brand-blue group-hover:text-white">
                  <benefit.icon size={22} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{benefit.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{benefit.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-ink py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-2xl font-semibold text-white">
              Prêt à ne plus rien oublier ?
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Créez votre espace en quelques minutes, sans engagement.
            </p>
            <Link href="/sign-up" className="mt-6 inline-block">
              <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
