import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

const CONVERSATION = [
  { mine: true, name: "Karim", initials: "K", color: "#E8432E", time: "09:02", text: "Le nouveau arrive aujourd'hui, quelqu'un pour l'accueillir ? 👀" },
  { mine: false, name: "Léa", initials: "L", color: "#B8321F", time: "09:10", text: "Ah non pas moi, j'ai l'entretien d'intégration de Léo à 9h30 😅" },
  { mine: false, name: "Inès", initials: "I", color: "#14B8A6", time: "09:12", text: "Attends je croyais que c'était toi Karim qui gérait les arrivées ?" },
  { mine: true, name: "Karim", initials: "K", color: "#E8432E", time: "09:15", text: "Moi je fais les contrats, pas l'accueil 🙃" },
  { mine: false, name: "Léa", initials: "L", color: "#B8321F", time: "09:41", text: "Bon du coup qui va la chercher à l'accueil ?" },
  { mine: false, name: "Inès", initials: "I", color: "#14B8A6", time: "09:52", text: "Elle arrive à quelle heure déjà 😭" },
  { mine: true, name: "Karim", initials: "K", color: "#E8432E", time: "10:02", text: "...personne ne lui a envoyé le plan d'accès en fait" },
];

const PHILOSOPHY = [
  "« À assigner » reste visible, jamais deviné.",
  "Un échec s'affiche comme un échec.",
  "Une échéance incertaine reste une suggestion.",
  "Une info manquante est signalée, pas cachée.",
];

const NEEDS_TO_FEATURES = [
  { need: "Ne pas oublier une visite médicale", feature: "Parcours Visite médicale" },
  { need: "Savoir qui doit s'occuper de quoi", feature: "Responsabilités visibles" },
  { need: "Être relancé avant l'oubli", feature: "Notifications automatiques" },
  { need: "Suivre les périodes d'essai en cours", feature: "Parcours Fin de période d'essai" },
  { need: "Bien accompagner une nouvelle recrue", feature: "Parcours Embauche" },
];

function SectionMark({ label }: { label: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">{label}</span>
  );
}

export default function WhyPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      {/* Le manifeste — aligné à gauche, pas centré */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <Reveal variant="left">
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            La mémoire ne devrait <span className="text-brand-blue">jamais</span> être le
            principal outil d&apos;une équipe RH.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            RH Pilot existe pour que ça ne dépende plus de la mémoire de quelqu&apos;un.
          </p>
        </Reveal>
      </section>

      {/* 01 — Le problème */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <SectionMark label="Le problème" />
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
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <p className="mt-8 max-w-md text-base font-medium text-ink">
              Pas un manque de rigueur. Un manque de structure.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 02 — Notre philosophie, en liste manifeste, aucune carte */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Reveal>
          <SectionMark label="Notre philosophie" />
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-md text-2xl font-semibold text-ink">
            On préfère montrer un problème que le cacher.
          </h2>
        </Reveal>

        <div className="mt-8 flex flex-col">
          {PHILOSOPHY.map((line, index) => (
            <Reveal key={line} variant="left" delay={140 + index * 90}>
              <div className="flex items-start gap-4 border-t border-surface-border py-4 first:border-t-0">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                <p className="text-base text-ink-soft">{line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 03 — Pas un SIRH, en confrontation typographique */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <SectionMark label="Ce que RH Pilot n'est pas" />
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 max-w-md text-2xl font-semibold text-ink">
              RH Pilot n&apos;est pas un SIRH de plus.
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
            <Reveal variant="left" delay={150}>
              <div>
                <p className="text-3xl font-bold text-ink-faint/40 line-through decoration-2">Un SIRH</p>
                <ul className="mt-4 flex flex-col gap-1.5 text-sm text-ink-faint">
                  <li>Stocke</li>
                  <li>Archive</li>
                  <li>Centralise</li>
                </ul>
              </div>
            </Reveal>
            <Reveal variant="right" delay={200}>
              <div>
                <p className="text-3xl font-bold text-brand-blue">RH Pilot</p>
                <ul className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-ink">
                  <li>Organise</li>
                  <li>Anticipe</li>
                  <li>Coordonne</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* La pause sombre — une seule phrase, déjà distincte */}
      <section className="bg-ink py-16">
        <Reveal variant="scale">
          <p className="mx-auto max-w-lg px-6 text-center text-xl font-medium leading-relaxed text-white">
            Une visite médicale oubliée. Une période d&apos;essai dépassée. Ce n&apos;est
            jamais un détail.
          </p>
        </Reveal>
      </section>

      {/* Preuve terrain */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Reveal>
          <SectionMark label="Observé sur le terrain" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex-1">
              <h2 className="max-w-md text-2xl font-semibold text-ink">
                Chaque fonctionnalité part d&apos;un besoin réel.
              </h2>
              <p className="mt-2 text-sm text-ink-soft">Pas d&apos;une idée de bureau.</p>
            </div>
            <Image
              src="/illustrations/illu-checklist.png"
              alt=""
              width={369}
              height={388}
              className="hidden h-20 w-auto shrink-0 sm:block"
            />
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col gap-2">
          {NEEDS_TO_FEATURES.map((item, index) => (
            <Reveal key={item.need} variant={index % 2 === 0 ? "left" : "right"} delay={index * 90}>
              <div className="flex flex-col items-center gap-3 rounded-xl border border-surface-border bg-white/85 p-4 backdrop-blur-sm sm:flex-row">
                <div className="flex flex-1 items-center">
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

      {/* CTA */}
      <section className="py-16">
        <Reveal variant="bounce">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <p className="text-base font-medium text-ink">
              Exactement le problème que vous rencontrez au quotidien ?
            </p>
            <Link href="/sign-up" className="mt-5 inline-block">
              <Button className="px-6 py-3 text-base">
                <span className="inline-flex items-center gap-2">
                  Essayer gratuitement <ArrowRight size={16} />
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
