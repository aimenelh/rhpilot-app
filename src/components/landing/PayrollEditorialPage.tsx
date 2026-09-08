import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";
import { Button } from "@/components/ui/Button";

export type PayrollSource = {
  name: string;
  detail: string;
  href: string;
};

export type PayrollEditorialFeature = {
  eyebrow: string;
  title: string;
  intro: string;
  visualKicker: string;
  visualTitle: string;
  visualText: string;
  points: { title: string; text: string }[];
  workflowTitle: string;
  workflow: { label: string; text: string }[];
  detailsTitle: string;
  details: string[];
  sources: PayrollSource[];
  note: string;
};

export type PayrollEditorialCapability = {
  eyebrow: string;
  title: string;
  intro: string;
  summary: string;
  variant: string;
  moments: { heading: string; body: string }[];
  sources?: PayrollSource[];
};

const MASCOT_BY_KEY: Record<string, string> = {
  production: "/illustrations/mascot/dashboard.png",
  variables: "/illustrations/mascot/search.png",
  absences: "/illustrations/mascot/reminder.png",
  arrets: "/illustrations/mascot/medical.png",
  agreement: "/illustrations/mascot/search.png",
  health: "/illustrations/mascot/medical.png",
  contributions: "/illustrations/mascot/dashboard.png",
  netSocial: "/illustrations/mascot/calm.png",
  payslip: "/illustrations/mascot/completed-journey.png",
  traceability: "/illustrations/mascot/search.png",
  profile: "/illustrations/mascot/copilot.png",
  employer: "/illustrations/mascot/create-journey.png",
};

const PHOTO_BY_KEY: Record<string, string> = {
  production: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  variables: "https://images.unsplash.com/photo-1573878586940-330328d3cbeb?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  absences: "https://images.unsplash.com/photo-1530971013997-e06bb52a2372?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  arrets: "https://images.unsplash.com/photo-1758520144417-e1c432042dec?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  agreement: "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  health: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  contributions: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  netSocial: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  payslip: "https://images.unsplash.com/photo-1758873271949-742d6648b6b0?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  traceability: "https://images.unsplash.com/photo-1530971013997-e06bb52a2372?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  profile: "https://images.unsplash.com/photo-1758876021772-2684360dfc97?auto=format&fit=crop&fm=jpg&q=82&w=1600",
  employer: "https://images.unsplash.com/photo-1770048532712-4fde5ef7eb90?auto=format&fit=crop&fm=jpg&q=82&w=1600",
};

function richText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={`${part}-${index}`} className="font-semibold text-ink">{part}</strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function getVisualKey(eyebrow: string, variant?: string) {
  const value = variant ?? eyebrow;
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

  if (normalized.includes("production")) return "production";
  if (normalized.includes("variables")) return "variables";
  if (normalized.includes("conges")) return "absences";
  if (normalized.includes("arrets")) return "arrets";
  if (normalized.includes("agreement")) return "agreement";
  if (normalized.includes("health")) return "health";
  if (normalized.includes("contributions")) return "contributions";
  if (normalized.includes("netsocial") || normalized.includes("net-social")) return "netSocial";
  if (normalized.includes("payslip")) return "payslip";
  if (normalized.includes("traceability")) return "traceability";
  if (normalized.includes("profile")) return "profile";
  if (normalized.includes("employer")) return "employer";
  return "production";
}

function TrustMark({ name }: { name: string }) {
  const short = name
    .replace(" / Mon-entreprise", "")
    .replace("impots.gouv.fr — ", "")
    .replace(".fr", "");

  return (
    <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold tracking-tight text-ink shadow-card">
      {short}
    </span>
  );
}

