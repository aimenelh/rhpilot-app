import Link from "next/link";
import {
  UserRoundX,
  Send,
  Clock,
  Info,
  ArrowRight,
  ArrowDown,
  Stethoscope,
  UserPlus,
  CircleDollarSign,
  FileText,
  GraduationCap,
  HeartHandshake,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AttentionPreview } from "@/components/landing/AttentionPreview";
import { MessyPreview } from "@/components/landing/MessyPreview";
import { Reveal } from "@/components/landing/Reveal";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";

const QUOTES = [
  "« Je pensais que c'était toi. »",
  "« Cette échéance est passée. »",
  "« Qui devait s'en occuper ? »",
  "« Personne ne m'avait prévenu. »",
];

const PHILOSOPHY = [
  {
    icon: UserRoundX,
    title: "Une tâche sans responsable clair reste « À assigner »",
    description: "Visible de tous, jamais devinée, jamais attribuée au hasard.",
  },
  {
    icon: Send,
    title: "Un email qui échoue s'affiche comme un échec réel",
    description: "Jamais comme un faux succès qui masquerait le problème.",
  },
  {
    icon: Clock,
    title: "Une échéance incertaine reste une suggestion à vérifier",
    description: "Jamais un délai légal inventé que RH Pilot ne peut pas garantir.",
  },
  {
    icon: Info,
    title: "Une information manquante est signalée",
    description: "Pas masquée derrière un silence qui donnerait une fausse impression d'ordre.",
  },
];

// Le lien terrain → fonctionnalité, en formulations courtes plutôt
// qu'en citations — aucune de ces phrases n'est présentée comme dite
// mot pour mot par quelqu'un (accord non obtenu pour publier de
// vraies citations, même anonymisées). Le fond reste fidèle aux
// retours réels ; la forme reste honnête sur ce qu'elle est.
const NEEDS_TO_FEATURES = [
  {
    icon: Stethoscope,
    need: "Ne pas oublier une visite médicale",
    feature: "Parcours Visite médicale",
  },
  {
    icon: UserRoundX,
    need: "Savoir qui doit s'occuper de quoi",
    feature: "Responsabilités visibles (« À assigner »)",
  },
  {
    icon: Send,
    need: "Être relancé avant l'oubli",
    feature: "Notifications automatiques",
  },
  {
    icon: Clock,
    need: "Suivre les périodes d'essai en cours",
    feature: "Parcours Fin de période d'essai",
  },
  {
    icon: UserPlus,
    need: "Bien accompagner une nouvelle recrue",
    feature: "Parcours Embauche",
  },
];

const UPCOMING_NEEDS = [
  {
    icon: CircleDollarSign,
    label: "Échéances liées à la paie",
    quote: "« La gestion de la paie est ce que j'ai le plus peur d'oublier. »",
  },
  { icon: FileText, label: "Suivi documentaire (CNI, titres de séjour...)" },
  { icon: HeartHandshake, label: "Suivi post-recrutement et fidélisation" },
  { icon: ClipboardList, label: "Entretiens obligatoires" },
  { icon: GraduationCap, label: "Formations et leur renouvellement" },
];

