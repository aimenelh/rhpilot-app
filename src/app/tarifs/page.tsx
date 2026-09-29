import Link from "next/link";
import {
  MarketingPage,
  PageIntro,
  MarketingCTA,
} from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import { PricingCalculator } from "@/components/landing/PricingCalculator";
export const metadata = {
  title: "Tarifs, RH Pilot",
  description:
    "Gratuit jusqu’à 3 salariés. Pro : 15 € par mois + 3 € par salarié. Espace salarié inclus, sans coût par compte.",
};
export default function TarifsPage() {
  return (
    <MarketingPage>
      <PageIntro
        eyebrow="Les tarifs"
        title="Un prix que vous pouvez calculer."
        intro="Commencez avec votre équipe actuelle. Votre abonnement suit ensuite votre effectif."
      />
      <section className={p.section}>
        <div className={s.wrap}>
          <div className={p.pricing}>
            <article className={p.plan}>
              <p className={p.label}>Pour commencer</p>
              <h2>Gratuit</h2>
              <p className={p.price}>0 €</p>
              <p>Jusqu’à 3 salariés</p>
              <ul>
                <li>Votre équipe réunie au même endroit</li>
                <li>Parcours RH et suivi des échéances</li>
                <li>Espace salarié : absences et documents</li>
                <li>Copilote inclus</li>
              </ul>
              <Link className={s.secondary} href="/sign-up">
                Créer mon compte ↗
              </Link>
            </article>
            <article className={`${p.plan} ${p.planPro}`}>
              <p className={p.label}>Pour accompagner votre croissance</p>
              <h2>Pro</h2>
              <p className={p.price}>
                15 € <span style={{ fontSize: 18 }}> / mois</span>
              </p>
              <p>+ 3 € par salarié / mois</p>
              <ul>
                <li>Sans limite de salariés</li>
                <li>Parcours et rappels illimités</li>
                <li>Module paie : saisie, calcul et bulletins</li>
                <li>Espace salarié complet, bulletins compris</li>
                <li>Copilote inclus dans votre abonnement</li>
              </ul>
              <Link className={s.primary} href="/sign-up">
                Commencer avec RH Pilot ↗
              </Link>
            </article>
          </div>
          <div className={p.comparison}>
            <div>
              <h2>Un besoin plus spécifique ?</h2>
              <p className={s.body}>
                L’offre Entreprise est disponible sur devis.
              </p>
            </div>
            <Link href="mailto:contact@rhpilot.fr" className={s.textLink}>
              Échanger avec l’équipe ↗
            </Link>
          </div>
        </div>
      </section>
      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <div>
            <p className={s.eyebrow}>Inclus, sans supplément</p>
            <h2 className={s.title}>Un espace pour chaque salarié.</h2>
          </div>
          <div>
            <p className={s.body}>
              Vos salariés retrouvent leurs bulletins, leurs congés, leurs
              demandes d&apos;absence et leurs documents de fin de contrat sur
              leur téléphone. Leurs comptes ne sont pas facturés : votre prix
              dépend du nombre de salariés suivis, pas du nombre de personnes
              connectées.
            </p>
            <Link href="/espace-salarie" className={s.textLink}>
              Découvrir l&apos;espace salarié →
            </Link>
          </div>
        </div>
      </section>
      <section className={`${p.section} ${p.tint}`}>
        <div className={`${s.wrap} ${p.calculator}`}>
          <div>
            <p className={s.eyebrow}>Votre budget</p>
            <h2 className={s.title}>Et pour votre équipe ?</h2>
            <p className={s.body}>
              Ajustez le nombre de salariés pour voir le montant mensuel. La
              facturation est mensuelle et l’abonnement peut être résilié.
            </p>
          </div>
          <PricingCalculator />
        </div>
      </section>
      <div className={s.wrap}>
        <p className={p.support}>
          Le Copilote et l&apos;espace salarié sont inclus dans les offres
          Gratuit et Pro ; les bulletins y arrivent avec le module paie. Le
          module paie reste limité aux situations actuellement prises en charge.
        </p>
      </div>
      <MarketingCTA />
    </MarketingPage>
  );
}
