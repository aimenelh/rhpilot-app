import Link from "next/link";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import { ClosingCta } from "./ClosingCta";
import { InteractiveDemo } from "./InteractiveDemo";
import { SoftwareSandbox } from "./SoftwareSandbox";
import { CopilotScene } from "./CopilotScene";
import h from "./payroll/PayrollHub.module.css";

// Page « Le logiciel » : on l'essaie avant de le lire. Les ancres #parcours,
// #salaries, #echeances, #copilote (dans la démonstration) et #demo restent
// celles du menu.

const BEYOND = [
  { title: "Les pièces au bon endroit", text: "Contrat signé, accusé de DPAE, convocation : chaque étape garde son justificatif, retrouvable depuis la fiche du salarié." },
  { title: "Un résumé dans votre boîte mail", text: "Chaque jour ou chaque semaine, au choix : ce qui est en retard, ce qui tombe aujourd’hui, ce qui arrive cette semaine. Et un rappel au responsable d’une tâche, directement depuis la liste." },
  { title: "La paie dans la continuité", text: "Les salariés, leurs absences et leurs arrêts enregistrés ici servent directement au calcul de la paie, sur le palier Pro." },
];

export function SoftwareOverview() {
  return (
    <div className={h.page}>
      <MarketingHeader />
      <main id="main-content">
        <section className={h.hero} aria-labelledby="software-title">
          <div className={h.inner}>
            <div className={h.heroHead}>
              <div>
                <h1 id="software-title" className={h.title}>
                  Découvrir le logiciel
                </h1>
                <p className={h.intro}>
                  Essayez RH Pilot ici, sans créer de compte. Écrivez un événement, une embauche par exemple : le
                  logiciel prépare le parcours daté, le range dans la fiche du salarié et dans le calendrier.
                </p>
              </div>
              <CopilotScene
                figure="suivi"
                className={h.heroScene}
                ask={{ persona: "nadia", text: "Karim finit sa période d’essai le 20 octobre." }}
                answer="Entretien prévu le 16, délai de prévenance vérifié."
              />
            </div>
            <div className={h.demo}>
              <SoftwareSandbox />
            </div>
          </div>
        </section>

        <section className={h.how} aria-labelledby="software-beyond-title">
          <div className={h.inner}>
            <h2 id="software-beyond-title" className={h.h2Small}>
              Aussi dans le logiciel
            </h2>
            <div className={h.howGrid}>
              {BEYOND.map((item) => (
                <div key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className={h.topics} aria-labelledby="software-tour-title">
          <div className={h.inner}>
            <h2 id="software-tour-title" className={h.h2Small}>
              Visite guidée du logiciel
            </h2>
            <p className={h.lead}>Les écrans de RH Pilot, étape par étape, avec les données d’une entreprise de démonstration.</p>
            <div className={h.demo}>
              <InteractiveDemo />
            </div>
            <p className={h.sources}>
              Les mêmes écrans existent en <Link href="/tutoriels">tutoriels vidéo</Link>, si vous préférez regarder.
            </p>
          </div>
        </section>
      </main>
      <ClosingCta />
      <MarketingFooter />
    </div>
  );
}
