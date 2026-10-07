import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import { BandThread } from "./BandThread";
import { ClosingCta } from "./ClosingCta";
import s from "./MarketingV2.module.css";
import p from "./InnerPages.module.css";

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.site}>
      <MarketingHeader />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </div>
  );
}
export function PageIntro({
  title,
  intro,
  scene,
  children,
}: {
  title: string;
  intro?: string;
  /** Illustration à droite du titre (un copilote, voir CopilotScene). */
  scene?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className={`${p.intro} ${s.band}`} data-scene={scene ? "true" : undefined}>
      <BandThread />
      <div className={`${s.wrap} ${scene ? p.introGrid : ""}`}>
        <div className={p.introCopy}>
          <h1 className={p.h1}>{title}</h1>
          {intro ? <p className={p.introLead}>{intro}</p> : null}
          {children}
        </div>
        {scene}
      </div>
    </section>
  );
}
/** Appel de fin de page : le même aplat corail que la page d'accueil. */
export function MarketingCTA({
  title,
  text,
  href,
  action,
}: {
  title?: string;
  text?: string;
  href?: string;
  action?: string;
}) {
  if (!title) return <ClosingCta text={text} href={href} action={action} />;
  return <ClosingCta title={title} text={text} href={href} action={action} />;
}
