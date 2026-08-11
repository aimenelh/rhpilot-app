import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

export function ArticleLayout({
  category,
  title,
  readTime,
  children,
}: {
  category: string;
  title: string;
  readTime: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      <article className="mx-auto max-w-2xl px-6 py-16">
        <Reveal>
          <Link
            href="/ressources"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"
          >
            <ArrowLeft size={14} /> Toutes les ressources
          </Link>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex items-center gap-3">
            <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
              {category}
            </span>
            <span className="flex items-center gap-1 text-xs text-ink-faint">
              <Clock size={12} /> {readTime}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
        </Reveal>

        <Reveal delay={150}>
          <div className="mt-10 rounded-2xl border border-surface-border bg-white/80 p-8 backdrop-blur-sm sm:p-10">
            {children}
          </div>
        </Reveal>
      </article>

      <MarketingFooter />
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-9 text-xl font-semibold text-ink first:mt-0">{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-base leading-relaxed text-ink-soft">{children}</p>;
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-base leading-relaxed text-ink-soft">
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
          {item}
        </li>
      ))}
    </ul>
  );
}
