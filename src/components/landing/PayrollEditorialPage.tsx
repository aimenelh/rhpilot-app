import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";

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

const ILLUSTRATIONS: Record<string, string> = {
  production: "/illustrations/payroll/pay_01.svg",
  variables: "/illustrations/payroll/pay_02.svg",
  absences: "/illustrations/payroll/pay_03.svg",
  arrets: "/illustrations/payroll/pay_04.svg",
  payslip: "/illustrations/payroll/pay_05.svg",
  contributions: "/illustrations/payroll/pay_06.svg",
  netSocial: "/illustrations/payroll/pay_07.svg",
  health: "/illustrations/payroll/pay_08.svg",
  profile: "/illustrations/payroll/pay_09.svg",
  agreement: "/illustrations/payroll/pay_10.svg",
  employer: "/illustrations/payroll/pay_11.svg",
  traceability: "/illustrations/payroll/pay_12.svg",
};

const ACCENT_PHRASES: Record<string, string> = {
  production: "ce qui doit être contrôlé",
  variables: "variables de paie",
  absences: "congés et absences",
  arrets: "arrêts de travail",
  payslip: "bulletins de paie",
  contributions: "cotisations sociales",
  netSocial: "montant net social",
  health: "complémentaire santé",
  profile: "chaque salarié",
  agreement: "référentiel conventionnel",
  employer: "contexte employeur",
  traceability: "traçabilité de vos calculs",
};

function getVisualKey(eyebrow: string, variant?: string) {
  const value = `${variant ?? ""} ${eyebrow}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

  if (value.includes("production")) return "production";
  if (value.includes("variables")) return "variables";
  if (value.includes("conges") || value.includes("absences")) return "absences";
  if (value.includes("arrets")) return "arrets";
  if (value.includes("bulletin") || value.includes("payslip")) return "payslip";
  if (value.includes("cotisations") || value.includes("contributions")) return "contributions";
  if (value.includes("net-social") || value.includes("netsocial")) return "netSocial";
  if (value.includes("complementaire") || value.includes("health")) return "health";
  if (value.includes("profil") || value.includes("profile")) return "profile";
  if (value.includes("referentiel") || value.includes("agreement")) return "agreement";
  if (value.includes("employeur") || value.includes("employer")) return "employer";
  if (value.includes("tracabilite") || value.includes("traceability")) return "traceability";
  return "production";
}

function AccentTitle({ title, phrase }: { title: string; phrase: string }) {
  if (!phrase || !title.toLowerCase().includes(phrase.toLowerCase())) return <>{title}</>;
  const index = title.toLowerCase().indexOf(phrase.toLowerCase());
  return (
    <>
      {title.slice(0, index)}
      <span className="text-brand-primary">{title.slice(index, index + phrase.length)}</span>
      {title.slice(index + phrase.length)}
    </>
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-brand-primary/40 hover:text-ink"
        >
          {source.name}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function IllustrationPanel({ keyName }: { keyName: string }) {
  const src = ILLUSTRATIONS[keyName] ?? ILLUSTRATIONS.production;
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-subtle">
      <div className="relative aspect-[3/2] w-full">
        <Image src={src} alt="Illustration RH Pilot" fill priority className="object-contain" sizes="(min-width: 1024px) 52vw, 100vw" />
      </div>
    </div>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/contact"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-dark active:scale-[0.97]"
    >
      {children}
    </Link>
  );
}

function HeroCopy({ eyebrow, title, intro, sources, keyName }: {
  eyebrow: string;
  title: string;
  intro: string;
  sources?: PayrollSource[];
  keyName: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl lg:text-[3.75rem]">
        <AccentTitle title={title} phrase={ACCENT_PHRASES[keyName] ?? ""} />
      </h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">{intro}</p>
      <div className="mt-8">
        <PrimaryButton>
          Découvrir RH Pilot
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
      </div>
      <div className="mt-8">
        <SourcesStrip sources={sources} />
      </div>
    </div>
  );
}

function FeatureHero({ feature }: { feature: PayrollEditorialFeature }) {
  const keyName = getVisualKey(feature.eyebrow);
  return (
    <section className="border-b border-surface-border bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 lg:px-10 lg:py-20">
        <HeroCopy eyebrow={feature.eyebrow} title={feature.title} intro={feature.intro} sources={feature.sources} keyName={keyName} />
        <IllustrationPanel keyName={keyName} />
      </div>
    </section>
  );
}

function CapabilityHero({ capability }: { capability: PayrollEditorialCapability }) {
  const keyName = getVisualKey(capability.eyebrow, capability.variant);
  return (
    <section className="border-b border-surface-border bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 lg:px-10 lg:py-20">
        <HeroCopy eyebrow={capability.eyebrow} title={capability.title} intro={capability.intro} sources={capability.sources} keyName={keyName} />
        <IllustrationPanel keyName={keyName} />
      </div>
    </section>
  );
}

function FeatureContent({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">À prendre en compte</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{feature.workflowTitle}</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {feature.points.map((point) => (
            <Reveal key={point.title} className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
              <Check className="h-5 w-5 text-brand-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-ink">{point.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{point.text}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="border-y border-surface-border bg-surface-subtle">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Du contexte au résultat</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {feature.workflow.map((step) => (
              <div key={step.label} className="rounded-xl border border-surface-border bg-white p-5">
                <div className="h-1 w-8 bg-brand-primary" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-ink">{step.label}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Références</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">{feature.detailsTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-ink-soft">{feature.note}</p>
          </div>
          <div className="space-y-2">
            {feature.details.map((detail) => (
              <div key={detail} className="flex gap-3 rounded-xl border border-surface-border bg-white p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                <p className="text-sm leading-6 text-ink-soft">{detail}</p>
              </div>
            ))}
            <div className="pt-4">
              <SourcesStrip sources={feature.sources} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CapabilityContent({ capability }: { capability: PayrollEditorialCapability }) {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Le fonctionnement</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{capability.summary}</h2>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {capability.moments.map((moment) => (
            <div key={moment.heading} className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
              <div className="h-1 w-10 bg-brand-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-ink">{moment.heading}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{moment.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="border-t border-surface-border bg-surface-subtle">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="flex flex-col gap-6 rounded-xl border border-surface-border bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Références</p>
              <p className="mt-2 text-base font-semibold text-ink">Les règles restent rattachées à des sources identifiables.</p>
            </div>
            <PrimaryButton>
              Échanger avec l’équipe
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </div>
          <div className="mt-5">
            <SourcesStrip sources={capability.sources} />
          </div>
        </div>
      </section>
    </>
  );
}

export function PayrollFeatureEditorial({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main>
        <FeatureHero feature={feature} />
        <FeatureContent feature={feature} />
      </main>
      <MarketingFooter />
    </div>
  );
}

export function PayrollCapabilityEditorial({ capability }: { capability: PayrollEditorialCapability }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main>
        <CapabilityHero capability={capability} />
        <CapabilityContent capability={capability} />
      </main>
      <MarketingFooter />
    </div>
  );
}
