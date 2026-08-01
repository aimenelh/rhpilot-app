import Link from "next/link";
import { TriangleAlert, Sparkles, Send, CircleCheck, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { StoryStep1, StoryStep2, StoryStep3 } from "@/components/landing/StorySteps";

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
      "RH Pilot détecte les oublis probables — une période d'essai qui approche, un parcours jamais créé — et propose l'action en un clic.",
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
      "Chaque événement RH devient un plan complet — tâches, échéances, preuves attendues — pas juste un rappel isolé.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-subtle">
      <MarketingHeader />

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            La mémoire ne devrait{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">jamais</span>{" "}
            être le principal outil d&apos;une équipe RH.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-ink-soft">
            RH Pilot transforme chaque événement RH en plan d&apos;action clair — les bonnes
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

        <div className="flex justify-center lg:justify-end">
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-surface-border bg-white py-16">
        <div className="mx-auto max-w-2xl px-6">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold text-ink">
              Comment un simple événement devient un parcours complet
            </h2>
          </Reveal>

          <div className="mx-auto mt-10 flex max-w-xs flex-col items-center gap-3">
            <Reveal>
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-ink-soft">Vous embauchez Julie Martin.</p>
                <StoryStep1 />
              </div>
            </Reveal>

            <ArrowDown size={18} className="text-ink-faint" aria-hidden />

            <Reveal delay={150}>
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-ink-soft">RH Pilot génère automatiquement le plan d&apos;action.</p>
                <StoryStep2 />
              </div>
            </Reveal>

            <ArrowDown size={18} className="text-ink-faint" aria-hidden />

            <Reveal delay={300}>
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-ink-soft">Les rappels arrivent naturellement, sans y penser.</p>
                <StoryStep3 />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <Reveal>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="text-center">
              <span className="text-2xl">📊</span>
              <p className="mt-2 text-4xl font-semibold text-brand-blue">45%</p>
              <p className="mt-2 text-sm text-ink-soft">
                des salariés français travaillent dans une TPE ou une PME.
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                → RH Pilot a été pensé pour elles.
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                Source : Insee (TPE-PME, micro-entreprises incluses)
              </p>
            </div>
            <div className="text-center">
              <span className="text-2xl">⏱️</span>
              <p className="mt-2 text-4xl font-semibold text-brand-blue">60%</p>
              <p className="mt-2 text-sm text-ink-soft">
                des RH passent au moins la moitié de leur journée sur des tâches
                administratives.
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                → RH Pilot ne fait pas ce travail à leur place. Il veille simplement à ce
                que rien ne soit oublié.
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                Source : Baromètre RH au quotidien, Éditions Tissot / PayFit, 2026
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold text-ink">
            Pourquoi les RH choisissent RH Pilot
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {BENEFITS.map((benefit, index) => (
            <Reveal key={benefit.title} delay={(index % 2) * 150}>
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                  <benefit.icon size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{benefit.description}</p>
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
