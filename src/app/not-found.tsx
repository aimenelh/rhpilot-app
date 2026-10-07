import Link from "next/link";
import { MarketingPage, PageIntro } from "@/components/landing/MarketingPage";
import { CopilotScene } from "@/components/landing/CopilotScene";
import s from "@/components/landing/MarketingV2.module.css";

export default function NotFound() {
  return (
    <MarketingPage>
      <PageIntro
        title="Page introuvable"
        intro="L’adresse demandée n’existe pas ou a changé. Vous pouvez revenir à l’accueil ou découvrir le logiciel."
        scene={<CopilotScene figure="perdu" />}
      >
        <div className={s.actions}>
          <Link href="/" className={s.primary}>
            Retour à l’accueil
          </Link>
          <Link href="/services" className={s.secondary}>
            Découvrir RH Pilot
          </Link>
        </div>
      </PageIntro>
    </MarketingPage>
  );
}
