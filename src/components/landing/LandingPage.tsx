import { LandingMotion } from "./LandingMotion";
import { ArrivalHero } from "./ArrivalHero";
import { LiveMonth } from "./LiveMonth";
import { BrandIntro } from "./BrandIntro";
import Image from "next/image";
import Link from "next/link";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import { ProductTabs } from "./ProductTabs";
import s from "./MarketingV2.module.css";
import { MascotScene } from "./MascotScene";
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
        <div className={s.strip}>
          <div className={`${s.wrap} ${s.stripInner}`}>
            <span>Un suivi continu, pour les moments qui comptent.</span>
            <strong>Embauches</strong>
            <strong>Périodes d’essai</strong>
            <strong>Visites médicales</strong>
            <strong>Fins de contrat</strong>
          </div>
        </div>
        <section className={s.section}>
          <div className={s.wrap}>
            <div className={s.headingRow}>
              <div>
                <p className={s.eyebrow}>Le logiciel</p>
                <h2 className={s.title}>
                  Tout commence par
                  <br />
                  une vue claire.
                </h2>
              </div>
              <Link href="/services" className={s.secondary}>
                Explorer RH Pilot →
              </Link>
            </div>
            <ProductTabs />
          </div>
        </section>
        <section className={`${s.section} ${s.case}`}>
          <div className={`${s.wrap} ${s.caseGrid}`}>
            <div className={s.caseArt}>
              <MascotScene
                src="/illustrations/mascot/newhire-handshake.png"
                alt="Une nouvelle arrivée dans l’équipe, accompagnée par RH Pilot"
              />
            </div>
            <div>
              <p className={s.eyebrow}>Une embauche, concrètement</p>
              <h2 className={s.title}>
                L’arrivée est prévue.
                <br />
                La suite aussi.
              </h2>
              <ol className={s.steps}>
                <li>
                  <span>01</span>
                  <div>
                    <h3>Préparez le parcours</h3>
                    <p>
                      Rattachez les étapes d’embauche à la fiche du nouveau
                      salarié.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>Répartissez les actions</h3>
                    <p>
                      Les tâches, leurs responsables et leurs échéances sont
                      visibles.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Gardez une trace du suivi</h3>
                    <p>
                      Retrouvez les étapes réalisées et les documents associés
                      au parcours.
                    </p>
                  </div>
                </li>
              </ol>
              <Link href="/services#demo" className={s.textLink}>
                Suivre un exemple dans le logiciel →
              </Link>
            </div>
          </div>
        </section>
        <section className={s.section}>
          <div className={`${s.wrap} ${s.calendarGrid}`}>
            <div>
              <Image
                src="/marketing/calendar-landing.webp"
                alt="Vue du calendrier RH Pilot et des échéances de l’équipe"
                width={1200}
                height={600}
                sizes="(max-width: 700px) 95vw, 55vw"
              />
            </div>
            <div>
              <p className={s.eyebrow}>Calendrier & rappels</p>
              <h2 className={s.title}>
                La prochaine échéance a déjà sa place.
              </h2>
              <p className={`${s.copy} mt-6`}>
                Une période d’essai à suivre, une visite à organiser, un contrat
                qui se termine. Consultez les dates à venir et retrouvez les
                actions concernées.
              </p>
              <Link href="/services#echeances" className={s.textLink}>
                Voir le suivi des échéances →
              </Link>
            </div>
          </div>
        </section>
        <section className={s.payroll}>
          <div className={`${s.wrap} ${s.payrollInner}`}>
            <div>
              <h2>Et la paie ?</h2>
              <span className={s.badge}>Périmètre du module</span>
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
              <p className={s.eyebrow}>Avant de commencer</p>
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
        <section className={s.cta}>
          <div className={`${s.wrap} ${s.ctaInner}`}>
            <div>
              <h2 className={s.title}>
                Faites le point sur vos RH.
                <br />
                Puis avancez.
              </h2>
              <p>Découvrez votre espace et préparez votre premier parcours.</p>
            </div>
            <Link href="/sign-up" className={s.primary}>
              Essayer RH Pilot <span aria-hidden>↗</span>
            </Link>
          </div>
        </section>
      </main>
      <TutorialFirstVisitPrompt />
      <MarketingFooter />
    </div>
  );
}
