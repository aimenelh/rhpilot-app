import Link from "next/link";
import {
  MarketingPage,
  PageIntro,
  MarketingCTA,
} from "@/components/landing/MarketingPage";
import { BandThread } from "@/components/landing/BandThread";
import p from "@/components/landing/InnerPages.module.css";
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
    <MarketingPage>
      <article>
        <header className={p.intro}>
          <BandThread />
          <div className={p.readingHeader}>
            <Link href="/ressources" className={p.back}>
              ← Toutes les ressources
            </Link>
            <div className={p.readingMeta}>
              <span>{category}</span>
              <span>{readTime}</span>
            </div>
            <h1 className={p.h1}>{title.replace(/ ([:;?!])/g, "\u00a0$1")}</h1>
            <p className={p.byline}>
              Par Aimen El Housseini · Révisé le <time dateTime="2026-09-29">29 septembre 2026</time>
            </p>
          </div>
        </header>
        <div className={p.articleBody}>
          <div>{children}</div>
        </div>
      </article>
    </MarketingPage>
  );
}
export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-9 text-xl font-semibold text-ink first:mt-0">
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-base leading-relaxed text-ink-soft">{children}</p>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-base leading-relaxed text-ink-soft"
        >
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brand-primary" />
          {item}
        </li>
      ))}
    </ul>
  );
}
