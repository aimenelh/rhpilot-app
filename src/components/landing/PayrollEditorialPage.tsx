import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
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
  production: "/illustrations/mascot/search.png",
  variables: "/illustrations/mascot/search.png",
  absences: "/illustrations/mascot/reminder.png",
  arrets: "/illustrations/mascot/urgent.png",
  agreement: "/illustrations/mascot/search.png",
  health: "/illustrations/mascot/medical.png",
  contributions: "/illustrations/mascot/dashboard.png",
  netSocial: "/illustrations/mascot/calm.png",
  payslip: "/illustrations/mascot/missing-document.png",
  traceability: "/illustrations/mascot/search.png",
  profile: "/illustrations/mascot/dashboard.png",
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

const ACCENT_PHRASES: Record<string, string> = {
  production: "ce qui doit être contrôlé",
  variables: "la bonne période",
  absences: "la période concernée",
  arrets: "en paie",
  agreement: "dossier de paie",
  health: "contexte de paie",
  contributions: "séparément",
  netSocial: "montant net social",
  payslip: "période verrouillée",
  traceability: "produit",
  profile: "structurent le calcul",
  employer: "contexte de l’entreprise",
};

function richText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={`${part}-${index}`} className="font-semibold text-brand-primary">
        {part}
      </strong>
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
  if (normalized.includes("conges") || normalized.includes("absences")) return "absences";
  if (normalized.includes("arrets")) return "arrets";
  if (normalized.includes("agreement") || normalized.includes("referentiel")) return "agreement";
  if (normalized.includes("health") || normalized.includes("complementaire")) return "health";
  if (normalized.includes("contributions") || normalized.includes("cotisations")) return "contributions";
  if (normalized.includes("netsocial") || normalized.includes("net-social") || normalized.includes("montant-net-social")) return "netSocial";
  if (normalized.includes("payslip") || normalized.includes("bulletin")) return "payslip";
  if (normalized.includes("traceability") || normalized.includes("tracabilite")) return "traceability";
  if (normalized.includes("profile") || normalized.includes("profil")) return "profile";
  if (normalized.includes("employer") || normalized.includes("employeur")) return "employer";
  return "production";
}

