import Image from "next/image";
import Link from "next/link";
import { MarketingCTA, MarketingPage } from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import e from "./espace-salarie.module.css";

export const metadata = {
  title: "Espace salarié : bulletins, congés et documents, RH Pilot",
  description:
    "Chaque salarié retrouve ses bulletins de paie, ses congés, ses demandes d’absence et ses documents de fin de contrat sur son téléphone. Inclus dans RH Pilot, sans coût par compte.",
  alternates: { canonical: "/espace-salarie" },
};

const SCREENS = [
  {
    image: "/marketing/espace-bulletins.webp",
    alt: "Liste des bulletins de salaire d’une salariée dans son espace RH Pilot, sur téléphone",
    title: "Ses bulletins",
    text: "Chaque mois, un e-mail le prévient ; il ouvre son bulletin d’un geste et peut tout télécharger en une fois.",
  },
  {
    image: "/marketing/espace-conges.webp",
    alt: "Compteurs de congés payés d’une salariée dans son espace RH Pilot",
    title: "Ses congés",
    text: "Ses compteurs, repris du dernier bulletin validé, et ce qu’il lui restera après les congés déjà posés.",
  },
  {
    image: "/marketing/espace-absences.webp",
    alt: "Formulaire de demande d’absence dans l’espace salarié RH Pilot",
    title: "Ses demandes",
    text: "Il pose un congé ou déclare un arrêt avec la photo de son avis. Vous validez dans RH Pilot, il voit la réponse.",
  },
];

const LAW = [
  {
    title: "Le droit de refuser le bulletin électronique",
    ref: "Code du travail, art. L3243-2",
    text: "Le salarié peut demander le papier à tout moment, depuis son espace. Son choix est horodaté et pris en compte tout de suite : ses bulletins suivants ne sont plus publiés en ligne.",
  },
  {
    title: "L’information avant le premier bulletin",
    ref: "Code du travail, art. D3243-7",
    text: "RH Pilot prépare la note d’information à faire signer et garde sa date de remise. Le premier bulletin électronique n’est publié qu’un mois plus tard, ou dès l’embauche.",
  },
  {
    title: "Cinquante ans de disponibilité",
    ref: "Code du travail, art. D3243-8",
    text: "Les bulletins restent consultables après le départ du salarié et même si vous quittez RH Pilot. Il peut tout récupérer en une archive ; une fermeture du service serait annoncée trois mois avant.",
  },
  {
    title: "Une trace de chaque étape",
    ref: "Journal de l’espace salarié",
    text: "Mise à disposition, e-mail envoyé, ouverture par le salarié : tout est enregistré. Un document publié n’est jamais modifié ; une correction le remplace et le salarié en est prévenu.",
  },
];

