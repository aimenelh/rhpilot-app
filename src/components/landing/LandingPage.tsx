import Link from "next/link";
import Image from "next/image";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { TestimonialsCarousel } from "@/components/landing/TestimonialsCarousel";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { JourneyFlow } from "@/components/landing/JourneyFlow";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";

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
      <AmbientNetwork />
      <MarketingHeader />

      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-4xl px-6 pb-8 pt-24 text-center lg:pt-32">
          <Reveal variant="scale">
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.5rem]">
              La mémoire ne devrait{" "}
              <span className="bg-brand-primary bg-clip-text text-transparent">jamais</span>{" "}
              être le principal outil d&apos;une équipe RH.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft">
              RH Pilot centralise vos échéances, vos parcours et vos actions RH pour vous
              aider à savoir quoi faire, quand le faire, et pourquoi.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
              </Link>
              <Link href="/sign-in" className="text-sm font-medium text-ink-soft hover:text-ink">
                J&apos;ai déjà un compte →
              </Link>
            </div>
            <p className="mt-6 text-xs font-medium text-ink-faint">
              Hébergé en Europe · Sécurisé · Pensé pour le RGPD
            </p>
          </Reveal>
        </div>

        {/* La vraie capture, montrée en confiance et en grand, avec le
            Copilote qui déborde du coin plutôt que sagement encadré. */}
        <Reveal variant="up" delay={150}>
          <div className="relative mx-auto mt-8 max-w-5xl px-6 pb-20">
            <div className="overflow-hidden rounded-xl border border-surface-border shadow-2xl">
              <Image
                src="/marketing/dashboard.png"
                alt="Tableau de bord RH Pilot"
                width={1885}
                height={1030}
                className="w-full"
                priority
              />
            </div>
            <style>{`
              @media (prefers-reduced-motion: no-preference) {
                @keyframes heroCopiloteLand {
                  0% { transform: translateY(-10px); }
                  55% { transform: translateY(6px); }
                  75% { transform: translateY(-3px); }
                  100% { transform: translateY(0); }
                }
                .hero-copilote-land {
                  animation: heroCopiloteLand 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.65s both;
                }
              }
            `}</style>
            <Image
              src="/illustrations/illu-copilote-hero.png"
              alt=""
              width={802}
              height={1274}
              className="hero-copilote-land pointer-events-none absolute -top-16 right-10 h-28 w-auto sm:-top-24 sm:right-16 sm:h-40"
            />
          </div>
        </Reveal>
      </section>

      {/* Démo interactive : capture réelles + faux curseur animé */}
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

      {/* Fonctionnalités : ce que RH Pilot fait réellement aujourd'hui */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="max-w-lg text-2xl font-semibold text-ink">
              Trois choses que RH Pilot fait pour vous, tous les jours.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
              {/* Parcours collaborateur */}
              <div>
                <Image src="/illustrations/illu-salut.png" alt="" width={342} height={620} className="h-20 w-auto" />
                <h3 className="mt-3 text-lg font-semibold text-ink">Suivez chaque étape, de l&apos;arrivée au départ.</h3>
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
                          ? "bg-brand-primary text-white"
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
                  <p className="text-sm font-medium text-ink">Mathis, développeur</p>
                  <p className="text-xs text-accent-amber">Étape actuelle : Période d&apos;essai</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: "66%" }} />
                  </div>
                </Card>
              </div>

              {/* Automatisations */}
              <div>
                <h3 className="text-lg font-semibold text-ink">Un événement RH, un parcours complet.</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  RH Pilot déclenche les bonnes actions au bon moment, dès qu&apos;un
                  événement RH survient.
                </p>

                <div className="mt-6 flex flex-col items-center gap-2">
                  <Card compact className="w-full text-center">
                    <p className="text-xs font-medium text-ink">Événement : Nouvelle embauche</p>
                  </Card>
                  <span className="text-ink-faint">↓</span>
                  <Card compact className="w-full border-brand-primary/20 bg-brand-primary/5 text-center">
                    <p className="text-xs font-medium text-brand-primary">
                      RH Pilot crée le parcours d&apos;intégration
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
                <h3 className="text-lg font-semibold text-ink">Posez vos questions. Obtenez des réponses.</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Votre assistant connaît vos données RH et vous aide à prendre les bonnes
                  décisions, sans jamais rien inventer.
                </p>

                <Card className="mt-6">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-primary px-3 py-1.5 text-xs text-white">
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
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-5 sm:items-start sm:gap-10">
            {/* La statistique la plus directement liée à RH Pilot,
                mise en avant plutôt que noyée dans trois colonnes
                identiques. */}
            <div className="sm:col-span-2 sm:border-r sm:border-surface-border sm:pr-8">
              <div className="flex items-start justify-between gap-4">
                <p className="text-6xl font-bold tracking-tight text-ink">272 300</p>
                <Image
                  src="/illustrations/illu-calendrier.png"
                  alt=""
                  width={448}
                  height={539}
                  className="h-14 w-auto shrink-0 sm:h-20"
                />
              </div>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                Fins de période d&apos;essai chaque trimestre en France, chacune avec un délai de
                prévenance à ne pas manquer.
              </p>
              <p className="mt-4 text-[11px] text-ink-faint">Dares, Ministère du Travail (T3 2025)</p>
            </div>

            <div className="flex flex-col gap-8 sm:col-span-3 sm:pl-4">
              <div>
                <p className="text-2xl font-bold text-ink">
                  45<span className="text-brand-primary">%</span>{" "}
                  <span className="text-base font-normal text-ink-soft">
                    des salariés français travaillent dans une TPE ou une PME.
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] text-ink-faint">Insee</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">
                  60<span className="text-brand-primary-dark">%</span>{" "}
                  <span className="text-base font-normal text-ink-soft">
                    du temps d&apos;une équipe RH part dans l&apos;administratif plutôt que dans
                    l&apos;humain.
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  Baromètre RH au quotidien, Éditions Tissot / PayFit, 2025
                </p>
              </div>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Calendrier</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">
                    Toutes les échéances au même endroit.
                  </h3>
                  <p className="mt-3 text-sm text-ink-soft">
                    Aujourd&apos;hui, cette semaine, ce mois-ci, en retard, plus jamais besoin de
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
                      width={1882}
                      height={1036}
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
                      width={1882}
                      height={1027}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="order-1 lg:order-2 lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Notifications</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">
                    Qui a été relancé, et quand.
                  </h3>
                  <p className="mt-3 text-sm text-ink-soft">
                    Un historique complet des rappels envoyés, plus jamais besoin de se demander
                    si quelqu&apos;un a déjà été prévenu.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Assistant */}
            <Reveal delay={200}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-5 lg:gap-12">
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Assistant</p>
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
                      width={842}
                      height={675}
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
        <Reveal variant="left">
          <h2 className="mt-3 text-2xl font-semibold text-ink">
            Comment RH Pilot se comporte au quotidien
          </h2>
        </Reveal>

        <div className="mt-12 border-t border-surface-border">
          {BENEFITS.map((benefit, index) => (
            <Reveal key={benefit.title} variant="left" delay={index * 90}>
              <div className="border-b border-surface-border py-8 sm:flex sm:items-baseline sm:gap-10">
                <h3 className="flex items-center gap-2.5 text-lg font-semibold text-ink sm:w-72 sm:shrink-0">
                  <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${benefit.dot}`} />
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:mt-0">{benefit.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-visible bg-ink py-16">
        {/* Personnage posé sur le bord supérieur de la section, jambes
            dans le vide, comme celui du hero sur le tableau de bord.
            Position calculée à partir de la maquette fournie : 81 %
            de l'illustration au-dessus du bord, 19 % retombant dessus,
            centré avec un léger décalage à droite (+3,6 % de la
            largeur de la section). */}
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            @keyframes ctaCopiloteSway {
              0%, 100% { transform: translateX(-50%) rotate(0deg); }
              50% { transform: translateX(-50%) rotate(1.2deg); }
            }
            .cta-copilote-sway {
              animation: ctaCopiloteSway 4.5s ease-in-out infinite;
              transform-origin: 50% 100%;
            }
          }
        `}</style>
        <Image
          src="/illustrations/illu-cta-final.png"
          alt=""
          width={1319}
          height={979}
          className="cta-copilote-sway pointer-events-none absolute left-[58%] top-[-4.7rem] z-10 h-28 w-auto -translate-x-1/2 sm:top-[-7.2rem] sm:h-[170px]"
        />
        <Reveal>
          <div className="relative mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-2xl font-semibold text-white">
              Rien n&apos;est encore oublié. Gardons ça comme ça.
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Ajoutez votre premier salarié et commencez à suivre vos échéances RH.
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
