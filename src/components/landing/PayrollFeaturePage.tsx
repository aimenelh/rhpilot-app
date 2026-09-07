import Link from "next/link";
import { ArrowRight, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";
import { Button } from "@/components/ui/Button";

export type PayrollFeature = {
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  imageAlt: string;
  imagePosition?: "left" | "right";
  visualKicker: string;
  visualTitle: string;
  visualText: string;
  points: { title: string; text: string }[];
  workflowTitle: string;
  workflow: { label: string; text: string }[];
  detailsTitle: string;
  details: string[];
  sources: { name: string; detail: string; href: string }[];
  note: string;
};

function SourceList({ feature, compact = false }: { feature: PayrollFeature; compact?: boolean }) {
  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
      {feature.sources.map((source, index) => (
        <a
          key={source.name}
          href={source.href}
          target="_blank"
          rel="noreferrer"
          className="group flex items-start gap-4 border-t border-surface-border pt-4 transition-colors hover:border-brand-primary/50"
        >
          <span className="mt-0.5 text-xs font-semibold tabular-nums text-brand-primary">0{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-semibold text-ink">
              {source.name}
              <ExternalLink size={13} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-1 block text-sm leading-6 text-ink-soft">{source.detail}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function SourceStrip({ feature }: { feature: PayrollFeature }) {
  return (
    <section className="border-y border-surface-border bg-[#14151A] text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E8432E]">Références de paie</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Références utilisées pour le traitement</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">Le calcul social de RH Pilot repose sur le modèle Publicodes de Mon-entreprise. Les autres références correspondent aux sources officielles utilisées pour le cadre juridique, réglementaire et administratif du traitement.</p>
          </div>
          <ShieldCheck size={28} className="shrink-0 text-white/80" />
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {feature.sources.map((source) => (
            <a key={source.name} href={source.href} target="_blank" rel="noreferrer" className="group border border-white/10 px-4 py-4 transition-colors hover:border-white/30 hover:bg-white/[0.03]">
              <span className="text-sm font-semibold text-white">{source.name}</span>
              <span className="mt-2 block text-xs leading-5 text-white/55">{source.detail}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PayrollFeaturePage({ feature }: { feature: PayrollFeature }) {
  const production = feature.eyebrow === "Production de la paie";
  const variables = feature.eyebrow === "Variables de paie";
  const absences = feature.eyebrow === "Congés & absences";

  if (production) {
    return (
      <div className="min-h-screen bg-white">
        <AmbientNetwork />
        <MarketingHeader />
        <main>
          <section className="relative min-h-[680px] overflow-hidden border-b border-surface-border bg-[#14151A]">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg, rgba(20,21,26,.97) 0%, rgba(20,21,26,.84) 42%, rgba(20,21,26,.18) 75%, rgba(20,21,26,.08) 100%), url(${feature.image})` }} aria-hidden />
            <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-end px-6 pb-16 pt-28 sm:pb-20 lg:items-center lg:pt-24">
              <Reveal variant="left">
                <div className="max-w-2xl text-white">
                  <p className="text-sm font-semibold text-[#E8432E]">Production de la paie</p>
                  <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-[5.2rem]">{feature.title}</h1>
                  <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">{feature.intro}</p>
                  <div className="mt-9 flex flex-wrap items-center gap-4">
                    <Link href="/sign-up"><Button className="bg-[#E8432E] hover:bg-[#d83e2b]">Essayer RH Pilot <ArrowRight size={16} /></Button></Link>
                    <Link href="/gestion-paie" className="text-sm font-medium text-white/75 hover:text-white">Voir les autres traitements</Link>
                  </div>
                </div>
              </Reveal>
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[#14151A]/75 backdrop-blur-sm">
              <div className="mx-auto grid max-w-7xl divide-y divide-white/10 px-6 md:grid-cols-4 md:divide-x md:divide-y-0">
                {feature.points.map((point, index) => (
                  <div key={point.title} className="px-0 py-5 md:px-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">0{index + 1}</p>
                    <p className="mt-1 font-semibold text-white">{point.title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/60">{point.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
              <Reveal variant="left">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.visualKicker}</p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl">{feature.visualTitle}</h2>
              </Reveal>
              <Reveal variant="right">
                <p className="max-w-2xl text-lg leading-8 text-ink-soft">{feature.visualText}</p>
                <div className="mt-10 border-t border-surface-border pt-8">
                  <p className="text-sm font-semibold text-ink">Éléments conservés avec le calcul</p>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    {feature.details.map((detail) => <div key={detail} className="flex gap-3 text-sm leading-6 text-ink-soft"><Check size={17} className="mt-0.5 shrink-0 text-brand-primary" />{detail}</div>)}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <section className="border-y border-surface-border bg-surface-subtle">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
              <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Le cycle</p>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-4xl">{feature.workflowTitle}</h2>
                </div>
                <div className="border-t border-surface-border">
                  {feature.workflow.map((step, index) => (
                    <div key={step.label} className="grid gap-3 border-b border-surface-border py-6 sm:grid-cols-[56px_160px_1fr]">
                      <span className="text-sm font-semibold text-brand-primary">0{index + 1}</span>
                      <p className="font-semibold text-ink">{step.label}</p>
                      <p className="text-sm leading-6 text-ink-soft">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <SourceStrip feature={feature} />
        </main>
        <MarketingFooter />
      </div>
    );
  }

  if (variables) {
    return (
      <div className="min-h-screen bg-white">
        <AmbientNetwork />
        <MarketingHeader />
        <main>
          <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pb-24 sm:pt-20">
            <div className="max-w-4xl">
              <Reveal variant="left">
                <p className="text-sm font-semibold text-brand-primary">Variables de paie</p>
                <h1 className="mt-5 text-5xl font-semibold leading-[1] tracking-tight text-ink sm:text-6xl">{feature.title}</h1>
                <p className="mt-7 max-w-2xl text-xl leading-8 text-ink-soft">{feature.intro}</p>
              </Reveal>
            </div>
            <Reveal variant="scale" delay={100}>
              <div className="mt-14 grid overflow-hidden border border-surface-border bg-surface-subtle lg:grid-cols-[1.05fr_.95fr]">
                <div className="min-h-[420px] bg-cover bg-center" style={{ backgroundImage: `url(${feature.image})` }} role="img" aria-label={feature.imageAlt} />
                <div className="flex flex-col justify-end p-8 sm:p-10 lg:p-12">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.visualKicker}</p>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight text-ink">{feature.visualTitle}</h2>
                  <p className="mt-5 text-base leading-7 text-ink-soft">{feature.visualText}</p>
                </div>
              </div>
            </Reveal>
          </section>

          <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
            <div className="grid gap-0 border-y border-surface-border md:grid-cols-3">
              {feature.points.map((point, index) => (
                <Reveal key={point.title} delay={index * 60}>
                  <article className="border-b border-surface-border px-1 py-8 last:border-b-0 md:border-b-0 md:px-8 md:py-10 md:[&+article]:border-l md:[&+article]:pl-8">
                    <span className="text-xs font-semibold text-brand-primary">0{index + 1}</span>
                    <h3 className="mt-5 text-xl font-semibold text-ink">{point.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-soft">{point.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="border-y border-surface-border">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
              <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.workflowTitle}</p>
                  <p className="mt-5 max-w-md text-base leading-7 text-ink-soft">Les variables sont rattachées à un salarié et à une période avant leur prise en compte dans le calcul de la paie.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {feature.workflow.map((step, index) => (
                    <div key={step.label} className="border border-surface-border p-5">
                      <span className="text-xs font-semibold text-brand-primary">0{index + 1}</span>
                      <p className="mt-4 font-semibold text-ink">{step.label}</p>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.detailsTitle}</p>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">Données et calcul</h2>
              <div className="mt-10 max-w-3xl space-y-5 border-l-2 border-brand-primary/20 pl-6">
                {feature.details.map((detail) => <p key={detail} className="text-sm leading-7 text-ink-soft">{detail}</p>)}
              </div>
            </Reveal>
          </section>

          <section className="border-t border-surface-border bg-surface-subtle">
            <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
              <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Références</p><h2 className="mt-3 text-2xl font-semibold text-ink">Les sources utilisées</h2></div>
                <SourceList feature={feature} compact />
              </div>
            </div>
          </section>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AmbientNetwork />
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div className="grid items-end gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal variant="left">
              <p className="text-sm font-semibold text-brand-primary">{absences ? "Congés & absences" : "Arrêts de travail"}</p>
              <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-tight text-ink sm:text-6xl">{feature.title}</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-ink-soft">{feature.intro}</p>
              <div className="mt-9 flex items-center gap-4"><Link href="/sign-up"><Button>Découvrir RH Pilot <ArrowRight size={16} /></Button></Link></div>
            </Reveal>
            <Reveal variant="right">
              <div className="aspect-[5/4] overflow-hidden bg-surface-subtle bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg, rgba(20,21,26,0) 45%, rgba(20,21,26,.34) 100%), url(${feature.image})` }} role="img" aria-label={feature.imageAlt} />
            </Reveal>
          </div>
        </section>

        <section className="border-y border-surface-border bg-[#f7f8fa]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid gap-14 lg:grid-cols-[0.55fr_1.45fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.visualKicker}</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight text-ink">{feature.visualTitle}</h2>
              </div>
              <div>
                <p className="max-w-3xl text-lg leading-8 text-ink-soft">{feature.visualText}</p>
                <div className="mt-10 grid gap-8 sm:grid-cols-3">
                  {feature.points.map((point, index) => <div key={point.title} className="border-t-2 border-ink pt-5"><span className="text-xs font-semibold text-brand-primary">0{index + 1}</span><h3 className="mt-3 font-semibold text-ink">{point.title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{point.text}</p></div>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.workflowTitle}</p>
              <h2 className="mt-4 text-3xl font-semibold text-ink">Traitement de l’événement</h2>
              <p className="mt-5 max-w-md text-base leading-7 text-ink-soft">{feature.note}</p>
            </div>
            <div className="border-t border-surface-border">
              {feature.workflow.map((step, index) => <div key={step.label} className="grid gap-4 border-b border-surface-border py-6 sm:grid-cols-[40px_150px_1fr]"><span className="text-sm font-semibold text-brand-primary">0{index + 1}</span><p className="font-semibold text-ink">{step.label}</p><p className="text-sm leading-6 text-ink-soft">{step.text}</p></div>)}
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.detailsTitle}</p>
              <h2 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">Références utilisées pour le traitement</h2>
            </div>
            <div className="mt-10"><SourceList feature={feature} /></div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}