import Link from "next/link";
import Image from "next/image";
import s from "./ProductStory.module.css";

// Trois moments du quotidien, avec les captures réelles de l'application.
// Volontairement fixe : la seule interaction de la page d'accueil reste le
// haut de page (« changez l'événement »).
const chapters = [
  {
    label: "Tout est daté",
    title: "Chaque étape a sa date, son responsable, sa pièce.",
    text: "Un parcours liste ses étapes dans l’ordre : la date prévue, qui s’en charge, la pièce attendue. Vous marquez chaque étape comme faite, au fil de l’eau.",
    image: { src: "/marketing/parcours-landing.webp", width: 1180, height: 620, alt: "Étapes d’un parcours d’embauche dans RH Pilot, avec dates, responsables et pièces attendues" },
  },
  {
    label: "Les rappels partent seuls",
    title: "Personne n’a besoin de s’en souvenir.",
    text: "Chacun reçoit le résumé de ses actions urgentes, à la fréquence choisie. L’historique montre qui a déjà été relancé.",
    image: { src: "/marketing/notifications-landing.webp", width: 1774, height: 887, alt: "Réglage des résumés et historique des rappels envoyés dans RH Pilot" },
  },
  {
    label: "Le Copilote répond",
    title: "Une question ? La réponse vient de vos données.",
    text: "Le Copilote s’appuie sur vos salariés, vos parcours et vos échéances pour répondre, puis propose la suite : un rappel, un dossier, un bilan.",
    image: { src: "/marketing/copilot-landing.webp", width: 1717, height: 916, alt: "Le Copilote liste les périodes d’essai qui se terminent ce mois-ci" },
  },
];

export function ProductStory() {
  return (
    <section className={s.tour} id="product-story" aria-labelledby="product-story-title">
      <div className={s.inner}>
        <h2 id="product-story-title" className={s.heading}>Au quotidien, dans RH Pilot.</h2>
        <div className={s.rows}>
          {chapters.map((chapter) => (
            <article key={chapter.label} className={s.row}>
              <div className={s.text}>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
              </div>
              <figure className={s.frame}>
                <div className={s.bar}>
                  <span>RH Pilot</span>
                  <span>{chapter.label}</span>
                </div>
                <Image src={chapter.image.src} alt={chapter.image.alt} width={chapter.image.width} height={chapter.image.height} sizes="(max-width: 900px) 95vw, 680px" />
              </figure>
            </article>
          ))}
        </div>
        <p className={s.more}>
          Captures réelles de l’application. <Link href="/services#demo">Explorer la démonstration</Link>
        </p>
      </div>
    </section>
  );
}
