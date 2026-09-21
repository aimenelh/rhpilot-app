import type { Metadata } from "next";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { TutorialGuide } from "@/components/landing/TutorialGuide";

export const metadata: Metadata = {
  title: "Tutoriels vidéo | RH Pilot",
  description:
    "Prenez en main RH Pilot avec huit démonstrations vidéo : espace RH, salariés, tâches, calendrier, parcours personnalisés et absences.",
};

export default function TutorielsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-ink">
      <MarketingHeader />
      <main id="main-content">
        <section className="border-b border-surface-border bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
              RH Pilot · Le guide
            </p>
            <div className="mt-3 max-w-3xl">
              <h1 className="font-display text-[2.45rem] font-medium leading-[1.05] tracking-[-0.04em] sm:text-[3.35rem]">
                Prenez RH Pilot en main,
                <br className="hidden sm:block" /> directement dans le logiciel.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">
                Huit démonstrations courtes pour découvrir les fonctions déjà stabilisées
                de RH Pilot. Aucune connexion externe n’est nécessaire.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {["8 vidéos", "≈ 19 min", "Progression enregistrée", "Sans paie / DSN"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-surface-border bg-[#FAFAF8] px-3 py-1.5 text-xs font-semibold text-ink-soft"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
          <TutorialGuide />
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
