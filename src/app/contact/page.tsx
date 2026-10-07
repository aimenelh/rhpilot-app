import Link from "next/link";
import { MarketingPage, PageIntro } from "@/components/landing/MarketingPage";
import { CopilotScene } from "@/components/landing/CopilotScene";

export const metadata = {
  title: "Contact",
  description: "Contacter RH Pilot : question sur le logiciel, démonstration, accès anticipé au calcul de la paie.",
};

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        title="Contact"
        intro="Une question sur le logiciel, une démonstration, un accès anticipé au calcul de la paie : écrivez-nous à contact@rhpilot.fr."
        scene={
          <CopilotScene
            figure="contact"
            ask={{ persona: "nadia", text: "Je voudrais une démonstration." }}
            answer="Écrivez à contact@rhpilot.fr avec votre effectif et vos sujets."
          />
        }
      />
      <section className="mx-auto grid max-w-5xl gap-8 px-6 pb-20 pt-16 md:grid-cols-2">
        <div className="rounded-xl border border-surface-border p-6">
          <h2 className="text-xl font-semibold">Écrire à l’équipe</h2>
          <p className="my-4 text-ink-soft">
            Pour une démonstration, indiquez votre secteur, votre effectif et les sujets que vous souhaitez voir.
          </p>
          <a
            href="mailto:contact@rhpilot.fr?subject=Demande%20de%20d%C3%A9monstration%20RH%20Pilot"
            className="font-semibold text-brand-primary hover:underline"
          >
            contact@rhpilot.fr
          </a>
        </div>
        <div className="rounded-xl border border-surface-border p-6">
          <h2 className="text-xl font-semibold">Découvrir sans compte</h2>
          <p className="my-4 text-ink-soft">La démonstration et les tutoriels sont accessibles sans compte, sur téléphone ou ordinateur.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/services?demo=1" className="font-semibold text-brand-primary hover:underline">
              Voir la démonstration
            </Link>
            <Link href="/tutoriels" className="font-semibold text-brand-primary hover:underline">
              Voir les tutoriels
            </Link>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
