import { LandingMotion } from "./LandingMotion";
import { ArrivalHero } from "./ArrivalHero";
import { BrandIntro } from "./BrandIntro";
import Link from "next/link";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import s from "./MarketingV2.module.css";
import { LiveMonth } from "./LiveMonth";
import { ProductStory } from "./ProductStory";
import { ClosingCta } from "./ClosingCta";
import { TutorialFirstVisitPrompt } from "./TutorialFirstVisitPrompt";

export function LandingPage() {
  return (
    <div className={s.site} data-landing-motion>
      <LandingMotion />
      <BrandIntro />
      <MarketingHeader />
      <main id="main-content">
        <ArrivalHero />
        <LiveMonth />
        <ProductStory />
        <section className={s.payroll}>
          <div className={`${s.wrap} ${s.payrollInner}`}>
            <div>
              <h2>Et la paie ?</h2>
            </div>
            <p>
              Profils salariés, variables et calculs : découvrez le périmètre du
              module paie et son fonctionnement. Son développement et sa
              validation se poursuivent.
            </p>
            <Link href="/gestion-paie" className={s.secondary}>
              Découvrir le module →
            </Link>
          </div>
        </section>
        <section className={s.section}>
          <div className={`${s.wrap} ${s.storyGrid}`}>
            <div>
              <video
                controls
                playsInline
                preload="none"
                poster="/illustrations/illu-cta-final.png"
                className={s.video}
                aria-label="Scène de travail en équipe — vidéo de Pavel Danilyuk"
              >
                <source
                  src="https://www.pexels.com/download/video/8343940/?v=8343940"
                  type="video/mp4"
                />
                Votre navigateur ne permet pas la lecture de cette vidéo.
              </video>
              <p className={s.note}>
                Scène d’illustration · Pavel Danilyuk / Pexels
              </p>
            </div>
            <div>
              <p className={s.eyebrow}>À l’origine de RH Pilot</p>
              <h2 className={s.title}>
                Le terrain comme
                <br />
                point de départ.
              </h2>
              <p className={`${s.copy} mt-6`}>
                Des tableaux dispersés, des documents à retrouver, des échéances
                à garder en tête. RH Pilot est né de ces situations et
                d’échanges avec des professionnels RH sur leur quotidien.
              </p>
              <div className={s.signature}>
                <strong>Aimen El Housseini</strong>Fondateur de RH Pilot ·
                Montpellier
              </div>
              <Link href="/pourquoi" className={s.textLink}>
                Lire l’histoire du projet →
              </Link>
            </div>
          </div>
        </section>
        <section className={`${s.section} ${s.case}`}>
          <div className={`${s.wrap} ${s.faqGrid}`}>
            <div>
              <h2 className={s.title}>Quelques repères.</h2>
              <Link href="/questions" className={s.textLink}>
                Toutes les questions →
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
                  création de compte. Vous pouvez ensuite créer votre espace
                  pour essayer RH Pilot.
                </p>
                <Link href="/services#demo" className={s.textLink}>
                  Ouvrir la démonstration →
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
                  Comparer les offres →
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
                  Consulter la page Sécurité →
                </Link>
              </details>
            </div>
          </div>
        </section>
        <ClosingCta />
      </main>
      <TutorialFirstVisitPrompt />
      <MarketingFooter />
    </div>
  );
}
