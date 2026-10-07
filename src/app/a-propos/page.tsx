import Link from "next/link";
import { MarketingPage, PageIntro, MarketingCTA } from "@/components/landing/MarketingPage";
import { CopilotScene } from "@/components/landing/CopilotScene";
import { FounderVideo } from "@/components/landing/FounderChapter";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import a from "./APropos.module.css";

export const metadata = {
  title: "À propos",
  description:
    "RH Pilot est conçu et développé à Montpellier par Aimen El Housseini, après un Bachelor et un Master RH en alternance.",
};

export default function AProposPage() {
  return (
    <MarketingPage>
      <PageIntro
        title="À propos de RH Pilot"
        intro="RH Pilot est conçu et développé à Montpellier par Aimen El Housseini, après un Bachelor et un Master RH en alternance."
        scene={<CopilotScene figure="fondateur" thought="Pourquoi on court autant, pour avancer si peu ?" />}
      />

      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <h2 className={s.title}>Le parcours</h2>
          <div className={p.story}>
            <p>
              Mon Bachelor RH, je l’ai fait en alternance dans une start-up de bornes de recharge électrique, aux côtés
              de ma tutrice. Mon Master, dans un groupe de treize cabinets d’ophtalmologie.
            </p>
            <p>
              Dans les deux entreprises, j’ai vu la même chose : des échéances dispersées entre fichiers, messages et
              agendas. Une embauche, une fin de période d’essai, une visite médicale, et à chaque fois la même question :
              qu’est-ce qu’il reste à faire, et qui s’en occupe ?
            </p>
            <p>
              RH Pilot est né de ce constat. Chaque événement RH devient un plan d’action daté, avec un responsable pour
              chaque étape et des rappels avant les échéances.
            </p>
            <p className={a.signature}>
              <strong>Aimen El Housseini</strong>
              Fondateur de RH Pilot
            </p>
          </div>
        </div>
      </section>

      <section className={`${p.section} ${p.tint}`}>
        <div className={s.wrap}>
          <h2 className={s.title}>L’histoire en vidéo</h2>
          <FounderVideo className={a.video} />
        </div>
      </section>

      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <h2 className={s.title}>Ce que fait RH Pilot</h2>
          <div className={p.story}>
            <p>
              RH Pilot organise le suivi RH des TPE et PME : fiches salariés, parcours d’embauche et de départ,
              échéances, documents et espace salarié. Le calcul de la paie est en accès anticipé, sur invitation.
            </p>
            <p>
              RH Pilot ne remplace pas un conseil juridique, un expert-comptable ou la médecine du travail. Les règles
              utilisées sont liées à leurs sources officielles, pour que vous puissiez les vérifier.
            </p>
            <p>
              RH Pilot est édité par Aimen El Housseini, entrepreneur individuel à Montpellier. Pour toute question :{" "}
              <a href="mailto:contact@rhpilot.fr" className={s.textLink}>
                contact@rhpilot.fr
              </a>
              . Les détails légaux sont dans les <Link href="/mentions-legales" className={s.textLink}>mentions légales</Link>.
            </p>
          </div>
        </div>
      </section>

      <MarketingCTA />
    </MarketingPage>
  );
}
