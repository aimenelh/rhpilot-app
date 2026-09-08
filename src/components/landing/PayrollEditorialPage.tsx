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
  image?: string;
  imageAlt?: string;
  imagePosition?: "left" | "right";
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
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => (
        <a
          key={source.name}
          href={source.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand-primary hover:text-ink"
        >
          {source.name}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function VisualScene({ keyName, title, text }: { keyName: string; title: string; text: string }) {
  const photo = PHOTO_BY_KEY[keyName] ?? PHOTO_BY_KEY.production;
  const mascot = MASCOT_BY_KEY[keyName] ?? MASCOT_BY_KEY.production;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-surface-border bg-surface-subtle shadow-elevated">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-white/72" aria-hidden="true" />
      <div className="relative min-h-[470px] p-6 sm:p-8">
        <div className="max-w-sm rounded-2xl border border-white/90 bg-white/95 p-5 shadow-card backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">RH Pilot</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
        </div>
        <div className="absolute bottom-4 right-4 h-36 w-36 sm:h-44 sm:w-44">
          <Image src={mascot} alt="Mascotte RH Pilot" fill className="object-contain drop-shadow-[0_18px_28px_rgba(20,21,26,0.14)]" sizes="176px" />
        </div>
        <div className="absolute bottom-6 left-6 h-20 w-20 rounded-full border border-white/70 bg-white/75" aria-hidden="true" />
        <AmbientNetwork className="absolute bottom-0 right-0 h-44 w-56 opacity-25" />
      </div>
    </div>
  );
}

function PayrollHero({ feature }: { feature: PayrollEditorialFeature }) {
  const keyName = getVisualKey(feature.eyebrow);

  return (
    <section className="relative overflow-hidden border-b border-surface-border bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-8 sm:py-18 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-14 lg:px-10 lg:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary">{feature.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">{feature.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">{feature.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/contact">
                Découvrir RH Pilot
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <span className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-subtle px-3 text-sm font-medium text-ink-soft">
              <ShieldCheck className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              Données et règles traçables
            </span>
          </div>
          <div className="mt-9 flex flex-wrap gap-2">
            {feature.sources.slice(0, 4).map((source) => (
              <TrustMark key={source.name} name={source.name} />
            ))}
          </div>
        </div>
        <VisualScene keyName={keyName} title={feature.visualTitle} text={feature.visualText} />
      </div>
    </section>
  );
}

function PointsSection({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-primary">Ce qu’il faut maîtriser</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Une paie lisible avant d’être automatisée.</h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {feature.points.map((point) => (
          <Reveal key={point.title} className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <Check className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">{point.title}</h3>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{point.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <section className="border-y border-surface-border bg-surface-subtle">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-primary">Processus</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{feature.workflowTitle}</h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {feature.workflow.map((step, index) => (
            <div key={step.label} className="rounded-2xl border border-surface-border bg-white p-6">
              <p className="text-sm font-semibold text-brand-primary">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 text-lg font-semibold text-ink">{step.label}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailsBlock({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-primary">Références</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{feature.detailsTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-ink-soft">{feature.note}</p>
        </div>
        <div className="space-y-3">
          {feature.details.map((detail) => (
            <div key={detail} className="flex gap-3 rounded-xl border border-surface-border bg-white p-4">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              <p className="text-sm leading-6 text-ink-soft">{richText(detail)}</p>
            </div>
          ))}
          <div className="pt-2">
            <SourcesStrip sources={feature.sources} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilityMoments({ capability }: { capability: PayrollEditorialCapability }) {
  const keyName = getVisualKey(capability.eyebrow, capability.variant);
  const photo = PHOTO_BY_KEY[keyName] ?? PHOTO_BY_KEY.production;
  const mascot = MASCOT_BY_KEY[keyName] ?? MASCOT_BY_KEY.production;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-[28px] border border-surface-border bg-surface-subtle shadow-elevated">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} aria-hidden="true" />
            <div className="absolute inset-0 bg-white/78" aria-hidden="true" />
            <div className="relative min-h-[420px] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">RH Pilot</p>
              <h2 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight text-ink">{capability.summary}</h2>
              <div className="absolute bottom-4 right-4 h-40 w-40 sm:h-48 sm:w-48">
                <Image src={mascot} alt="Mascotte RH Pilot" fill className="object-contain drop-shadow-[0_18px_28px_rgba(20,21,26,0.14)]" sizes="192px" />
              </div>
              <AmbientNetwork className="absolute bottom-0 left-0 h-40 w-52 opacity-20" />
            </div>
          </div>
          <div className="mt-5">
            <SourcesStrip sources={capability.sources} />
          </div>
        </div>
        <div className="space-y-5">
          {capability.moments.map((moment) => (
            <Reveal key={moment.heading} className="rounded-2xl border border-surface-border bg-white p-6 shadow-card sm:p-7">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-primary" />
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">{moment.heading}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-ink-soft">{richText(moment.body)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PayrollFeatureEditorial({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main>
        <PayrollHero feature={feature} />
        <PointsSection feature={feature} />
        <WorkflowSection feature={feature} />
        <DetailsBlock feature={feature} />
      </main>
      <MarketingFooter />
    </div>
  );
}

export function PayrollCapabilityEditorial({ capability }: { capability: PayrollEditorialCapability }) {
  const keyName = getVisualKey(capability.eyebrow, capability.variant);

  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main>
        <section className="border-b border-surface-border bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-18 lg:px-10 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary">{capability.eyebrow}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">{capability.title}</h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">{capability.intro}</p>
              </div>
              <div className="hidden lg:block">
                <div className="relative mx-auto h-64 w-64">
                  <Image src={MASCOT_BY_KEY[keyName] ?? MASCOT_BY_KEY.production} alt="Mascotte RH Pilot" fill className="object-contain" sizes="256px" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <CapabilityMoments capability={capability} />
        <section className="border-t border-surface-border bg-surface-subtle">
          <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-5 rounded-2xl border border-surface-border bg-white p-7 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-ink">Une logique de paie documentée, du paramétrage au résultat.</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">Retrouvez les références utilisées et les éléments qui permettent de contrôler le traitement.</p>
              </div>
              <Button asChild>
                <Link href="/contact">
                  Parler à l’équipe
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
