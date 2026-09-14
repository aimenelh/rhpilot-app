import Link from "next/link";
import {
  MarketingPage,
  PageIntro,
  MarketingCTA,
} from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import { DiagnosticQuiz } from "@/components/landing/DiagnosticQuiz";
export const metadata = {
  title: "Diagnostic RH, RH Pilot",
  description: "Six questions pour faire le point sur votre organisation RH.",
};
export default function DiagnosticPage() {
  return (
    <MarketingPage>
      <PageIntro
        eyebrow="Le diagnostic RH"
        title="Faites le point sur votre organisation."
        intro="Six questions pour identifier vos points d’attention. Aucune inscription requise."
      />
      <section className={p.section}>
        <div className={s.wrap}>
          <DiagnosticQuiz />
        </div>
      </section>
    </MarketingPage>
  );
}
