import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { CopilotScene } from "@/components/landing/CopilotScene";
import { LivePayslip } from "@/components/landing/payroll/LivePayslip";
import { PayrollMonth, PayrollTopics } from "@/components/landing/payroll/PayrollHub";
import { computePayslipDemo, DEFAULT_DEMO_INPUT } from "@/components/landing/payroll/payslipDemo";
import s from "@/components/landing/payroll/PayrollHub.module.css";

export const metadata = {
  title: "Gestion de la paie",
  description:
    "Calculez un bulletin en direct avec le moteur de RH Pilot : cotisations ligne par ligne, net social, coût employeur, règles et sources officielles.",
};

export default function GestionPaiePage() {
  // Premier rendu calculé au moment de la construction de la page, avec le même
  // moteur que celui du navigateur : de vrais montants, sans attendre le script.
  const initial = computePayslipDemo(DEFAULT_DEMO_INPUT);
  return (
    <div className={s.page}>
      <MarketingHeader />
      <main id="main-content">
        <section className={s.hero} aria-labelledby="payroll-title">
          <div className={s.inner}>
            <div className={s.heroHead}>
              <div>
                <h1 id="payroll-title" className={s.title}>
                  Gestion de la paie
                </h1>
                <p className={s.intro}>
                  Le moteur de calcul de RH Pilot, en démonstration sur un salarié fictif. Changez le salaire ou le
                  statut : chaque montant affiche sa base, son taux et sa source officielle.
                </p>
                <p className={s.intro}>
                  Le calcul de paie dans l’application est en accès anticipé, sur invitation, et distinct de l’offre Pro.
                  La DSN est produite en fichier d’essai, à déposer en mode test sur net-entreprises.
                </p>
              </div>
              <CopilotScene
                figure="paie"
                className={s.heroScene}
                ask={{ persona: "marc", text: "Combien coûte un salarié à 2 500 € brut ?" }}
                answer="3 172,65 € par mois pour l’employeur."
              />
            </div>
            <div className={s.demo} id="bulletin">
              <LivePayslip initial={initial} />
            </div>
          </div>
        </section>
        <PayrollMonth />
        <PayrollTopics />
      </main>
      <ClosingCta
        title="Le calcul de la paie est en accès anticipé."
        text="Contactez-nous pour connaître le périmètre pris en charge et demander un accès."
        action="Demander un accès"
        href="/contact"
      />
      <MarketingFooter />
    </div>
  );
}
