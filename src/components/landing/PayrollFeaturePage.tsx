import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal variant={imageRight ? "left" : "right"}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.eyebrow}</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">{feature.title}</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{feature.intro}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/sign-up">
                  <Button className="px-5 py-3"><span className="inline-flex items-center gap-2">Essayer RH Pilot <ArrowRight size={16} /></span></Button>
                </Link>
                <Link href="/gestion-paie" className="inline-flex items-center text-sm font-medium text-ink-soft hover:text-ink">Voir la gestion de la paie</Link>
              </div>
            </Reveal>
            <Reveal variant={imageRight ? "right" : "left"} delay={100}>
              <div className="relative overflow-hidden rounded-[2rem] border border-surface-border bg-white p-3 shadow-[0_24px_70px_-38px_rgba(20,21,26,0.45)]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-surface-subtle">
                  <Image src={feature.image} alt={feature.imageAlt} fill className="object-contain p-8 sm:p-12" priority />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-ink-faint"><ShieldCheck size={14} /><span>Une donnée visible, contrôlable et traçable dans le cycle de paie.</span></div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-surface-border bg-white/75 py-16 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <p className="text-sm font-semibold text-ink">Ce que RH Pilot traite</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">Une gestion qui reste lisible, même quand le dossier devient complexe.</h2>
            </Reveal>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {feature.points.map((point, index) => (
                <Reveal key={point.title} delay={index * 80}>
                  <article className="border-t border-surface-border pt-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary"><Check size={13} /></span>{point.title}</div>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">{point.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Le traitement</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">{feature.workflowTitle}</h2>
          </Reveal>
          <div className="mt-12 divide-y divide-surface-border border-y border-surface-border">
            {feature.workflow.map((step, index) => (
              <Reveal key={step.label} delay={index * 60}>
                <div className="grid gap-4 px-1 py-7 sm:grid-cols-[64px_170px_1fr] sm:items-center">
                  <span className="text-sm font-semibold text-brand-primary">0{index + 1}</span>
                  <p className="font-semibold text-ink">{step.label}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="bg-surface-subtle py-20">
          <div className="mx-auto grid max-w-5xl gap-12 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <Reveal variant="left">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Fiabilité du traitement</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">Des règles suivies dans le temps.</h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">{feature.note}</p>
            </Reveal>
            <Reveal variant="right">
              <div className="rounded-2xl border border-surface-border bg-white p-7">
                <p className="text-sm font-semibold text-ink">Sur cette partie, RH Pilot s&apos;appuie sur</p>
                <div className="mt-5 flex flex-col gap-4">
                  {feature.details.map((detail) => <div key={detail} className="flex items-start gap-3 text-sm text-ink-soft"><Check size={16} className="mt-0.5 shrink-0 text-brand-primary" /><span>{detail}</span></div>)}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Reveal variant="scale">
            <p className="text-sm font-semibold text-ink">La paie reste un processus de contrôle.</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">RH Pilot vous aide à préparer et comprendre la paie, sans masquer ce qui la compose.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">Le moteur calcule à partir de règles versionnées. Le rôle de l&apos;interface est ensuite de vous permettre de vérifier, comprendre et valider le résultat.</p>
            <Link href="/sign-up" className="mt-8 inline-block"><Button className="px-6 py-3">Découvrir RH Pilot</Button></Link>
          </Reveal>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
