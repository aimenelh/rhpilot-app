import type { Metadata } from "next";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { TutorialGuide } from "@/components/landing/TutorialGuide";
import styles from "@/components/landing/TutorialGuide.module.css";

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
            <img src="https://cdn.openart.ai/openart-uploads/production/attachment-transfers/2107f55556f2daf58e264e90339ec950063505d3ed9d643e4dc714bee47ce24e.jpg" alt="Maxime Dekens" width={48} height={48} />
            <div>
              <p>Réalisés avec <strong>Maxime Dekens</strong></p>
              <p>Assistant RH dans le domaine de l’hôtellerie</p>
            </div>
          </div>
        </header>
        <TutorialGuide />
      </main>
      <MarketingFooter />
    </div>
  );
}