function SourcesStrip({ sources }: { sources?: PayrollSource[] }) {
  if (!sources?.length) return null;

  return (
    <section className="border-y border-surface-border bg-surface-subtle">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Références officielles</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Des sources identifiées pour chaque traitement.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft">
              RH Pilot distingue le calcul social des références juridiques, réglementaires et administratives utilisées pour documenter le traitement.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {sources.map((source) => (
              <a
                key={source.name}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-surface-border bg-white p-4 transition-colors hover:border-brand-primary/40 hover:bg-[#fffaf8]"
              >
                <TrustMark name={source.name} />
                <p className="mt-4 text-xs leading-5 text-ink-soft">{source.detail}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-primary">
                  Consulter la source <ExternalLink size={12} />
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VisualScene({ featureKey, title }: { featureKey: string; title: string }) {
  const mascot = MASCOT_BY_KEY[featureKey] ?? MASCOT_BY_KEY.production;
  const photo = PHOTO_BY_KEY[featureKey] ?? PHOTO_BY_KEY.production;

  return (
    <div className="relative min-h-[390px] overflow-hidden rounded-[1.75rem] border border-surface-border bg-[#fbf8f6] sm:min-h-[480px] lg:min-h-[560px]">
      <div className="absolute left-[10%] top-[16%] h-[68%] w-[80%] rounded-[42%] bg-[#f5c8be]/45 blur-[1px]" aria-hidden />
      <div className="absolute inset-x-8 bottom-8 top-14 overflow-hidden rounded-[1.5rem] border border-white bg-white shadow-elevated lg:inset-x-12">
        <img src={photo} alt="" className="h-full w-full object-cover saturate-[0.95]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" aria-hidden />
      </div>

      <div className="absolute bottom-0 right-[6%] h-[56%] w-[48%] max-w-[290px] sm:h-[58%] sm:w-[42%] lg:right-[8%] lg:h-[62%] lg:w-[38%]">
        <Image
          src={mascot}
          alt=""
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 35vw, 290px"
          className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(20,21,26,0.16)]"
          priority
        />
      </div>

      <div className="absolute left-5 top-5 rounded-full border border-[#E8432E]/15 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-brand-primary shadow-card sm:left-7 sm:top-7">
        RH Pilot · aux côtés du professionnel
      </div>
      <div className="absolute bottom-5 left-5 max-w-[55%] rounded-xl border border-white/70 bg-white/92 px-4 py-3 shadow-card backdrop-blur-sm sm:bottom-7 sm:left-7">
        <p className="text-xs font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-ink-soft">Le professionnel garde la main sur la validation.</p>
      </div>
    </div>
  );
}

function PayrollHero({
  eyebrow,
  title,
  intro,
  featureKey,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  featureKey: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-surface-border bg-white">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <div className="absolute left-[6%] top-24 h-px w-[26%] rotate-[12deg] bg-brand-primary/15" />
        <div className="absolute right-[9%] top-40 h-px w-[24%] rotate-[-14deg] bg-brand-primary/15" />
        <div className="absolute bottom-20 left-[18%] h-px w-[34%] rotate-[-7deg] bg-brand-primary/10" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:grid-cols-[0.93fr_1.07fr] lg:gap-16 lg:py-20">
        <Reveal variant="left">
          <div className="max-w-2xl">
            <Link href="/gestion-paie" className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-ink">
              <ArrowRight size={14} className="rotate-180" /> Gestion de la paie
            </Link>
            <p className="mt-10 text-sm font-semibold text-brand-primary">{eyebrow}</p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[1.01] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[4.7rem]">
              {title}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink-soft">{intro}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/sign-up">
                <Button>
                  Essayer RH Pilot <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/gestion-paie" className="text-sm font-medium text-ink-soft hover:text-ink">
                Voir les autres sujets paie
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal variant="right" delay={100}>
          <VisualScene featureKey={featureKey} title={eyebrow} />
        </Reveal>
      </div>
    </section>
  );
}

function PointsSection({ points }: { points: { title: string; text: string }[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
      <div className="grid border-y border-surface-border md:grid-cols-3">
        {points.map((point, index) => (
          <Reveal key={point.title} delay={index * 70}>
            <article className="border-b border-surface-border px-0 py-8 last:border-b-0 md:border-b-0 md:px-8 md:py-10 md:[&+article]:border-l">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-primary/20 bg-[#fff8f6] text-brand-primary">
                <Check size={17} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-ink">{point.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{point.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection({ title, workflow }: { title: string; workflow: { label: string; text: string }[] }) {
  return (
    <section className="border-y border-surface-border bg-surface-subtle">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.62fr_1.38fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Le traitement</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-ink sm:text-4xl">{title}</h2>
          </div>
          <div className="border-t border-surface-border">
            {workflow.map((step, index) => (
              <Reveal key={step.label} delay={index * 55}>
                <div className="grid gap-4 border-b border-surface-border py-6 sm:grid-cols-[52px_160px_1fr]">
                  <span className="text-sm font-semibold text-brand-primary">{String(index + 1).padStart(2, "0")}</span>
                  <p className="font-semibold text-ink">{step.label}</p>
                  <p className="text-sm leading-6 text-ink-soft">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilityMoments({ moments }: { moments: { heading: string; body: string }[] }) {
  return (
    <section className="border-y border-surface-border">
      {moments.map((moment, index) => (
        <div key={moment.heading} className={index ? "border-t border-surface-border" : ""}>
          <div className="mx-auto grid max-w-6xl gap-7 px-6 py-14 sm:py-16 lg:grid-cols-[0.68fr_1.32fr] lg:gap-16">
            <Reveal variant={index % 2 === 0 ? "left" : "right"}>
              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">{moment.heading}</h2>
            </Reveal>
            <Reveal variant={index % 2 === 0 ? "right" : "left"}>
              <p className="max-w-2xl text-lg leading-8 text-ink-soft">{richText(moment.body)}</p>
            </Reveal>
          </div>
        </div>
      ))}
    </section>
  );
}

function DetailsBlock({ detailsTitle, details }: { detailsTitle: string; details: string[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{detailsTitle}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">Ce que RH Pilot conserve.</h2>
        </div>
        <div className="grid gap-0 border-y border-surface-border sm:grid-cols-2">
          {details.map((detail, index) => (
            <div key={detail} className="border-b border-surface-border p-6 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0">
              <span className="text-xs font-semibold text-brand-primary">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PayrollFeatureEditorial({ feature }: { feature: PayrollEditorialFeature }) {
  const key = getVisualKey(feature.eyebrow);
  return (
    <div className="min-h-screen bg-white">
      <AmbientNetwork />
      <MarketingHeader />
      <main>
        <PayrollHero eyebrow={feature.eyebrow} title={feature.title} intro={feature.intro} featureKey={key} />
        <PointsSection points={feature.points} />
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-24">
          <Reveal variant="left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.visualKicker}</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">{feature.visualTitle}</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft">{feature.visualText}</p>
              <div className="mt-8 rounded-xl border border-brand-primary/15 bg-[#fff8f6] p-5">
                <p className="text-sm font-semibold text-ink">À retenir</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.note}</p>
              </div>
            </div>
          </Reveal>
          <Reveal variant="right">
            <VisualScene featureKey={key} title={feature.visualKicker} />
          </Reveal>
        </section>
        <WorkflowSection title={feature.workflowTitle} workflow={feature.workflow} />
        <DetailsBlock detailsTitle={feature.detailsTitle} details={feature.details} />
        <SourcesStrip sources={feature.sources} />
        <section className="border-t border-surface-border">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Gestion de la paie</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">Les règles restent explicables et contrôlables.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-soft">RH Pilot présente le résultat, son contexte et les références utilisées avant la validation de la période.</p>
            <div className="mt-8 flex justify-center">
              <Link href="/gestion-paie" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand-primary">Retour aux sujets paie <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function PayrollCapabilityEditorial({ feature }: { feature: PayrollEditorialCapability }) {
  const key = getVisualKey(feature.eyebrow, feature.variant);
  return (
    <div className="min-h-screen bg-white">
      <AmbientNetwork />
      <MarketingHeader />
      <main>
        <PayrollHero eyebrow={feature.eyebrow} title={feature.title} intro={feature.intro} featureKey={key} />
        <section className="mx-auto max-w-6xl px-6 py-14 sm:py-16 lg:py-20">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Le point essentiel</p>
                <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-ink sm:text-4xl">Le professionnel reste au centre du traitement.</h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-ink-soft">{feature.intro}</p>
            </div>
          </Reveal>
        </section>
        <CapabilityMoments moments={feature.moments} />
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <Reveal variant="left">
            <div className="rounded-[1.5rem] border border-surface-border bg-[#fbf8f6] p-4 sm:p-6">
              <VisualScene featureKey={key} title={feature.eyebrow} />
            </div>
          </Reveal>
          <Reveal variant="right">
            <div className="border-l-2 border-brand-primary/20 pl-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">En pratique</p>
              <p className="mt-4 text-xl leading-8 text-ink-soft">{feature.summary}</p>
            </div>
          </Reveal>
        </section>
        <SourcesStrip sources={feature.sources} />
        <section className="border-t border-surface-border">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Gestion de la paie</p>
                <p className="mt-2 text-xl font-semibold text-ink">Consulter les autres traitements.</p>
              </div>
              <Link href="/gestion-paie" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand-primary">
                Retour aux sujets paie <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
