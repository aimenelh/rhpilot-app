import Link from "next/link";
import Image from "next/image";
import { TriangleAlert, Sparkles, Send, CircleCheck, BarChart3, Timer, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    accent: "text-accent-rose",
  },
  {
    icon: Sparkles,
    title: "Des suggestions, pas seulement des données",
    description:
      "RH Pilot détecte les oublis probables, comme une période d'essai qui approche ou un parcours jamais créé, et propose l'action en un clic.",
    accent: "text-brand-violet",
  },
  {
    icon: Send,
    title: "Des rappels qui partent tout seuls",
    description:
      "Résumés automatiques et rappels manuels, envoyés directement à la bonne personne, pas seulement à vous.",
    accent: "text-accent-teal",
  },
  {
    icon: CircleCheck,
    title: "Un vrai parcours, pas une case à cocher",
    description:
      "Chaque événement RH devient un plan complet (tâches, échéances, preuves attendues), pas juste un rappel isolé.",
    accent: "text-brand-blue",
  },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
      {children}
    </span>
  );
}

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

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-2 lg:gap-16 lg:pt-28">
          <div>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              La mémoire ne devrait{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">jamais</span>{" "}
              être le principal outil d&apos;une équipe RH.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-soft">
              RH Pilot centralise vos échéances, vos parcours et vos actions RH pour vous
              aider à savoir quoi faire, quand le faire, et pourquoi.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/sign-up">
                <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
              </Link>
              <Link href="/sign-in" className="text-sm font-medium text-ink-soft hover:text-ink">
                J&apos;ai déjà un compte →
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-faint">
              <span className="flex items-center gap-1.5">
                <CircleCheck size={13} className="text-accent-teal" /> Hébergé en Europe
              </span>
              <span className="flex items-center gap-1.5">
                <CircleCheck size={13} className="text-accent-teal" /> Sécurisé
              </span>
              <span className="flex items-center gap-1.5">
                <CircleCheck size={13} className="text-accent-teal" /> Pensé pour le RGPD
              </span>
            </div>
          </div>

          {/* Vraie capture du produit, pas une illustration */}
          <Reveal>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-surface-border shadow-2xl">
                <Image
                  src="/marketing/dashboard.png"
                  alt="Tableau de bord RH Pilot"
                  width={1672}
                  height={941}
                  className="w-full"
                  priority
                />
              </div>
              <div className="absolute -bottom-6 -left-4 max-w-[13rem] rounded-2xl bg-brand-blue px-4 py-3.5 text-sm font-medium leading-relaxed text-white shadow-xl sm:-left-8 sm:max-w-[15rem]">
                « Je veux arrêter d&apos;oublier les périodes d&apos;essai qui se terminent. »
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Fonctionnalités — trois blocs honnêtes, ce que RH Pilot fait réellement aujourd'hui */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {/* Parcours collaborateur */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Parcours collaborateur</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">Suivez chaque étape, de l&apos;arrivée au départ.</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Créez des parcours personnalisés et assurez une expérience fluide et
                  conforme pour chaque collaborateur.
                </p>

                <div className="relative mt-6 flex items-center justify-between">
                  <div aria-hidden className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-surface-border" />
                  {["Arrivée", "Intégration", "Essai", "Suivi", "Départ"].map((label, i) => (
                    <span
                      key={label}
                      className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                        i === 2
                          ? "bg-brand-blue text-white"
                          : i < 2
                            ? "bg-accent-teal/15 text-accent-teal"
                            : "bg-white text-ink-faint ring-1 ring-surface-border"
                      }`}
                    >
                      {i < 2 ? <CircleCheck size={12} /> : i + 1}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-center text-[10px] text-ink-faint">
                  Arrivée · Intégration · Période d&apos;essai · Suivi · Départ
                </p>

                <Card className="mt-4">
                  <p className="text-sm font-medium text-ink">Mathis — Développeur</p>
                  <p className="text-xs text-accent-amber">Étape actuelle : Période d&apos;essai</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                    <div className="h-full rounded-full bg-brand-gradient" style={{ width: "66%" }} />
                  </div>
                </Card>
              </div>

              {/* Automatisations */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Automatisations</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">Gagnez du temps. Restez serein.</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  RH Pilot déclenche les bonnes actions au bon moment, dès qu&apos;un
                  événement RH survient.
                </p>

                <div className="mt-6 flex flex-col items-center gap-2">
                  <Card compact className="w-full text-center">
                    <p className="text-xs font-medium text-ink">Événement : Nouvelle embauche</p>
                  </Card>
                  <span className="text-ink-faint">↓</span>
                  <Card compact className="w-full border-brand-blue/20 bg-brand-blue/5 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-brand-blue">
                      <Sparkles size={12} /> RH Pilot crée le parcours d&apos;intégration
                    </p>
                  </Card>
                  <div className="mt-1 grid w-full grid-cols-2 gap-1.5 text-[10px] text-ink-faint">
                    <span className="rounded bg-surface-subtle px-2 py-1 text-center">Documents</span>
                    <span className="rounded bg-surface-subtle px-2 py-1 text-center">Visite médicale</span>
                    <span className="rounded bg-surface-subtle px-2 py-1 text-center">Formation</span>
                    <span className="rounded bg-surface-subtle px-2 py-1 text-center">Rappel manager</span>
                  </div>
                </div>
              </div>

              {/* Assistant RH */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Assistant RH</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">Posez vos questions. Obtenez des réponses.</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Votre assistant connaît vos données RH et vous aide à prendre les bonnes
                  décisions, sans jamais rien inventer.
                </p>

                <Card className="mt-6">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-blue px-3 py-1.5 text-xs text-white">
                      Quelles échéances cette semaine ?
                    </div>
                  </div>
                  <div className="mt-2 flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-surface-subtle px-3 py-1.5 text-xs text-ink">
                      J&apos;observe 3 échéances cette semaine, dont la période d&apos;essai
                      de Mathis dans 5 jours.
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative py-16">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold text-ink">
              Comment un simple événement devient un parcours complet
            </h2>
          </Reveal>

          <JourneyFlow />
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:divide-x sm:divide-surface-border">
            <div className="text-center sm:px-6">
              <p className="flex items-baseline justify-center gap-2">
                <BarChart3 size={17} className="text-brand-blue/50" />
                <span className="text-5xl font-bold tracking-tight text-ink">
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

            <div className="text-center sm:px-6">
              <p className="flex items-baseline justify-center gap-2">
                <Timer size={17} className="text-brand-violet/50" />
                <span className="text-5xl font-bold tracking-tight text-ink">
                  60<span className="text-brand-violet">%</span>
                </span>
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                des RH passent au moins la moitié de leur journée sur des tâches
                administratives.
              </p>
              <p className="mt-1.5 text-sm font-medium text-brand-violet">
                → RH Pilot veille à ce que rien ne soit oublié.
              </p>
              <p className="mt-4 text-[11px] text-ink-faint">
                Baromètre RH au quotidien, Éditions Tissot / PayFit, 2025
              </p>
            </div>

            <div className="text-center sm:px-6">
              <p className="flex items-baseline justify-center gap-2">
                <CalendarClock size={17} className="text-accent-amber/60" />
                <span className="text-5xl font-bold tracking-tight text-ink">272 300</span>
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                fins de période d&apos;essai chaque trimestre en France.
              </p>
              <p className="mt-1.5 text-sm font-medium text-accent-amber">
                → Chacune a un délai de prévenance à ne pas manquer.
              </p>
              <p className="mt-4 text-[11px] text-ink-faint">
                Dares, Ministère du Travail (T3 2025)
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ink">Voici RH Pilot, tel qu&apos;il est vraiment</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-ink-soft">
                Pas de maquette retouchée : ce sont de vraies captures de l&apos;application,
                en bêta aujourd&apos;hui.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 flex flex-col gap-16">
            {/* Calendrier */}
            <Reveal>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-5 lg:gap-12">
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Calendrier</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">
                    Toutes les échéances au même endroit.
                  </h3>
                  <p className="mt-3 text-sm text-ink-soft">
                    Aujourd&apos;hui, cette semaine, ce mois-ci, en retard — jamais besoin de
                    recouper plusieurs vues pour savoir où vous en êtes.
                  </p>
                </div>
                <div className="group lg:col-span-3">
                  <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl">
                    <div className="flex items-center gap-1.5 border-b border-surface-border bg-surface-subtle px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-accent-rose/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-accent-amber/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-accent-teal/50" />
                    </div>
                    <Image
                      src="/marketing/calendar.png"
                      alt="Calendrier RH Pilot"
                      width={1688}
                      height={932}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Notifications */}
            <Reveal delay={100}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-5 lg:gap-12">
                <div className="group order-2 lg:order-1 lg:col-span-3">
                  <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl">
                    <div className="flex items-center gap-1.5 border-b border-surface-border bg-surface-subtle px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-accent-rose/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-accent-amber/50" />
                      <span className="h-2.5 w-2.5 rounded-full bg-accent-teal/50" />
                    </div>
                    <Image
                      src="/marketing/notifications.png"
                      alt="Notifications RH Pilot"
                      width={1681}
                      height={935}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="order-1 lg:order-2 lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Notifications</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">
                    Qui a été relancé, et quand.
                  </h3>
                  <p className="mt-3 text-sm text-ink-soft">
                    Un historique complet des rappels envoyés — jamais besoin de se demander
                    si quelqu&apos;un a déjà été prévenu.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Assistant */}
            <Reveal delay={200}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-5 lg:gap-12">
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Assistant</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">
                    Une réponse à chaque question, sur chaque écran.
                  </h3>
                  <p className="mt-3 text-sm text-ink-soft">
                    L&apos;assistant vous suit partout dans l&apos;application, avec des
                    suggestions adaptées à l&apos;écran où vous êtes.
                  </p>
                </div>
                <div className="group flex justify-center lg:col-span-3">
                  <div className="w-full max-w-sm overflow-hidden rounded-xl border border-surface-border bg-white shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl">
                    <Image
                      src="/marketing/assistant.png"
                      alt="Assistant RH Pilot"
                      width={570}
                      height={720}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative py-16">
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

      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal variant="scale">
          <div className="text-center">
            <Kicker>Ce qui change vraiment</Kicker>
            <h2 className="mt-3 text-2xl font-semibold text-ink">
              Pourquoi les RH choisissent RH Pilot
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 border-t border-surface-border">
          {BENEFITS.map((benefit, index) => (
            <Reveal key={benefit.title} variant="left" delay={index * 90}>
              <div className="group grid grid-cols-1 items-center gap-3 border-b border-surface-border py-7 transition-colors duration-300 hover:bg-surface-subtle/40 sm:grid-cols-12 sm:gap-6 sm:px-4">
                <span
                  aria-hidden
                  className="select-none text-5xl font-bold leading-none transition-colors duration-300 sm:col-span-2 sm:text-6xl"
                  style={{
                    WebkitTextStroke: "1.5px rgba(15, 27, 61, 0.16)",
                    color: "transparent",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex items-center gap-3 sm:col-span-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle ${benefit.accent}`}>
                    <benefit.icon size={18} />
                  </span>
                  <h3 className="text-base font-semibold text-ink">{benefit.title}</h3>
                </div>

                <p className="text-sm leading-relaxed text-ink-soft sm:col-span-6">
                  {benefit.description}
                </p>
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
