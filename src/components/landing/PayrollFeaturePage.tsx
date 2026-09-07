import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, ShieldCheck } from "lucide-react";
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
  note: string;
};

export function PayrollFeaturePage({ feature }: { feature: PayrollFeature }) {
  const imageRight = feature.imagePosition !== "left";

  return (
    <div className="min-h-screen bg-white">
      <AmbientNetwork />
      <MarketingHeader />
      <main>
        <section className="relative overflow-hidden border-b border-surface-border">
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pb-24 sm:pt-24">
            <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
              <Reveal variant={imageRight ? "left" : "right"}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.eyebrow}</p>
                <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[4.15rem]">
                  {feature.title}
                </h1>
                <p className="mt-7 max-w-xl text-lg leading-8 text-ink-soft">{feature.intro}</p>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link href="/sign-up">
                    <Button className="px-5 py-3">
                      <span className="inline-flex items-center gap-2">Essayer RH Pilot <ArrowRight size={16} /></span>
                    </Button>
                  </Link>
                  <Link href="/gestion-paie" className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink">
                    Gestion de la paie <ChevronRight size={15} />
                  </Link>
                </div>
              </Reveal>

              <Reveal variant={imageRight ? "right" : "left"} delay={120}>
                <div className="relative">
                  <div className="absolute -inset-8 rounded-[3rem] bg-brand-primary/[0.045] blur-2xl" aria-hidden />
                  <div className="relative overflow-hidden rounded-[2.2rem] border border-surface-border bg-surface-subtle p-2 shadow-[0_30px_90px_-48px_rgba(20,21,26,0.5)]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.7rem] bg-white">
                      <Image src={feature.image} alt={feature.imageAlt} fill className="object-contain p-7 sm:p-10" priority />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/85 to-transparent" />
                    </div>
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <p className="text-xs font-medium text-ink-faint">RH Pilot · {feature.visualKicker}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint"><ShieldCheck size={13} /> Données contrôlables</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Ce que cela change</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-4xl">{feature.visualTitle}</h2>
              <p className="mt-5 text-base leading-7 text-ink-soft">{feature.visualText}</p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-0 border-y border-surface-border md:grid-cols-3 md:divide-x md:divide-surface-border">
            {feature.points.map((point, index) => (
              <Reveal key={point.title} delay={index * 80}>
                <article className="px-1 py-8 md:px-8 md:py-9">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold tabular-nums text-brand-primary">0{index + 1}</span>
                    <span className="h-px flex-1 bg-surface-border" />
                  </div>
                  <h3 className="mt-7 text-lg font-semibold text-ink">{point.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-soft">{point.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-y border-surface-border bg-surface-subtle">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-start lg:gap-20">
              <Reveal variant="left">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Le traitement</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-4xl">{feature.workflowTitle}</h2>
                <p className="mt-5 max-w-md text-sm leading-6 text-ink-soft">Chaque étape reste identifiable. On sait ce qui a été préparé, calculé, revu et validé.</p>
              </Reveal>

              <div className="rounded-[1.8rem] border border-surface-border bg-white px-6 py-2 shadow-[0_24px_70px_-48px_rgba(20,21,26,0.45)] sm:px-8">
                {feature.workflow.map((step, index) => (
                  <Reveal key={step.label} delay={index * 60}>
                    <div className="grid gap-3 border-b border-surface-border py-6 last:border-0 sm:grid-cols-[44px_150px_1fr] sm:items-start sm:gap-5">
                      <span className="text-xs font-semibold tabular-nums text-brand-primary">0{index + 1}</span>
                      <p className="font-semibold text-ink">{step.label}</p>
                      <p className="text-sm leading-6 text-ink-soft">{step.text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:gap-20">
            <Reveal variant="left">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.detailsTitle}</p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">Des règles suivies dans le temps.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">{feature.note}</p>
            </Reveal>

            <Reveal variant="right">
              <div className="rounded-[1.8rem] border border-surface-border bg-white p-7 shadow-[0_22px_60px_-46px_rgba(20,21,26,0.5)] sm:p-8">
                <p className="text-sm font-semibold text-ink">Dans ce traitement, RH Pilot conserve notamment</p>
                <div className="mt-6 flex flex-col gap-5">
                  {feature.details.map((detail) => (
                    <div key={detail} className="flex items-start gap-3 text-sm leading-6 text-ink-soft">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary"><Check size={12} /></span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24 pt-4 text-center">
          <Reveal variant="scale">
            <div className="rounded-[2rem] border border-brand-primary/15 bg-brand-primary/[0.035] px-7 py-12 sm:px-12">
              <p className="text-sm font-semibold text-ink">La paie reste un processus de contrôle.</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">Comprendre ce qui entre dans la paie compte autant que le résultat.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-ink-soft">Le moteur calcule à partir des règles disponibles. RH Pilot vous permet ensuite de vérifier les données, le traitement et le résultat avant validation.</p>
              <Link href="/sign-up" className="mt-8 inline-block"><Button className="px-6 py-3">Découvrir RH Pilot</Button></Link>
            </div>
          </Reveal>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
