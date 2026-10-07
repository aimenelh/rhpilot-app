import Link from "next/link";
import Image from "next/image";
import s from "./ProductStory.module.css";

// Trois moments du quotidien, avec les captures de l'application. Un copilote
// passe la tête au-dessus de chaque capture.
// Volontairement fixe : la seule interaction de la page d'accueil reste le
// haut de page (« changez l'événement »).
const chapters = [
  {
    label: "parcours",
    title: "Des parcours RH étape par étape",
    text: "Chaque parcours liste ses étapes dans l’ordre, avec la date prévue, la personne qui s’en charge et la pièce attendue. Les étapes se cochent au fur et à mesure.",
    copilot: "suivi",
    image: { src: "/marketing/parcours-landing.webp", width: 1180, height: 620, alt: "Étapes d’un parcours d’embauche dans RH Pilot, avec dates, responsables et pièces attendues" },
  },
  {
    label: "rappels",
    title: "Des rappels par e-mail",
    text: "Chaque personne reçoit le résumé de ses actions à venir, chaque jour ou chaque semaine. L’historique indique qui a été relancé, et quand.",
    copilot: "salut",
    image: { src: "/marketing/notifications-landing-v2.webp", width: 1032, height: 713, alt: "Réglage des résumés et historique des rappels envoyés dans RH Pilot" },
  },
  {
    label: "copilote",
    title: "Le Copilote RH",
    text: "Le Copilote répond à partir de vos salariés, de vos parcours et de vos échéances, puis propose la suite : un rappel, l’ouverture d’un dossier, un bilan.",
    copilot: "contact",
    image: { src: "/marketing/copilot-landing-v2.webp", width: 914, height: 726, alt: "Le Copilote liste les périodes d’essai qui se terminent ce mois-ci" },
  },
];

export function ProductStory() {
  return (
    <section className={s.tour} id="product-story" aria-labelledby="product-story-title">
      <div className={s.inner}>
        <h2 id="product-story-title" className={s.heading}>Le logiciel au quotidien</h2>
        <div className={s.rows}>
          {chapters.map((chapter) => (
            <article key={chapter.label} className={s.row}>
              <div className={s.text}>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
              </div>
              <div className={s.media}>
                <div className={s.peek} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/illustrations/copilotes/${chapter.copilot}.svg`} alt="" width={320} height={400} loading="lazy" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/illustrations/copilotes/${chapter.copilot}-blink.svg`} alt="" width={320} height={400} loading="lazy" className={s.blink} />
                </div>
                <figure className={s.frame}>
                  <div className={s.bar}>
                    <span>RH Pilot</span>
                  </div>
                  <Image src={chapter.image.src} alt={chapter.image.alt} width={chapter.image.width} height={chapter.image.height} sizes="(max-width: 900px) 95vw, 680px" />
                </figure>
              </div>
            </article>
          ))}
        </div>
        <p className={s.more}>
          <Link href="/services#demo">Explorer la démonstration</Link>
        </p>
      </div>
    </section>
  );
}
