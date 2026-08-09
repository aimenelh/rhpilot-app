import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  CalendarDays,
  Sparkles,
  CircleDashed,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { ServicesExperience } from "@/components/landing/ServicesExperience";

const PARCOURS_STANDARD = ["Création du dossier", "Documents", "Visite médicale", "Intégration", "Suivi à J+30"];
const PARCOURS_PERSONNALISE = [
  "Création du dossier",
  "Documents",
  "Formation obligatoire",
  "Présentation à l'équipe",
  "Point à J+30",
];

export const metadata = {
  title: "Nos services — RH Pilot",
  description:
    "Vivez en 60 secondes comment RH Pilot organise une journée RH : tableau de bord, copilote IA, parcours automatisés et personnalisables, notifications intelligentes.",
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      {/* Expérience interactive */}
      <section className="relative mx-auto max-w-4xl px-6 pb-20 pt-6 sm:pt-10">
        <ServicesExperience />
      </section>

      {/* Transition vers le détail */}
      <section className="relative border-y border-surface-border bg-white/70 py-12 backdrop-blur-sm">
        <Reveal>
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-xl font-semibold text-ink">Pour aller plus loin</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Le détail de ce que vous venez de vivre, fonctionnalité par fonctionnalité.
            </p>
          </div>
        </Reveal>
      </section>

      {/* 01 — PILOTER */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">01 — Piloter</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Votre activité RH en un coup d&apos;œil
            </h2>
            <p className="mt-3 text-base text-ink-soft">
              Dès la connexion, retrouvez vos collaborateurs, vos parcours actifs et vos
              échéances au même endroit — jamais besoin de recouper plusieurs fichiers pour
              savoir où vous en êtes.
            </p>
            <p className="mt-3 text-base text-ink-soft">
              Une question sur votre mois écoulé ? Demandez-le directement à RH Pilot, qui
              analyse vos vraies données et vous répond en quelques secondes.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <Card className="bg-white/85 shadow-lg backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-brand-violet/5 p-3 text-center">
                  <Users size={16} className="mx-auto text-brand-violet" />
                  <p className="mt-1.5 text-lg font-semibold text-ink">12</p>
                  <p className="text-[11px] text-ink-faint">Salariés</p>
                </div>
                <div className="rounded-lg bg-accent-teal/5 p-3 text-center">
                  <ClipboardCheck size={16} className="mx-auto text-accent-teal" />
                  <p className="mt-1.5 text-lg font-semibold text-ink">8</p>
                  <p className="text-[11px] text-ink-faint">Parcours</p>
                </div>
                <div className="rounded-lg bg-accent-amber/5 p-3 text-center">
                  <CalendarDays size={16} className="mx-auto text-accent-amber" />
                  <p className="mt-1.5 text-lg font-semibold text-ink">15</p>
                  <p className="text-[11px] text-ink-faint">Échéances</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-brand-violet/5 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-violet">
                  <Sparkles size={13} /> Résumer mon mois
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink">
                  8 parcours ont avancé ce mois-ci et 3 échéances ont été traitées. Une
                  vigilance reste nécessaire sur la semaine du 18, plus chargée que les
                  autres.
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* 02 — ANTICIPER */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <Card className="bg-white/85 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Priorités du jour</p>
              <ul className="mt-3 flex flex-col gap-3">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-rose" />
                  <div>
                    <p className="text-sm font-medium text-ink">Période d&apos;essai — Mathis</p>
                    <p className="text-xs text-ink-faint">Se termine dans 4 jours</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-amber" />
                  <div>
                    <p className="text-sm font-medium text-ink">Visite médicale — Léa</p>
                    <p className="text-xs text-ink-faint">À programmer cette semaine</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-teal" />
                  <div>
                    <p className="text-sm font-medium text-ink">Tous les autres parcours</p>
                    <p className="text-xs text-ink-faint">Sont à jour</p>
                  </div>
                </li>
              </ul>
              <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-surface-subtle px-3 py-2 text-xs text-ink-faint">
                <Bell size={13} /> Un rappel a été envoyé automatiquement
              </div>
            </Card>
          </Reveal>

          <Reveal delay={120} className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">02 — Anticiper</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Ne laissez plus une échéance vous surprendre
            </h2>
            <p className="mt-3 text-base text-ink-soft">
              RH Pilot distingue ce qui est urgent de ce qui peut attendre, et vous dit
              pourquoi — jamais une simple liste de dates sans hiérarchie.
            </p>
            <p className="mt-3 text-base text-ink-soft">
              Des rappels peuvent partir automatiquement, à la personne assignée ou à son
              manager, selon le délai que vous choisissez vous-même.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 03 — AUTOMATISER */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">03 — Automatiser</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Des parcours qui suivent votre organisation, pas l&apos;inverse
            </h2>
            <p className="mt-3 text-base text-ink-soft">
              Chaque entreprise travaille différemment. RH Pilot part de parcours prêts à
              l&apos;emploi, mais chaque étape peut être adaptée, renommée ou retirée selon
              votre propre façon de faire.
            </p>
            <p className="mt-3 text-base text-ink-soft">
              RH Pilot n&apos;a pas vocation à bouleverser votre organisation — il vient
              simplement la structurer.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/85 backdrop-blur-sm">
                <p className="text-xs font-semibold text-ink-faint">Modèle standard</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {PARCOURS_STANDARD.map((step) => (
                    <li key={step} className="flex items-center gap-2 text-xs text-ink-soft">
                      <CircleDashed size={12} className="shrink-0 text-ink-faint" />
                      {step}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="border-brand-blue/20 bg-brand-blue/[0.02] backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-faint">Votre version</p>
                  <Badge tone="brand">Personnalisé</Badge>
                </div>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {PARCOURS_PERSONNALISE.map((step, i) => (
                    <li key={step} className="flex items-center gap-2 text-xs text-ink-soft">
                      {i === 2 || i === 4 ? (
                        <Sparkles size={12} className="shrink-0 text-brand-blue" />
                      ) : (
                        <CircleDashed size={12} className="shrink-0 text-ink-faint" />
                      )}
                      {step}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 04 — ASSISTER */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <Card className="border-brand-violet/20 bg-gradient-to-br from-brand-violet/[0.04] to-brand-blue/[0.04] shadow-lg backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Sparkles size={14} className="text-brand-violet" /> Assistant RH Pilot
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-brand-blue px-3.5 py-2 text-xs text-white">
                    Qui risque un souci dans les 2 prochaines semaines ?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-xs text-ink shadow-sm">
                    J&apos;observe que la période d&apos;essai de Mathis se termine dans 4
                    jours, et qu&apos;aucun parcours de fin de période d&apos;essai
                    n&apos;a encore été déclenché pour lui.
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={120} className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">04 — Assister</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Un copilote directement dans votre espace
            </h2>
            <p className="mt-3 text-base text-ink-soft">
              Posez une question en langage naturel, obtenez une réponse fondée uniquement
              sur vos vraies données — jamais un fait inventé.
            </p>
            <p className="mt-3 text-base text-ink-soft">
              RH Pilot ne décide jamais à votre place : il observe, explique, et vous laisse
              choisir la suite.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Objections / clôture */}
      <section className="relative mx-auto max-w-3xl px-6 py-16 text-center">
        <Reveal>
          <h2 className="text-2xl font-semibold text-ink">RH Pilot s&apos;adapte à votre façon de travailler</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-soft">
            Vous avez déjà vos outils ? Vous externalisez votre paie ? Vous gérez encore une
            partie de vos RH sur Excel ? RH Pilot n&apos;a pas vocation à tout remplacer — il
            vient structurer ce qui mérite de l&apos;être, et vous aide à anticiper ce qui
            mérite votre attention.
          </p>
          <div className="mt-8">
            <Link href="/sign-up">
              <Button className="px-6 py-3 text-base">
                <span className="inline-flex items-center gap-2">
                  Découvrir RH Pilot gratuitement <ArrowRight size={16} />
                </span>
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
