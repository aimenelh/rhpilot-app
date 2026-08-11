import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";
import { DiagnosticQuiz } from "@/components/landing/DiagnosticQuiz";

export const metadata = {
  title: "Diagnostic RH — RH Pilot",
  description:
    "Testez en 2 minutes la santé RH de votre entreprise : périodes d'essai, visites médicales, entretiens professionnels, charge administrative.",
};

export default function DiagnosticPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      <section className="mx-auto max-w-2xl px-6 pb-6 pt-16 text-center">
        <Reveal variant="scale">
          <span className="inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Diagnostic
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            La santé RH de votre entreprise, en 2 minutes.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
            6 questions. Un diagnostic personnalisé. Aucune inscription requise.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-24 pt-10">
        <Reveal delay={150}>
          <DiagnosticQuiz />
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
