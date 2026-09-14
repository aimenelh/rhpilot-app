import Link from "next/link";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import { MascotScene } from "./MascotScene";
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
  eyebrow: string;
  title: string;
  intro: string;
  mascot?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={p.intro}>
      <div className={`${s.wrap} ${mascot ? p.introGrid : ""}`}>
        <div>
          <p className={s.eyebrow}>{eyebrow}</p>
          <h1 className={p.h1}>{title}</h1>
          <p className={s.lead}>{intro}</p>
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
export function MarketingCTA({
  title = "Le prochain pas, à votre rythme.",
  text = "Découvrez le logiciel et préparez votre premier parcours RH.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className={s.cta}>
      <div className={`${s.wrap} ${s.ctaInner}`}>
        <div>
          <h2 className={s.title}>{title}</h2>
          <p>{text}</p>
        </div>
        <Link href="/sign-up" className={s.primary}>
          Essayer gratuitement ↗
        </Link>
      </div>
    </section>
  );
}
