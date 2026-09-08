import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, FileText, HeartPulse, History, Landmark, Scale, UserRound } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { PAYROLL_CAPABILITIES, type PayrollCapability } from "./payrollCapabilities";

const iconByKey = {
  agreement: Scale,
  health: HeartPulse,
  contributions: Landmark,
  netSocial: FileCheck2,
  payslip: FileText,
  traceability: History,
  profile: UserRound,
  employer: Building2,
} as const;

function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="font-semibold text-ink">
            {part}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function Sources({ feature }: { feature: PayrollCapability }) {
  if (!feature.sources) return null;
  return (
    <section className="border-t border-surface-border bg-surface-subtle">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-primary">Références</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Sources utilisées</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {feature.sources.map((source) => (
              <a
                key={source.name}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="border-t border-surface-border pt-4 hover:border-brand-primary/50"
              >
                <p className="font-semibold text-ink">{source.name}</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{source.detail}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MomentRow({ moment, index }: { moment: PayrollCapability["moments"][number]; index: number }) {
  const isReversed = index % 2 === 1;
  return (
    <div className={`mx-auto max-w-6xl px-6 py-12 sm:py-14 ${index > 0 ? "border-t border-surface-border" : ""}`}>
      <div className={`grid gap-5 lg:gap-10 ${isReversed ? "lg:grid-cols-[1.45fr_.55fr]" : "lg:grid-cols-[.55fr_1.45fr]"}`}>
        {isReversed ? (
          <>
            <p className="max-w-2xl text-lg leading-8 text-ink-soft">
              <RichText text={moment.body} />
            </p>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink lg:text-right lg:text-3xl">
              {moment.heading}
            </h2>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink lg:text-3xl">
              {moment.heading}
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-ink-soft">
              <RichText text={moment.body} />
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CapabilityLayout({ feature }: { feature: PayrollCapability }) {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-14 sm:pb-20 sm:pt-20">
        <Reveal variant="left">
          <p className="text-sm font-semibold text-brand-primary">{feature.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.98] tracking-tight text-ink sm:text-6xl">
            {feature.title}
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-ink-soft">{feature.intro}</p>
        </Reveal>
      </section>

      <section className="border-y border-surface-border">
        {feature.moments.map((moment, index) => (
          <MomentRow key={moment.heading} moment={moment} index={index} />
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="border-l-2 border-brand-primary/20 pl-6">
          <p className="max-w-3xl text-lg leading-8 text-ink-soft">{feature.summary}</p>
        </div>
      </section>
    </>
  );
}

export function PayrollCapabilityPage({ feature }: { feature: PayrollCapability }) {
  const Icon = iconByKey[feature.variant];
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <div className="mx-auto max-w-6xl px-6 pb-0 pt-4 sm:pt-6">
          <Link href="/gestion-paie" className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-ink">
            <ArrowRight size={14} className="rotate-180" /> Gestion de la paie
          </Link>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-ink-faint">
            <Icon size={14} /> {feature.eyebrow}
          </div>
        </div>
        <CapabilityLayout feature={feature} />
        <Sources feature={feature} />
        <section className="border-t border-surface-border">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-primary">Gestion de la paie</p>
                <p className="mt-2 text-xl font-semibold text-ink">Voir les autres traitements de paie.</p>
              </div>
              <Link
                href="/gestion-paie"
                className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand-primary"
              >
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
