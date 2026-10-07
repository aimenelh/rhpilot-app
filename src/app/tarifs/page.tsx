import Link from "next/link";
import { MarketingPage, PageIntro, MarketingCTA } from "@/components/landing/MarketingPage";
import { CopilotScene } from "@/components/landing/CopilotScene";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import { PricingCalculator } from "@/components/landing/PricingCalculator";

export const metadata = {
  title: "Tarifs",
  description:
    "Gratuit jusqu’à 3 salariés. Offre Pro : 15 € HT par mois et 3 € HT par salarié. Espace salarié inclus, sans coût par compte.",
};

export default function TarifsPage() {
  return (
    <MarketingPage>
      <PageIntro
        title="Tarifs"
        intro="Gratuit jusqu’à 3 salariés. Au-delà, l’offre Pro coûte 15 € HT par mois, plus 3 € HT par salarié suivi."
        scene={
          <CopilotScene
            figure="tarifs"
            ask={{ persona: "marc", text: "Combien pour 12 salariés ?" }}
            answer="51 € HT par mois avec l’offre Pro."
          />
        }
      />
      <section className={p.section}>
        <div className={s.wrap}>
          <div className={p.pricing}>
            <article className={p.plan}>
              <h2>Gratuit</h2>
              <p className={p.price}>0 €</p>
              <p>Jusqu’à 3 salariés</p>
              <ul>
                <li>Fiches salariés et documents</li>
                <li>Parcours RH et échéances</li>
                <li>Espace salarié : congés, absences, documents</li>
                <li>Copilote RH</li>
              </ul>
              <Link className={s.secondary} href="/sign-up">
                Créer mon espace
              </Link>
            </article>
            <article className={`${p.plan} ${p.planPro}`}>
              <h2>Pro</h2>
              <p className={p.price}>
                15 € HT <span style={{ fontSize: 18 }}> / mois</span>
              </p>
              <p>+ 3 € HT par salarié et par mois</p>
              <ul>
                <li>Nombre de salariés illimité</li>
                <li>Parcours, rappels et documents illimités</li>
                <li>Espace salarié et dépôt de bulletins externes</li>
                <li>Copilote RH</li>
              </ul>
              <Link className={s.primary} href="/sign-up">
                Créer mon espace
              </Link>
            </article>
          </div>
          <div className={p.comparison}>
            <div>
              <h2>Offre Entreprise</h2>
              <p className={s.body}>Pour plusieurs établissements ou un besoin particulier, sur devis.</p>
            </div>
            <Link href="/contact" className={s.textLink}>
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <div>
            <h2 className={s.title}>Les comptes salariés ne sont pas facturés.</h2>
          </div>
          <div>
            <p className={s.body}>
              Le prix dépend du nombre de salariés suivis dans RH Pilot, pas du nombre de personnes connectées. Chaque
              salarié consulte ses bulletins, ses congés et ses documents depuis son espace, sur téléphone ou ordinateur.
            </p>
            <Link href="/espace-salarie" className={s.textLink}>
              L’espace salarié
            </Link>
          </div>
        </div>
      </section>
      <section className={`${p.section} ${p.tint}`}>
        <div className={`${s.wrap} ${p.calculator}`}>
          <div>
            <h2 className={s.title}>Montant mensuel selon l’effectif</h2>
            <p className={s.body}>Facturation mensuelle, calculée sur le nombre de salariés suivis.</p>
          </div>
          <PricingCalculator />
        </div>
      </section>
      <div className={s.wrap}>
        <p className={p.support}>
          Le Copilote RH et l’espace salarié sont inclus dans les deux offres. Le calcul de la paie est en accès anticipé,
          sur invitation, et n’est pas inclus d’office dans l’offre Pro. Vous pouvez déposer dans l’espace salarié les
          bulletins établis par votre expert-comptable ou par un autre logiciel. TVA non applicable, article 293 B du CGI.
        </p>
      </div>
      <MarketingCTA />
    </MarketingPage>
  );
}
