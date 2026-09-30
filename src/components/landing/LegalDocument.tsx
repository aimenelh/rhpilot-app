import { MarketingPage } from "./MarketingPage";
export function LegalDocument({ title, version, children }: { title: string; version: string; children: React.ReactNode }) {
 return <MarketingPage><article className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-3xl font-semibold text-ink">{title}</h1><p className="mt-3 text-sm text-ink-soft">Version du {version}</p><div className="mt-10 space-y-8 text-base leading-relaxed text-ink-soft [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_a]:underline [&_p]:mt-3">{children}</div></article></MarketingPage>;
}