export default function WhyPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      {/* Bloc 1 — Titre */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
          La mémoire ne devrait{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">jamais</span> être
          le principal outil d&apos;une équipe RH.
        </h1>
        <p className="mt-5 text-lg text-ink-soft">
          Les équipes RH doivent aujourd&apos;hui gérer toujours plus d&apos;obligations,
          d&apos;interlocuteurs et de dossiers en parallèle. La difficulté n&apos;est plus de
          connaître les procédures, c&apos;est de garder une vision claire de tout ce qui
          est en cours.
        </p>
      </section>

      {/* Bloc 2 — Le problème, en peu de mots */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-2xl font-semibold text-ink">Le problème</h2>
              <p className="mt-3 text-ink-soft">
                Dans beaucoup de PME, les équipes RH sont compétentes et impliquées. Pourtant,
                les mêmes situations reviennent, sprint après sprint, dossier après dossier.
              </p>
            </div>
          </Reveal>
          <div className="flex flex-col gap-3">
            {QUOTES.map((quote, index) => (
              <Reveal key={quote} delay={index * 100}>
                <div className="rounded-xl rounded-tl-none border border-surface-border bg-surface-subtle px-4 py-3 text-sm text-ink-soft">
                  {quote}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal>
          <p className="mx-auto mt-10 max-w-2xl px-6 text-center text-lg font-medium text-ink">
            Les oublis ne sont pas la cause. Ils sont la conséquence d&apos;un manque de
            structuration.
          </p>
        </Reveal>
      </section>

      {/* Bloc 3 — Avant / Après */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold text-ink">
            Avant RH Pilot, après RH Pilot
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
          <Reveal>
            <div className="flex justify-center">
              <MessyPreview />
            </div>
          </Reveal>
          <ArrowRight
            size={28}
            className="mx-auto rotate-90 text-ink-faint md:rotate-0"
            aria-hidden
          />
          <Reveal delay={150}>
            <div className="flex justify-center">
              <AttentionPreview />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Bloc 4 — Notre philosophie */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ink">Notre philosophie</h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-soft">
                RH Pilot préfère montrer un problème plutôt que de le cacher. Ce n&apos;est pas
                un slogan, c&apos;est comment le logiciel est construit, à chaque décision.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PHILOSOPHY.map((item, index) => (
              <Reveal key={item.title} delay={(index % 2) * 120}>
                <Card>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <item.icon size={18} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bloc 5 — Pas un SIRH, en colonnes */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold text-ink">
            RH Pilot n&apos;est pas un SIRH de plus
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Reveal>
            <Card className="bg-surface-subtle">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Un SIRH
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
                <li>Stocke</li>
                <li>Archive</li>
                <li>Centralise</li>
              </ul>
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card className="border-brand-blue/20 bg-brand-blue/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                RH Pilot
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
                <li>Organise</li>
                <li>Anticipe</li>
                <li>Coordonne</li>
              </ul>
            </Card>
          </Reveal>
        </div>
        <Reveal>
          <p className="mx-auto mt-6 max-w-xl text-center text-sm text-ink-soft">
            RH Pilot ne remplace aucun de vos outils existants. Il rend visible ce qui, sinon,
            resterait dans la tête de quelqu&apos;un.
          </p>
        </Reveal>
      </section>

      {/* Bloc 6 — L'émotion, en peu de mots */}
      <section className="bg-ink py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl px-6 text-center">
            <p className="text-lg leading-relaxed text-white">
              Une visite médicale oubliée. Une période d&apos;essai dépassée. Une DPAE envoyée
              trop tard. Ce ne sont jamais de simples tâches, ce sont des situations qui
              créent du stress et de l&apos;incertitude, pour l&apos;équipe RH comme pour le
              salarié.
            </p>
            <p className="mt-4 text-lg font-medium text-white">
              RH Pilot existe pour que ça ne dépende jamais uniquement de la mémoire de
              quelqu&apos;un.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Bloc 7 — Observatoire RH Pilot */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal>
          <div className="text-center">
            <span className="inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
              Observatoire RH Pilot
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Ce que le terrain nous montre</h2>
          </div>
        </Reveal>

        <Reveal>
          <div className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed text-ink-soft">
            <p>
              Avant même son lancement, RH Pilot a posé une question simple à plusieurs
              professionnels RH :
            </p>
            <p className="mt-2 font-medium text-ink">
              « En tant que professionnel RH, quelle est la tâche ou l&apos;échéance que
              vous avez le plus peur d&apos;oublier dans votre quotidien ? »
            </p>
            <p className="mt-3">
              Les réponses n&apos;ont jamais parlé d&apos;un logiciel manquant. Elles parlaient
              d&apos;oublis, de rappels, d&apos;échéances, de responsabilités. C&apos;est
              exactement ce qui a guidé la conception de RH Pilot.
            </p>
          </div>
        </Reveal>

        {/* Schéma terrain → produit, dans un fond léger pour qu'il respire */}
        <Reveal>
          <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-brand-blue/10 bg-brand-blue/[0.03] px-8 py-8 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Reveal>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="text-sm font-medium text-ink">Professionnels RH</span>
                  <span className="text-xs text-ink-faint">interrogés sur le terrain</span>
                </div>
              </Reveal>
              <ArrowDown size={18} className="text-ink-faint" aria-hidden />
              <Reveal delay={150}>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="text-sm font-medium text-ink">Besoins remontés</span>
                  <span className="text-xs text-ink-faint">oublis, rappels, responsabilités</span>
                </div>
              </Reveal>
              <ArrowDown size={18} className="text-ink-faint" aria-hidden />
              <Reveal delay={300}>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="text-sm font-semibold text-brand-blue">RH Pilot</span>
                  <span className="text-xs text-ink-faint">
                    transforme ces besoins en fonctionnalités
                  </span>
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>

        {/* Tableau besoin → fonctionnalité, sans citation attribuée */}
        <div className="mt-10 flex flex-col gap-2">
          {NEEDS_TO_FEATURES.map((item, index) => (
            <Reveal key={item.need} delay={index * 100}>
              <div className="flex flex-col items-center gap-3 rounded-xl border border-surface-border bg-white/85 p-4 backdrop-blur-sm sm:flex-row">
                <div className="flex flex-1 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ink-faint">
                    <item.icon size={16} />
                  </span>
                  <span className="text-sm text-ink-soft">{item.need}</span>
                </div>
                <div className="hidden shrink-0 items-center sm:flex" aria-hidden>
                  <span className="h-px w-6 bg-brand-blue/30" />
                  <ArrowRight size={18} strokeWidth={2.5} className="text-brand-blue" />
                </div>
                <div className="flex flex-1 items-center gap-2 sm:justify-end">
                  <CheckCircle2 size={16} className="shrink-0 text-accent-teal" aria-hidden />
                  <span className="text-sm font-medium text-ink">{item.feature}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Besoins pas encore construits — distincts visuellement pour
            qu'on ne les confonde jamais avec une fonctionnalité disponible */}
        <Reveal>
          <h3 className="mt-14 text-center text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Les besoins qui reviennent le plus souvent
          </h3>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {UPCOMING_NEEDS.map((item, index) => (
            <Reveal key={item.label} delay={(index % 2) * 100}>
              <Card className="relative border-dashed border-ink-faint/20 bg-surface-subtle">
                <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  Sujet observé
                </span>
                <div className="flex items-center gap-3 pr-16">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-ink-faint">
                    <item.icon size={16} />
                  </span>
                  <span className="text-sm text-ink-soft">{item.label}</span>
                </div>
                {item.quote && (
                  <p className="mt-2.5 border-t border-ink-faint/10 pt-2.5 text-xs italic text-ink-faint">
                    {item.quote}
                    <span className="not-italic"> (professionnelle RH, anonymisé)</span>
                  </p>
                )}
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mx-auto mt-10 max-w-xl text-center">
            <p className="text-base font-medium text-ink">
              Chaque fonctionnalité de RH Pilot commence par un besoin observé sur le terrain.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Nous ne construisons pas ce qui nous semble intéressant. Nous construisons ce
              qui revient le plus souvent chez les professionnels RH.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Bloc 8 — D'où vient RH Pilot */}
      <section className="relative border-t border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <Reveal>
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-2xl font-semibold text-ink">D&apos;où vient RH Pilot</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              RH Pilot est né d&apos;un constat partagé. Des observations de terrain, un
              travail de recherche approfondi et de nombreux échanges avec des professionnels
              RH ont progressivement fait émerger la même idée : les équipes RH n&apos;ont pas
              besoin qu&apos;on leur explique leur métier. Elles ont besoin d&apos;un outil qui
              leur permette de l&apos;exercer avec davantage de visibilité, de sérénité et de
              continuité.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Bloc 9 — CTA */}
      <section className="py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl px-6 text-center">
            <p className="text-base font-medium text-ink">
              Exactement le problème que vous rencontrez au quotidien ?
            </p>
            <Link href="/sign-up" className="mt-5 inline-block">
              <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
