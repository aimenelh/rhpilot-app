import Link from "next/link";
import { UserRoundX, Send, Clock, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AttentionPreview } from "@/components/landing/AttentionPreview";
import { MessyPreview } from "@/components/landing/MessyPreview";

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
    description: "Visible de tous — jamais devinée, jamais attribuée au hasard.",
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

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-surface-subtle">
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
          connaître les procédures — c&apos;est de garder une vision claire de tout ce qui
          est en cours.
        </p>
      </section>

      {/* Bloc 2 — Le problème, en peu de mots */}
      <section className="border-y border-surface-border bg-white py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Le problème</h2>
            <p className="mt-3 text-ink-soft">
              Dans beaucoup de PME, les équipes RH sont compétentes et impliquées. Pourtant,
              les mêmes situations reviennent, sprint après sprint, dossier après dossier.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {QUOTES.map((quote) => (
              <div
                key={quote}
                className="rounded-xl rounded-tl-none border border-surface-border bg-surface-subtle px-4 py-3 text-sm text-ink-soft"
              >
                {quote}
              </div>
            ))}
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-2xl px-6 text-center text-lg font-medium text-ink">
          Les oublis ne sont pas la cause. Ils sont la conséquence d&apos;un manque de
          structuration.
        </p>
      </section>

      {/* Bloc 3 — Avant / Après */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-ink">
          Avant RH Pilot, après RH Pilot
        </h2>
        <div className="mt-10 grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex justify-center">
            <MessyPreview />
          </div>
          <ArrowRight
            size={28}
            className="mx-auto rotate-90 text-ink-faint md:rotate-0"
            aria-hidden
          />
          <div className="flex justify-center">
            <AttentionPreview />
          </div>
        </div>
      </section>

      {/* Bloc 4 — Notre philosophie */}
      <section className="border-y border-surface-border bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold text-ink">Notre philosophie</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">
            RH Pilot préfère montrer un problème plutôt que de le cacher. Ce n&apos;est pas un
            slogan — c&apos;est comment le logiciel est construit, à chaque décision.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PHILOSOPHY.map((item) => (
              <Card key={item.title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                  <item.icon size={18} />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bloc 5 — Pas un SIRH, en colonnes */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-ink">
          RH Pilot n&apos;est pas un SIRH de plus
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
        <p className="mx-auto mt-6 max-w-xl text-center text-sm text-ink-soft">
          RH Pilot ne remplace aucun de vos outils existants. Il rend visible ce qui, sinon,
          resterait dans la tête de quelqu&apos;un.
        </p>
      </section>

      {/* Bloc 6 — L'émotion, en peu de mots */}
      <section className="bg-ink py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-lg leading-relaxed text-white">
            Une visite médicale oubliée. Une période d&apos;essai dépassée. Une DPAE envoyée
            trop tard. Ce ne sont jamais de simples tâches — ce sont des situations qui créent
            du stress et de l&apos;incertitude, pour l&apos;équipe RH comme pour le salarié.
          </p>
          <p className="mt-4 text-lg font-medium text-white">
            RH Pilot existe pour que ça ne dépende jamais uniquement de la mémoire de
            quelqu&apos;un.
          </p>
        </div>
      </section>

      {/* Bloc 7 — Observatoire RH Pilot : ce que le terrain nous montre,
          sans jamais citer ni nommer personne (accord non obtenu). */}
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-blue">
          Observatoire RH Pilot
        </p>
        <h2 className="mt-2 text-center text-2xl font-semibold text-ink">
          Ce que le terrain nous montre
        </h2>
        <p className="mt-4 text-center text-sm leading-relaxed text-ink-soft">
          Avant même son lancement, RH Pilot a été confronté à une question simple, posée
          directement à des professionnels RH : quelle est la tâche ou l&apos;échéance que
          vous avez le plus peur d&apos;oublier ? Les réponses n&apos;ont jamais parlé de
          logiciel manquant — elles parlaient d&apos;oublis, d&apos;échéances, de rappels, de
          responsabilités. C&apos;est directement ce qui a guidé le positionnement de RH
          Pilot : ne pas remplacer les outils RH existants, mais aider à anticiper les
          échéances et rendre les responsabilités visibles.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-accent-teal">
              Déjà disponible
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
              <li>Parcours Embauche</li>
              <li>Parcours Fin de période d&apos;essai</li>
              <li>Parcours Visite médicale</li>
              <li>Détecteurs d&apos;anomalies proactifs</li>
              <li>Assistant RH Pilot</li>
              <li>Notifications automatiques</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Les besoins qui reviennent le plus souvent
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
              <li>Échéances liées à la paie</li>
              <li>Suivi documentaire (CNI, titres de séjour...)</li>
              <li>Suivi post-recrutement et fidélisation</li>
              <li>Entretiens obligatoires</li>
              <li>Formations et leur renouvellement</li>
            </ul>
          </div>
        </div>

        <p className="mt-8 text-center text-base font-medium text-ink">
          Nous ne construisons pas les fonctionnalités qui nous paraissent intéressantes.
          Nous construisons celles qui reviennent le plus souvent chez les professionnels RH.
        </p>
      </section>

      {/* Bloc 8 — D'où vient RH Pilot */}
      <section className="border-t border-surface-border bg-white py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-semibold text-ink">D&apos;où vient RH Pilot</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            RH Pilot est né d&apos;un constat partagé. Des observations de terrain, un travail
            de recherche approfondi et de nombreux échanges avec des professionnels RH ont
            progressivement fait émerger la même idée : les équipes RH n&apos;ont pas besoin
            qu&apos;on leur explique leur métier. Elles ont besoin d&apos;un outil qui leur
            permette de l&apos;exercer avec davantage de visibilité, de sérénité et de
            continuité.
          </p>
        </div>
      </section>

      {/* Bloc 9 — CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-base font-medium text-ink">
            Exactement le problème que vous rencontrez au quotidien ?
          </p>
          <Link href="/sign-up" className="mt-5 inline-block">
            <Button className="px-6 py-3 text-base">Essayer gratuitement</Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
