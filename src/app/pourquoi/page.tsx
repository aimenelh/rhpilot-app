import Link from "next/link";
import { UserRoundX, Send, Clock, Info, ArrowRight, Stethoscope, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AttentionPreview } from "@/components/landing/AttentionPreview";
import { MessyPreview } from "@/components/landing/MessyPreview";
import { Reveal } from "@/components/landing/Reveal";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";

const CONVERSATION = [
  { mine: true, name: "Karim", initials: "K", color: "#2E6FF2", time: "09:02", text: "Le nouveau arrive aujourd'hui, quelqu'un pour l'accueillir ? 👀" },
  { mine: false, name: "Léa", initials: "L", color: "#7B5CFA", time: "09:10", text: "Ah non pas moi, j'ai l'entretien d'intégration de Léo à 9h30 😅" },
  { mine: false, name: "Inès", initials: "I", color: "#14C9B0", time: "09:12", text: "Attends je croyais que c'était toi Karim qui gérait les arrivées ?" },
  { mine: true, name: "Karim", initials: "K", color: "#2E6FF2", time: "09:15", text: "Moi je fais les contrats, pas l'accueil 🙃" },
  { mine: false, name: "Léa", initials: "L", color: "#7B5CFA", time: "09:41", text: "Bon du coup qui va la chercher à l'accueil ?" },
  { mine: false, name: "Inès", initials: "I", color: "#14C9B0", time: "09:52", text: "Elle arrive à quelle heure déjà 😭" },
  { mine: true, name: "Karim", initials: "K", color: "#2E6FF2", time: "10:02", text: "...personne ne lui a envoyé le plan d'accès en fait" },
];

const PHILOSOPHY = [
  { icon: UserRoundX, title: "« À assigner » reste visible, jamais deviné." },
  { icon: Send, title: "Un échec s'affiche comme un échec." },
  { icon: Clock, title: "Une échéance incertaine reste une suggestion." },
  { icon: Info, title: "Une info manquante est signalée, pas cachée." },
];

// Le lien terrain → fonctionnalité, en formulations courtes plutôt
// qu'en citations — aucune de ces phrases n'est présentée comme dite
// mot pour mot par quelqu'un (accord non obtenu pour publier de
// vraies citations, même anonymisées). Le fond reste fidèle aux
// retours réels ; la forme reste honnête sur ce qu'elle est.
const NEEDS_TO_FEATURES = [
  { icon: Stethoscope, need: "Ne pas oublier une visite médicale", feature: "Parcours Visite médicale" },
  { icon: UserRoundX, need: "Savoir qui doit s'occuper de quoi", feature: "Responsabilités visibles" },
  { icon: Send, need: "Être relancé avant l'oubli", feature: "Notifications automatiques" },
  { icon: Clock, need: "Suivre les périodes d'essai en cours", feature: "Parcours Fin de période d'essai" },
  { icon: UserPlus, need: "Bien accompagner une nouvelle recrue", feature: "Parcours Embauche" },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
      {children}
    </span>
  );
}