function AccentTitle({ title, phrase }: { title: string; phrase: string }) {
  if (!phrase || !title.includes(phrase)) return <>{title}</>;
  const [before, after] = title.split(phrase);
  return (
    <>
      {before}
      <span className="text-brand-primary">{phrase}</span>
      {after}
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

function HumanEditorialScene({ keyName, image, alt, kicker, title, text }: {
  keyName: string;
  image: string;
  alt: string;
  kicker: string;
  title: string;
  text: string;
}) {
  const mascot = MASCOT_BY_KEY[keyName] ?? MASCOT_BY_KEY.production;

  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-2xl border border-surface-border bg-surface-subtle">
      <div className="absolute inset-0 bg-[#F7F8FA]" aria-hidden="true" />
      <div className="absolute left-[7%] top-[8%] h-[70%] w-[82%] -rotate-2 rounded-[2.25rem] bg-[#FCE7E3]" aria-hidden="true" />
      <div className="absolute inset-y-[9%] left-[7%] w-[82%] overflow-hidden rounded-[2rem] border border-white bg-white shadow-card">
        <img src={image} alt={alt} className="h-full w-full object-cover" loading="eager" />
      </div>
      <div className="absolute right-[5%] top-[8%] w-[54%] rounded-xl border border-surface-border bg-white p-4 shadow-card sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary">{kicker}</p>
        <p className="mt-2 text-base font-semibold leading-6 tracking-tight text-ink">{title}</p>
        <p className="mt-2 text-xs leading-5 text-ink-soft">{text}</p>
      </div>
      <div className="absolute bottom-[5%] right-[5%] h-44 w-44 sm:h-52 sm:w-52">
        <Image src={mascot} alt="Mascotte RH Pilot" fill className="object-contain" sizes="208px" />
      </div>
      <div className="absolute bottom-[9%] left-[8%] flex h-10 w-10 items-center justify-center rounded-lg border border-brand-primary/20 bg-white text-brand-primary shadow-card" aria-hidden="true">
        <FileText className="h-5 w-5" />
      </div>
      <div className="absolute left-[4%] top-[11%] h-2 w-2 rounded-full bg-brand-primary" aria-hidden="true" />
    </div>
  );
}

function PayrollHero({ feature }: { feature: PayrollEditorialFeature }) {
  const keyName = getVisualKey(feature.eyebrow);
  const image = feature.image ?? PHOTO_BY_KEY[keyName] ?? PHOTO_BY_KEY.production;
  const accent = ACCENT_PHRASES[keyName] ?? "";

  return (
    <section className="border-b border-surface-border bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14 lg:px-10 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{feature.eyebrow}</p>
          <h1 className="mt-4 font-[var(--font-dm-sans)] text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[3.8rem]">
            <AccentTitle title={feature.title} phrase={accent} />
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">{feature.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/contact">
                Découvrir RH Pilot
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <div className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-soft">
              <ShieldCheck className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              Règles et données traçables
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {feature.sources.slice(0, 3).map((source) => (
              <span key={source.name} className="rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink">
                {source.name}
              </span>
            ))}
          </div>
        </div>
        <HumanEditorialScene
          keyName={keyName}
          image={image}
          alt={feature.imageAlt ?? "Situation professionnelle liée à la paie"}
          kicker={feature.visualKicker}
          title={feature.visualTitle}
          text={feature.visualText}
        />
      </div>
    </section>
  );
}

function PointsSection({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{feature.workflowTitle}</p>
        <h2 className="mt-2 font-[var(--font-dm-sans)] text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Les points à contrôler</h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {feature.points.map((point) => (
          <div key={point.title} className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <Check className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-[var(--font-dm-sans)] text-base font-semibold text-ink">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{point.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <section className="border-y border-surface-border bg-surface-subtle">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Séquence</p>
          <h2 className="mt-2 font-[var(--font-dm-sans)] text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{feature.workflowTitle}</h2>
        </div>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-surface-border bg-surface-border md:grid-cols-4">
          {feature.workflow.map((step, index) => (
            <div key={step.label} className="bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Étape {index + 1}</p>
              <h3 className="mt-3 font-[var(--font-dm-sans)] text-base font-semibold text-ink">{step.label}</h3>
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
    <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Références</p>
          <h2 className="mt-2 font-[var(--font-dm-sans)] text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{feature.detailsTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-ink-soft">{feature.note}</p>
        </div>
        <div>
          <div className="space-y-2">
            {feature.details.map((detail) => (
              <div key={detail} className="flex gap-3 rounded-xl border border-surface-border bg-white p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                <p className="text-sm leading-6 text-ink-soft">{richText(detail)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <SourcesStrip sources={feature.sources} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilityHero({ capability }: { capability: PayrollEditorialCapability }) {
  const keyName = getVisualKey(capability.eyebrow, capability.variant);
  const image = PHOTO_BY_KEY[keyName] ?? PHOTO_BY_KEY.production;
  const accent = ACCENT_PHRASES[keyName] ?? "";

  return (
    <section className="border-b border-surface-border bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14 lg:px-10 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">{capability.eyebrow}</p>
          <h1 className="mt-4 font-[var(--font-dm-sans)] text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[3.8rem]">
            <AccentTitle title={capability.title} phrase={accent} />
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">{capability.intro}</p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-soft">
            <ShieldCheck className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            Références et règles visibles
          </div>
        </div>
        <HumanEditorialScene
          keyName={keyName}
          image={image}
          alt={`Situation professionnelle liée à ${capability.eyebrow}`}
          kicker={capability.eyebrow}
          title={capability.summary}
          text="Les informations utiles restent rattachées au contexte du calcul."
        />
      </div>
    </section>
  );
}

function CapabilityMoments({ capability }: { capability: PayrollEditorialCapability }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Ce que RH Pilot conserve</p>
        <h2 className="mt-2 font-[var(--font-dm-sans)] text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Une lecture concrète du sujet</h2>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {capability.moments.map((moment) => (
          <div key={moment.heading} className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
            <div className="h-1 w-10 rounded-full bg-brand-primary" aria-hidden="true" />
            <h3 className="mt-4 font-[var(--font-dm-sans)] text-base font-semibold text-ink">{moment.heading}</h3>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{richText(moment.body)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CapabilitySources({ capability }: { capability: PayrollEditorialCapability }) {
  return (
    <section className="border-t border-surface-border bg-surface-subtle">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-6 rounded-xl border border-surface-border bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Références</p>
            <p className="mt-2 text-base font-semibold text-ink">Les règles restent rattachées à des sources identifiables.</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">Les sources utilisées pour le traitement sont accessibles depuis cette page.</p>
          </div>
          <Button asChild>
            <Link href="/contact">
              Échanger avec l’équipe
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="mt-5">
          <SourcesStrip sources={capability.sources} />
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
  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main>
        <CapabilityHero capability={capability} />
        <CapabilityMoments capability={capability} />
        <CapabilitySources capability={capability} />
      </main>
      <MarketingFooter />
    </div>
  );
}
