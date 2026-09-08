import Link from "next/link";
import Image from "next/image";
import { CircleCheck } from "lucide-react";
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

      {/* Séquence d'ouverture : vidéo plein écran, message central, puis produit. */}
      <section className="relative min-h-[calc(100vh-88px)] overflow-hidden border-b border-surface-border bg-white lg:min-h-[calc(100vh-88px)]">
        <HumanWorkVideo className="inset-0 h-full w-full [&_.human-work-video-frame]:h-full [&_.human-work-video-frame]:w-full [&_.human-work-video-frame]:rotate-0 [&_.human-work-video-frame]:rounded-none [&_.human-work-video-frame]:border-0 [&_.human-work-video-frame]:shadow-none [&_.human-work-video-frame>div:first-child]:h-full [&_.human-work-video-frame>div:first-child]:w-full [&_.human-work-video-frame>div:first-child]:rounded-none [&_.human-work-video-frame>div:first-child]:aspect-auto [&_.human-work-video-frame>div:first-child>video]:object-cover [&_.human-work-video-note]:hidden [&_.human-work-video-shape]:hidden [&_.human-work-video-dots]:hidden" />
      </section>

      <section className="relative flex min-h-[68vh] items-center justify-center overflow-hidden border-b border-surface-border bg-white px-6 py-24 sm:min-h-[72vh]">
        <Reveal>
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="sr-only">
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

      <section className="relative overflow-hidden border-b border-surface-border bg-white px-6 pb-24 pt-20 sm:pb-28 sm:pt-24">
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
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
                Voir RH Pilot en action
              </span>
              <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">
                Du problème détecté au parcours généré, en quelques clics.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <InteractiveDemo />
          </Reveal>
        </div>
      </section>

      <section id="copilote" className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="max-w-lg text-2xl font-semibold text-ink">
              Trois choses que RH Pilot fait pour vous, tous les jours.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
              <div>
                <Image src="/illustrations/illu-salut.png" alt="" width={342} height={620} className="h-20 w-auto" />
                <h3 className="mt-3 text-lg font-semibold text-ink">Suivez chaque étape, de l&apos;arrivée au départ.</h3>
                <p className="mt-2 text-sm text-ink-soft">Créez des parcours personnalisés et assurez une expérience fluide et conforme pour chaque collaborateur.</p>
                <div className="relative mt-6 flex items-center justify-between">
                  <div aria-hidden className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-surface-border" />
                  {["Arrivée", "Intégration", "Essai", "Suivi", "Départ"].map((label, i) => (
                    <span key={label} className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${i === 2 ? "bg-brand-primary text-white" : i < 2 ? "bg-accent-teal/15 text-accent-teal" : "bg-white text-ink-faint ring-1 ring-surface-border"}`}>{i < 2 ? <CircleCheck size={12} /> : i + 1}</span>
                  ))}
                </div>
                <p className="mt-2 text-center text-[10px] text-ink-faint">Arrivée · Intégration · Période d&apos;essai · Suivi · Départ</p>
                <Card className="mt-4">
                  <p className="text-sm font-medium text-ink">Mathis, développeur</p>
                  <p className="text-xs text-accent-amber">Étape actuelle : Période d&apos;essai</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-brand-primary" style={{ width: "66%" }} /></div>
                </Card>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">Un événement RH, un parcours complet.</h3>
                <p className="mt-2 text-sm text-ink-soft">RH Pilot déclenche les bonnes actions au bon moment, dès qu&apos;un événement RH survient.</p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Card compact className="w-full text-center"><p className="text-xs font-medium text-ink">Événement : Nouvelle embauche</p></Card>
                  <span className="text-ink-faint">↓</span>
                  <Card compact className="w-full border-brand-primary/20 bg-brand-primary/5 text-center"><p className="text-xs font-medium text-brand-primary">RH Pilot crée le parcours d&apos;intégration</p></Card>
                  <div className="mt-1 grid w-full grid-cols-2 gap-1.5 text-[10px] text-ink-faint"><span className="rounded bg-surface-subtle px-2 py-1 text-center">Documents</span><span className="rounded bg-surface-subtle px-2 py-1 text-center">Visite médicale</span><span className="rounded bg-surface-subtle px-2 py-1 text-center">Formation</span><span className="rounded bg-surface-subtle px-2 py-1 text-center">Rappel manager</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">Posez vos questions. Obtenez des réponses.</h3>
                <p className="mt-2 text-sm text-ink-soft">Votre assistant connaît vos données RH et vous aide à prendre les bonnes décisions, sans jamais rien inventer.</p>
                <Card className="mt-6">
                  <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-primary px-3 py-1.5 text-xs text-white">Quelles échéances cette semaine ?</div></div>
                  <div className="mt-2 flex justify-start"><div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-surface-subtle px-3 py-1.5 text-xs text-ink">J&apos;observe 3 échéances cette semaine, dont la période d&apos;essai de Mathis dans 5 jours.</div></div>
                </Card>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <JourneyFlow />

      <section className="relative overflow-hidden bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
          <div><p className="text-3xl font-bold text-ink">272 300</p><p className="mt-1 text-sm text-ink-faint">échéances RH générées</p></div>
          <div><p className="text-3xl font-bold text-ink">45%</p><p className="mt-1 text-sm text-ink-faint">moins d&apos;oubli sur les tâches récurrentes</p></div>
          <div><p className="text-3xl font-bold text-ink">60%</p><p className="mt-1 text-sm text-ink-faint">du temps administratif économisé</p></div>
        </div>
      </section>

      <section className="border-y border-surface-border bg-surface-subtle py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid gap-6 md:grid-cols-3">
              <Card><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Calendrier</p><p className="mt-3 text-lg font-semibold text-ink">Toutes vos échéances au même endroit.</p><p className="mt-2 text-sm text-ink-soft">Visualisez les événements à venir, les tâches en retard et les responsables associés.</p></Card>
              <Card><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Notifications</p><p className="mt-3 text-lg font-semibold text-ink">Les rappels partent au bon moment.</p><p className="mt-2 text-sm text-ink-soft">Réduisez les relances manuelles et gardez une trace de chaque action.</p></Card>
              <Card><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Assistant</p><p className="mt-3 text-lg font-semibold text-ink">Un copilote pour décider plus vite.</p><p className="mt-2 text-sm text-ink-soft">Posez vos questions et obtenez des réponses à partir de vos données RH.</p></Card>
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

      <section className="border-t border-surface-border bg-surface-subtle py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Gestion de la paie</p><h2 className="mt-3 max-w-2xl text-2xl font-semibold text-ink sm:text-3xl">Une paie fiable, documentée et traçable.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">Production, variables, absences, arrêts, cotisations et bulletin de paie : un cadre clair pour sécuriser chaque étape.</p></div>
          <Link href="/gestion-paie" className="shrink-0"><Button variant="secondary">Découvrir la gestion de la paie →</Button></Link>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">RH Pilot</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">Vos RH méritent mieux que des rappels éparpillés.</h2><p className="mt-4 text-base leading-relaxed text-white/75">Centralisez les événements, automatisez les actions et gardez une trace claire de ce qui a été fait.</p><Link href="/sign-up" className="mt-7 inline-flex"><Button>Commencer gratuitement →</Button></Link></div>
        </div>
        <Image src="/illustrations/illu-cta-final.png" alt="" width={900} height={600} className="pointer-events-none absolute bottom-0 right-0 hidden w-[34rem] max-w-[42vw] md:block" />
      </section>

      <MarketingFooter />
    </div>
  );
}
