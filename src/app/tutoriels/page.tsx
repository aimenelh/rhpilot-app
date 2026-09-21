import type { Metadata } from "next";
import { ExternalLink, PlayCircle } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

const GUIDE_URL = "https://rhpilot-guide-interactif.aimenoffi.chatgpt.site";

export const metadata: Metadata = {
  title: "Tutoriels vidéo | RH Pilot",
  description:
    "Guide vidéo de prise en main RH Pilot : création de l’espace, salariés, tâches, calendrier, parcours personnalisés et absences.",
};

const chapters = [
  "Démarrage",
  "Salariés",
  "Organisation RH",
  "Parcours personnalisés",
  "Absences",
];

export default function TutorielsPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main id="main-content">
        <section className="border-b border-surface-border bg-[#F6F4EE]">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
              RH Pilot · Le guide
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="font-display text-[2.7rem] font-medium leading-[1.06] tracking-[-0.04em] sm:text-[3.6rem]">
                  RH Pilot en vidéo.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
                  Huit démonstrations courtes pour découvrir le logiciel tel qu’il
                  fonctionne aujourd’hui, sans les séquences du socle paie encore en
                  construction.
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-ink-soft">
                <PlayCircle size={18} className="text-brand-primary" />
                <span>8 vidéos · environ 19 min</span>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {chapters.map((chapter) => (
                <span
                  key={chapter}
                  className="rounded-full border border-[#DDD9D0] bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
                >
                  {chapter}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-3 py-5 sm:px-6 sm:py-8">
          <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
            <iframe
              src={GUIDE_URL}
              title="Guide vidéo interactif RH Pilot"
              className="block h-[78vh] min-h-[720px] w-full bg-white"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="mx-auto mt-4 flex max-w-5xl flex-col gap-2 px-2 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
            <p>
              Le guide conserve votre progression sur ce navigateur.
            </p>
            <a
              href={GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-brand-primary hover:underline"
            >
              Ouvrir le guide dans un nouvel onglet
              <ExternalLink size={14} />
            </a>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
