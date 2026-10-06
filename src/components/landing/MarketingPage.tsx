import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import { MascotScene } from "./MascotScene";
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
  eyebrow,
  title,
  intro,
  mascot,
  children,
}: {
  /** Conservé pour compatibilité : le surtitre n’est plus affiché. */
  eyebrow?: string;
  title: string;
  intro: string;
  mascot?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`${p.intro} ${s.band}`}>
      <BandThread />
      <div className={`${s.wrap} ${mascot ? p.introGrid : ""}`}>
        <div>
          <h1 className={p.h1}>{title}</h1>
          <p className={p.introLead}>{intro}</p>
          {children}
        </div>
        {mascot && (
          <MascotScene
            src={mascot}
            alt="La mascotte RH Pilot accompagne le suivi de votre équipe"
            priority
          />
        )}
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
  return <ClosingCta title={title} accent="" text={text} href={href} action={action ?? "Créer mon espace"} />;
}
