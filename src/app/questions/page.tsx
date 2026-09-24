import Link from "next/link";
import {
  MarketingPage,
  PageIntro,
  MarketingCTA,
} from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
const GROUPS = [
  {
    id: "demarrer",
    title: "Bien démarrer",
    items: [
      [
        "À qui s’adresse RH Pilot ?",
        "Aux petites équipes qui veulent centraliser leurs salariés, organiser leurs parcours RH et suivre les échéances.",
      ],
      [
        "Puis-je découvrir le logiciel avant de m’inscrire ?",
        <>
          Oui. La <Link href="/services?demo=1">démonstration interactive</Link>{" "}
          permet de parcourir un exemple sans créer de compte.
        </>,
      ],
      [
        "Comment ajouter mes salariés ?",
        "Vous pouvez créer leurs fiches dans le logiciel ou utiliser l’import CSV pour préparer votre équipe.",
      ],
    ],
  },
  {
    id: "quotidien",
    title: "Au quotidien",
    items: [
      [
        "Que contient un parcours RH ?",
        "Un ensemble d’étapes à suivre pour un salarié : tâches, responsables, échéances et documents associés.",
      ],
      [
        "Quel est le rôle du Copilote ?",
        "Il vous aide à formuler une demande et à préparer les actions. Vérifiez ses propositions et les informations utilisées avant de les valider.",
      ],
      [
        "Le module paie est-il disponible ?",
        <>
          Oui, sur le palier Pro, pour un périmètre défini : quand une situation n’est pas encore prise en charge, le
          calcul est bloqué plutôt que faux. Vous pouvez essayer le calcul d’un bulletin sur la page{" "}
          <Link href="/gestion-paie">Gestion de la paie</Link>.
        </>,
      ],
    ],
  },
  {
    id: "compte",
    title: "Compte et abonnement",
    items: [
      [
        "Combien coûte RH Pilot ?",
        <>
          L’offre gratuite couvre jusqu’à 3 salariés. Pro coûte 15 € par mois,
          plus 3 € par salarié. Retrouvez le{" "}
          <Link href="/tarifs">calculateur de tarifs</Link>.
        </>,
      ],
      [
        "Où trouver les informations sur mes données ?",
        <>
          La page <Link href="/securite">Sécurité</Link> présente les
          protections et les prestataires. Consultez aussi notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </>,
      ],
      [
        "Comment contacter l’équipe ?",
        <>
          Écrivez à <a href="mailto:aimenoffi@gmail.com">aimenoffi@gmail.com</a>{" "}
          avec votre question.
        </>,
      ],
    ],
  },
];
export const metadata = {
  title: "Questions fréquentes, RH Pilot",
  description:
    "Les réponses à vos questions sur RH Pilot, ses parcours et ses offres.",
};
export default function QuestionsPage() {
  return (
    <MarketingPage>
      <PageIntro
        eyebrow="Questions fréquentes"
        title="Quelques réponses avant de commencer."
        intro="Le fonctionnement, les offres, vos données : les informations utiles pour prendre vos repères."
      />
      <section className={p.section}>
        <div className={`${s.wrap} ${p.faqLayout}`}>
          <nav className={p.faqNav} aria-label="Catégories de questions">
            {GROUPS.map((g) => (
              <a key={g.id} href={`#${g.id}`}>
                {g.title}
              </a>
            ))}
          </nav>
          <div>
            {GROUPS.map((g) => (
              <section className={p.faqGroup} id={g.id} key={g.id}>
                <h2>{g.title}</h2>
                {g.items.map(([q, a], i) => (
                  <details key={i}>
                    <summary>{q}</summary>
                    <div className={p.answer}>{a}</div>
                  </details>
                ))}
              </section>
            ))}
          </div>
        </div>
      </section>
      <MarketingCTA />
    </MarketingPage>
  );
}
