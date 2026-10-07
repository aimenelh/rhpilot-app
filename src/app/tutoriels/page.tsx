import type { Metadata } from "next";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { TutorialGuide } from "@/components/landing/TutorialGuide";
import { BandThread } from "@/components/landing/BandThread";
import { CopilotScene } from "@/components/landing/CopilotScene";
import styles from "@/components/landing/TutorialGuide.module.css";

export const metadata: Metadata = {
  title: "Tutoriels",
  description: "Les principales fonctions de RH Pilot en vidéo : créer son espace, ajouter un salarié, suivre les échéances, gérer les absences.",
};

export default function TutorielsPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main id="main-content">
        <section className={styles.band}>
          <BandThread />
          <header className={styles.header}>
            <div className={styles.headCopy}>
              <h1 className={styles.pageTitle}>Tutoriels</h1>
              <p className={styles.pageIntro}>Les principales fonctions de RH Pilot, en vidéos de deux à quatre minutes.</p>
              <div className={styles.author}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/team/maxime-dekens-final.jpg" alt="Maxime Dekens" width={48} height={48} />
                <div>
                  <p>Réalisés avec <strong>Maxime Dekens</strong></p>
                  <p>Assistant RH dans le domaine de l’hôtellerie</p>
                </div>
              </div>
            </div>
            <CopilotScene
              figure="tutoriels"
              className={styles.headScene}
              ask={{ persona: "sophie", text: "Comment ajouter un salarié ?" }}
              answer="Vidéo 3, « Ajouter un salarié », 2 min 30."
            />
          </header>
        </section>
        <div className={styles.page}>
          <TutorialGuide />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