export default function EmployeeSpaceMarketingPage() {
  return (
    <MarketingPage>
      <section className={e.hero}>
        <div className={`${s.wrap} ${e.heroGrid}`}>
          <div className={e.heroCopy}>
            <p className={s.eyebrow}>Espace salarié</p>
            <h1 className={e.heroTitle}>
              Les bulletins de vos salariés, <em>sur leur téléphone.</em>
            </h1>
            <p className={s.lead}>
              Chaque salarié a son espace : ses bulletins, ses congés, ses demandes d’absence et ses documents de fin de
              contrat. Vous n’envoyez plus rien par e-mail, et il garde tout après son départ.
            </p>
            <div className={s.actions}>
              <Link href="/sign-up" className={s.primary}>
                Créer mon espace
              </Link>
              <Link href="/tarifs" className={s.secondary}>
                Voir les tarifs
              </Link>
            </div>
            <p className={e.heroNote}>
              Inclus dans RH Pilot, sans coût par compte salarié. Les bulletins arrivent avec le module paie de l’offre
              Pro ; les absences et les documents sont compris dans toutes les offres.
            </p>
          </div>
          <div className={e.heroPhones} aria-hidden="true">
            <div className={e.phone}>
              <Image src="/marketing/espace-bulletins.webp" alt="" width={600} height={1200} sizes="250px" priority />
            </div>
            <div className={e.phone}>
              <Image src="/marketing/espace-conges.webp" alt="" width={600} height={1200} sizes="250px" priority />
            </div>
          </div>
        </div>
      </section>

      <section className={p.section}>
        <div className={s.wrap}>
          <h2 className={s.title}>Ce que voit le salarié.</h2>
          <p className={s.body} style={{ maxWidth: 620 }}>
            Pas d’application à installer : il reçoit une invitation sur son adresse personnelle, crée son accès en une
            minute et s’en sert depuis son téléphone comme depuis un ordinateur.
          </p>
          <div className={e.screens}>
            {SCREENS.map((screen) => (
              <figure key={screen.title} className={e.screen}>
                <div className={e.phone}>
                  <Image src={screen.image} alt={screen.alt} width={600} height={1200} sizes="(max-width: 700px) 70vw, 260px" />
                </div>
                <h3>{screen.title}</h3>
                <p>{screen.text}</p>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className={`${p.section} ${p.tint}`}>
        <div className={`${s.wrap} ${e.split}`}>
          <div>
            <h2 className={s.title}>Côté RH, un bouton.</h2>
            <p className={s.body}>
              Une fois la paie du mois validée, « Mettre à disposition » dépose chaque bulletin dans l’espace du salarié.
              Il reçoit un e-mail, sans le PDF en pièce jointe, et vous voyez qui l’a ouvert.
            </p>
            <ul className={p.rows}>
              <li>
                <h3>Une invitation depuis la fiche</h3>
                <p>Vous saisissez l’adresse personnelle du salarié et l’invitez. Son compte ne donne aucun accès au reste de RH Pilot.</p>
              </li>
              <li>
                <h3>Les documents de fin de contrat</h3>
                <p>Le certificat de travail et le reçu pour solde de tout compte sont produits par RH Pilot ; l’attestation France Travail se dépose en PDF.</p>
              </li>
              <li>
                <h3>Le papier pour ceux qui le demandent</h3>
                <p>Les salariés qui refusent le format électronique sont listés à part, avec le PDF du mois à imprimer.</p>
              </li>
            </ul>
          </div>
          <figure>
            <div className={e.shot}>
              <Image
                src="/marketing/espace-publication.webp"
                alt="Panneau « Mettre à disposition des salariés » dans la paie de RH Pilot"
                width={1200}
                height={326}
                sizes="(max-width: 960px) 95vw, 640px"
              />
            </div>
            <figcaption className={e.caption}>Mise à disposition des bulletins, après la clôture du mois.</figcaption>
          </figure>
        </div>
      </section>

      <section className={p.section}>
        <div className={s.wrap}>
          <h2 className={s.title}>Ce que prévoit la loi, c’est déjà fait.</h2>
          <div className={e.law}>
            {LAW.map((item) => (
              <div key={item.title}>
                <h3>{item.title}</h3>
                <span className={e.ref}>{item.ref}</span>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${s.section} ${s.case}`}>
        <div className={`${s.wrap} ${s.faqGrid}`}>
          <div>
            <h2 className={s.title}>Les questions qu’on nous pose.</h2>
            <Link href="/questions" className={s.textLink}>
              Toutes les questions →
            </Link>
          </div>
          <div className={s.faq}>
            <details>
              <summary>Combien coûte l’espace salarié ?</summary>
              <p>
                Rien de plus : il est inclus dans RH Pilot. Votre abonnement dépend du nombre de salariés suivis, pas du
                nombre de comptes ouverts.
              </p>
            </details>
            <details>
              <summary>Que se passe-t-il quand un salarié quitte l’entreprise ?</summary>
              <p>
                Il garde l’accès à ses bulletins et à ses documents de sortie. Vous pouvez aussi lui remettre une archive de
                tous ses documents depuis sa fiche.
              </p>
            </details>
            <details>
              <summary>Et si un bulletin doit être corrigé ?</summary>
              <p>
                Vous republiez le bulletin corrigé : il remplace le précédent dans l’espace du salarié, qui reçoit un
                e-mail. L’ancienne version reste dans le journal.
              </p>
            </details>
            <details>
              <summary>Mes salariés peuvent-ils voir les données des autres ?</summary>
              <p>
                Non. Chaque salarié ne voit que ses propres documents et demandes. Le compte salarié ne donne aucun accès au
                tableau de bord RH.
              </p>
            </details>
          </div>
        </div>
      </section>

      <MarketingCTA
        title="Plus aucun bulletin à envoyer un par un."
        text="Créez votre espace RH Pilot, puis invitez vos salariés depuis leur fiche."
      />
    </MarketingPage>
  );
}