export default function WhyPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      {/* Le manifeste */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <Reveal variant="scale">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            La mémoire ne devrait{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">jamais</span> être
            le principal outil d&apos;une équipe RH.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-5 text-lg text-ink-soft">
            RH Pilot existe pour que ça ne dépende plus de la mémoire de quelqu&apos;un.
          </p>
        </Reveal>
      </section>

      {/* Le problème, en un coup d'œil */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <Reveal variant="scale">
          <div className="text-center">
            <Kicker>Le problème</Kicker>
          </div>
        </Reveal>

        <Reveal variant="scale" delay={100}>
          <div className="mx-auto mt-8 max-w-md overflow-hidden rounded-2xl border border-surface-border bg-white shadow-lg">
            <div className="border-b border-surface-border px-4 py-3 text-center">
              <p className="text-xs font-semibold text-ink">Embauche · Julie Martin</p>
              <p className="text-[10px] text-ink-faint">Karim, Léa, Inès</p>
            </div>
            <div className="flex flex-col p-4">
              {CONVERSATION.map((msg, index) => (
                <Reveal key={`${msg.name}-${msg.time}`} variant={msg.mine ? "right" : "left"} delay={300 + index * 200}>
                  <div className={`flex items-end gap-2 ${msg.mine ? "justify-end" : "justify-start"} ${index > 0 ? "mt-2.5" : ""}`}>
                    {!msg.mine && (
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                        style={{ backgroundColor: msg.color }}
                      >
                        {msg.initials}
                      </span>
                    )}
                    <div className={`flex max-w-[82%] flex-col ${msg.mine ? "items-end" : "items-start"}`}>
                      {!msg.mine && (
                        <span className="mb-0.5 text-[10px] font-medium text-ink-faint">{msg.name}</span>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                          msg.mine ? "rounded-br-sm bg-brand-blue text-white" : "rounded-bl-sm bg-surface-subtle text-ink"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="mt-0.5 text-[9px] text-ink-faint">{msg.time}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 items-center gap-8 px-6 md:grid-cols-[1fr_auto_1fr]">
          <Reveal variant="left">
            <div className="flex justify-center">
              <MessyPreview />
            </div>
          </Reveal>
          <Reveal variant="scale" delay={250}>
            <ArrowRight size={28} className="mx-auto rotate-90 text-brand-blue md:rotate-0" aria-hidden />
          </Reveal>
          <Reveal variant="right" delay={150}>
            <div className="flex justify-center">
              <AttentionPreview />
            </div>
          </Reveal>
        </div>

        <Reveal>
          <p className="mx-auto mt-10 max-w-md px-6 text-center text-base font-medium text-ink">
            Pas un manque de rigueur. Un manque de structure.
          </p>
        </Reveal>
      </section>

      {/* Notre philosophie — 4 principes, sans habillage */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal variant="scale">
          <div className="text-center">
            <Kicker>Notre philosophie</Kicker>
            <h2 className="mt-3 text-2xl font-semibold text-ink">
              On préfère montrer un problème que le cacher.
            </h2>
          </div>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PHILOSOPHY.map((item, index) => (
            <Reveal key={item.title} variant="bounce" delay={(index % 2) * 120 + Math.floor(index / 2) * 100}>
              <Card className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                  <item.icon size={18} />
                </span>
                <p className="text-sm font-medium text-ink">{item.title}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pas un SIRH */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <Reveal variant="scale">
          <h2 className="text-center text-2xl font-semibold text-ink">
            RH Pilot n&apos;est pas un SIRH de plus
          </h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 px-6 sm:grid-cols-2">
          <Reveal variant="left">
            <Card className="bg-surface-subtle">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Un SIRH</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
                <li>Stocke</li>
                <li>Archive</li>
                <li>Centralise</li>
              </ul>
            </Card>
          </Reveal>
          <Reveal variant="right">
            <Card className="border-brand-blue/20 bg-brand-blue/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">RH Pilot</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
                <li>Organise</li>
                <li>Anticipe</li>
                <li>Coordonne</li>
              </ul>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Preuve terrain — condensée à l'essentiel */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Reveal variant="scale">
          <div className="text-center">
            <Kicker>Observé sur le terrain</Kicker>
            <h2 className="mt-3 text-2xl font-semibold text-ink">
              Chaque fonctionnalité part d&apos;un besoin réel.
            </h2>
            <p className="mt-2 text-sm text-ink-soft">Pas d&apos;une idée de bureau.</p>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col gap-2">
          {NEEDS_TO_FEATURES.map((item, index) => (
            <Reveal key={item.need} variant={index % 2 === 0 ? "left" : "right"} delay={index * 90}>
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
      </section>

      {/* La pause sombre — une seule phrase */}
      <section className="bg-ink py-16">
        <Reveal variant="scale">
          <p className="mx-auto max-w-lg px-6 text-center text-xl font-medium leading-relaxed text-white">
            Une visite médicale oubliée. Une période d&apos;essai dépassée. Ce n&apos;est
            jamais un détail.
          </p>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Reveal variant="bounce">
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
