import type { Metadata } from "next";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { TutorialGuide } from "@/components/landing/TutorialGuide";
import styles from "@/components/landing/TutorialGuide.module.css";

const MAXIME_DEKENS_AVATAR = "data:image/jpeg;base64,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";

export const metadata: Metadata = {
  title: "Tutoriels | RH Pilot",
  description: "Découvrez RH Pilot en vidéo et prenez rapidement en main les principales fonctionnalités du logiciel.",
};

export default function TutorielsPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingHeader />
      <main id="main-content" className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Les tutoriels</h1>
            <p className={styles.pageIntro}>Retrouvez les principales fonctions de RH Pilot en vidéo.</p>
          </div>
          <div className={styles.author}>
            <img src={MAXIME_DEKENS_AVATAR} alt="Maxime Dekens" width={48} height={48} />
            <div>
              <p>Réalisés avec <strong>Maxime Dekens</strong></p>
              <p>Assistant RH · Domaine de Verchant Hôtel &amp; Spa</p>
            </div>
          </div>
        </header>
        <TutorialGuide />
      </main>
      <MarketingFooter />
    </div>
  );
}
