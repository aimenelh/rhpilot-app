import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { TestimonialsCarousel } from "@/components/landing/TestimonialsCarousel";
import { AmbientGlow } from "@/components/landing/AmbientGlow";
import { JourneyFlow } from "@/components/landing/JourneyFlow";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { HumanWorkVideo } from "@/components/landing/HumanWorkVideo";

const BENEFITS = [
  {
    title: "Rien ne passe inaperçu",
    description:
      "Les tâches en retard et les échéances proches remontent toujours en premier, sans avoir à les chercher.",
    dot: "bg-accent-rose",
  },
  {
    title: "Des suggestions, pas seulement des données",
    description:
      "RH Pilot détecte les oublis probables, comme une période d'essai qui approche ou un parcours jamais créé, et propose l'action en un clic.",
    dot: "bg-brand-primary-dark",
  },
  {
    title: "Des rappels qui partent tout seuls",
    description:
      "Résumés automatiques et rappels manuels, envoyés directement à la bonne personne, pas seulement à vous.",
    dot: "bg-accent-teal",
  },
  {
    title: "Un vrai parcours, pas une case à cocher",
    description:
      "Chaque événement RH devient un plan complet (tâches, échéances, preuves attendues), pas juste un rappel isolé.",
    dot: "bg-brand-primary",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <AmbientGlow />
      <MarketingHeader />

      <section className="relative min-h-[calc(100vh-88px)] overflow-hidden bg-white">
        <HumanWorkVideo className="inset-0 h-full w-full [&_.human-work-video-frame]:h-full [&_.human-work-video-frame]:w-full [&_.human-work-video-frame]:rotate-0 [&_.human-work-video-frame]:rounded-none [&_.human-work-video-frame]:border-0 [&_.human-work-video-frame]:shadow-none [&_.human-work-video-frame>div:first-child]:h-full [&_.human-work-video-frame>div:first-child]:w-full [&_.human-work-video-frame>div:first-child]:rounded-none [&_.human-work-video-frame>div:first-child]:aspect-auto [&_.human-work-video-frame>div:first-child>video]:object-cover [&_.human-work-video-shape]:hidden [&_.human-work-video-dots]:hidden [&_.human-work-video-note]:hidden" />
      </section>

      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden border-b border-surface-border bg-white px-6 py-24 sm:min-h-[76vh]">
        <Reveal>
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display sr-only">
              Embauche, période d&apos;essai, visite médicale. Rien n&apos;est oublié.
            </h1>
            <p className="font-handwriting text-4xl leading-tight text-brand-primary sm:text-6xl lg:text-7xl">
              Des équipes RH
              <br />
              plus sereines
            </p>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
              RH Pilot transforme chaque événement RH en plan d&apos;action clair, avec ses échéances et ses responsables.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="relative overflow-visible border-b border-surface-border bg-white px-6 pb-24 pt-20 sm:pb-28 sm:pt-24">
        <Reveal variant="up">
          <div className="relative mx-auto max-w-6xl">
            <div className="relative mx-auto max-w-5xl">
              <div className="overflow-hidden rounded-[1.25rem] border border-surface-border bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
                <Image
                  src="/marketing/dashboard.png"
                  alt="Tableau de bord RH Pilot"
                  width={1885}
                  height={1030}
                  className="w-full"
                  priority
                />
              </div>
              <Image
                src="/illustrations/illu-copilote-hero.png"
                alt=""
                width={802}
                height={1274}
                className="pointer-events-none absolute -top-2 right-[13%] z-40 h-36 w-auto sm:-top-3 sm:right-[15%] sm:h-44 lg:h-48"
              />
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Voir RH Pilot en action</span>
              <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">Du problème détecté au parcours généré, en quelques clics.</h2>
            </div>
          </Reveal>
          <Reveal delay={100} className="mt-10"><InteractiveDemo /></Reveal>
        </div>
      </section>

      <section className="relative border-y border-surface-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="max-w-xl">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Vos échéances</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">Les échéances n&apos;attendent pas.</h2>
                <p className="mt-4 text-base leading-relaxed text-ink-soft">Un calendrier clair pour savoir ce qui arrive, ce qui est en retard et qui doit agir.</p>
              </div>
              <div className="min-w-0">
                <Image
                  src="/marketing/calendar-feature.svg"
                  alt="Calendrier RH Pilot avec les échéances et retards à surveiller"
                  width={1500}
                  height={820}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative border-b border-surface-border bg-surface-subtle py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="order-2 min-w-0 lg:order-1">
                <Image
                  src="/marketing/notifications-feature.svg"
                  alt="Notifications RH Pilot et envoi des résumés"
                  width={1500}
                  height={820}
                  className="h-auto w-full"
                />
              </div>
              <div className="order-1 max-w-xl lg:order-2">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Notifications</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">Une relance ne devrait jamais dépendre de votre mémoire.</h2>
                <p className="mt-4 text-base leading-relaxed text-ink-soft">Les résumés partent au bon moment et l&apos;historique garde la trace de ce qui a déjà été envoyé.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="copilote" className="relative border-b border-surface-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="max-w-xl">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Copilote</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">Une question RH ? Demandez, il s&apos;en occupe.</h2>
                <p className="mt-4 text-base leading-relaxed text-ink-soft">RH Pilot regarde vos données et vous répond dans le contexte de votre entreprise, sans vous faire chercher dans cinq écrans.</p>
              </div>
              <div className="min-w-0">
                <Image
                  src="/marketing/copilot-feature.svg"
                  alt="Copilote RH Pilot répond à une question RH à partir des données de l'entreprise"
                  width={1500}
                  height={820}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <JourneyFlow />

      <section className="relative overflow-hidden border-y border-surface-border bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
          <div><p className="text-3xl font-bold text-ink">272 300</p><p className="mt-1 text-sm text-ink-faint">échéances RH générées</p></div>
          <div><p className="text-3xl font-bold text-ink">45%</p><p className="mt-1 text-sm text-ink-faint">moins d&apos;oubli sur les tâches récurrentes</p></div>
          <div><p className="text-3xl font-bold text-ink">60%</p><p className="mt-1 text-sm text-ink-faint">du temps administratif économisé</p></div>
        </div>
      </section>

      <section className="border-y border-surface-border bg-surface-subtle py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Parcours</p>
                <p className="mt-3 text-lg font-semibold text-ink">Un événement RH, un parcours complet.</p>
                <p className="mt-2 text-sm text-ink-soft">RH Pilot déclenche les bonnes actions au bon moment, dès qu&apos;un événement RH survient.</p>
              </Card>
              <Card>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Suivi</p>
                <p className="mt-3 text-lg font-semibold text-ink">Rien ne reste dans votre tête.</p>
                <p className="mt-2 text-sm text-ink-soft">Les échéances, responsables et actions restent visibles au même endroit.</p>
              </Card>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Ils en parlent</span>
              <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">Ce que les équipes RH pensent de leur quotidien avec RH Pilot.</h2>
            </div>
          </Reveal>
          <Reveal delay={100} className="mt-10"><TestimonialsCarousel /></Reveal>
        </div>
      </section>

      <section className="border-t border-surface-border bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal><h2 className="max-w-2xl text-2xl font-semibold text-ink sm:text-3xl">Un cadre clair pour les équipes RH.</h2></Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <Card key={benefit.title} compact>
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${benefit.dot}`} />
                <h3 className="mt-4 text-base font-semibold text-ink">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">RH Pilot</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">Vos RH méritent mieux que des rappels éparpillés.</h2>
            <p className="mt-4 text-base leading-relaxed text-white/75">Centralisez les événements, automatisez les actions et gardez une trace claire de ce qui a été fait.</p>
            <Link href="/sign-up" className="mt-7 inline-flex"><Button>Commencer gratuitement →</Button></Link>
          </div>
        </div>
        <Image src="/illustrations/illu-cta-final.png" alt="" width={900} height={600} className="pointer-events-none absolute bottom-0 right-0 hidden w-[34rem] max-w-[42vw] md:block" />
      </section>

      <MarketingFooter />
    </div>
  );
}
