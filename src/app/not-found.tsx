import Link from "next/link";
import { MarketingPage, PageIntro } from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";

export default function NotFound() {
  return (
    <MarketingPage>
      <PageIntro
        title="Cette page a été oubliée."
        intro="Contrairement à vos échéances RH, celle-ci ne reviendra pas toute seule vous le rappeler. La page que vous cherchez n’existe pas, ou a changé d’adresse."
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
