import { MarketingPage, PageIntro } from "./MarketingPage";
export function LegalDocument({ title, version, children }: { title: string; version: string; children: React.ReactNode }) {
  return (
    <MarketingPage>
      <PageIntro title={title} intro={`Version du ${version}`} />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <div className="space-y-8 text-base leading-relaxed text-ink-soft [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_a]:underline [&_p]:mt-3">{children}</div>
      </article>
    </MarketingPage>
  );
}
