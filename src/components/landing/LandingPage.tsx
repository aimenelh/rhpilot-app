import { LandingMotion } from "./LandingMotion";
import { HeroReveal } from "./HeroReveal";
import { BrandIntro } from "./BrandIntro";
import Link from "next/link";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import s from "./MarketingV2.module.css";
import { ProductStory } from "./ProductStory";
import { CopilotCards } from "./CopilotCards";
import { FounderChapter } from "./FounderChapter";
import { ClosingCta } from "./ClosingCta";

export function LandingPage() {
  return (
    <div className={s.site} data-landing-motion>
      <LandingMotion />
      {/* Brand intro intentionally mounted on the public homepage. */}
      <BrandIntro />
      <MarketingHeader />
      <main id="main-content">
        <HeroReveal />
        <CopilotCards />
        <FounderChapter />
        <ProductStory />
        <section className={`${s.section} ${s.case}`}>
          <div className={`${s.wrap} ${s.faqGrid}`}>
            <div>
              <h2 className={s.title}>Questions fréquentes</h2>
              <Link href="/questions" className={s.textLink}>
                Toutes les questions
              </Link>
            </div>
            <div className={s.faq}>
              <details>
                <summary>À qui s’adresse RH Pilot ?</summary>
                <p>
                  Aux petites entreprises et aux personnes qui assurent leur
                  suivi RH : dirigeant, assistant administratif ou professionnel
                  RH.
                </p>
              </details>
              <details>
                <summary>Comment découvrir le logiciel ?</summary>
                <p>
                  La démonstration guidée présente un exemple de suivi, sans
                  création de compte. Vous créez ensuite votre espace avec le
                  SIRET de votre entreprise : il est gratuit jusqu’à 3 salariés.
                </p>
                <Link href="/services#demo" className={s.textLink}>
                  Ouvrir la démonstration
                </Link>
              </details>
              <details>
                <summary>Mes salariés ont-ils accès à leurs bulletins ?</summary>
                <p>
                  Oui : chaque salarié a son espace, sur téléphone ou
                  ordinateur, avec ses bulletins, ses congés, ses demandes
                  d’absence et ses documents. Il est inclus, sans coût par
                  compte.
                </p>
                <Link href="/espace-salarie" className={s.textLink}>
                  Découvrir l’espace salarié
                </Link>
              </details>
              <details>
                <summary>Que comprend l’offre gratuite ?</summary>
                <p>
                  Les fonctionnalités et les limites de chaque offre sont
                  détaillées sur la page Tarifs, pour choisir selon les besoins
                  de votre équipe.
                </p>
                <Link href="/tarifs" className={s.textLink}>
                  Comparer les offres
                </Link>
              </details>
              <details>
                <summary>Où trouver les informations sur mes données ?</summary>
                <p>
                  Les pages Sécurité et Confidentialité présentent les
                  informations sur la protection et le traitement de vos
                  données.
                </p>
                <Link href="/securite" className={s.textLink}>
                  Consulter la page Sécurité
                </Link>
              </details>
            </div>
          </div>
        </section>
        <ClosingCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
