import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { LivePayslip } from "@/components/landing/payroll/LivePayslip";
import { PayrollMonth, PayrollTopics } from "@/components/landing/payroll/PayrollHub";
import { computePayslipDemo, DEFAULT_DEMO_INPUT } from "@/components/landing/payroll/payslipDemo";
import s from "@/components/landing/payroll/PayrollHub.module.css";

export const metadata = {
  title: "Gestion de la paie, RH Pilot",
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
            <p className={s.kicker}>Gestion de la paie</p>
            <h1 id="payroll-title" className={s.title}>
              Un bulletin qui se calcule
              <em> devant vous.</em>
            </h1>
            <p className={s.intro}>
              Changez le salaire, passez le salarié cadre, ouvrez une ligne : c’est le moteur de RH Pilot qui recalcule,
              et chaque montant montre sa base, son taux et sa source officielle.
            </p>
            <div className={s.demo} id="bulletin">
              <LivePayslip initial={initial} />
            </div>
          </div>
        </section>
        <PayrollMonth />
        <PayrollTopics />
      </main>
      <ClosingCta
        title="Votre prochaine paie se prépare déjà."
        accent="Autant la voir venir."
        text="Créez votre espace, ajoutez vos salariés et lancez votre première période."
        action="Essayer RH Pilot"
      />
      <MarketingFooter />
    </div>
  );
}
