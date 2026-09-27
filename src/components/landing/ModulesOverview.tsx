import Link from "next/link";
import Image from "next/image";
import s from "./ModulesOverview.module.css";

// Ce que couvre RH Pilot, en trois blocs fixes : le suivi RH, la paie et
// l'espace salarié. Chaque bloc renvoie à sa page détaillée.
const MODULES = [
  {
    title: "Le suivi RH",
    text: "Embauches, fins de période d’essai, visites médicales : chaque événement devient un plan daté, avec un responsable et des rappels.",
    href: "/services",
    link: "Découvrir le logiciel",
    image: { src: "/marketing/calendar-landing.webp", width: 1774, height: 887, alt: "Calendrier des échéances RH dans RH Pilot" },
    position: "left top",
  },
  {
    title: "La paie",
    text: "La saisie du mois dans un tableau, le calcul des bulletins, les contrôles avant validation. Les absences et les arrêts viennent du suivi RH.",
    href: "/gestion-paie",
    link: "Voir le module paie",
    image: { src: "/marketing/paie-saisie.webp", width: 1200, height: 900, alt: "Tableau de saisie des primes et variables du mois dans la paie RH Pilot" },
    position: "center top",
  },
  {
    title: "L’espace salarié",
    text: "Bulletins, congés, demandes d’absence et documents de fin de contrat, sur le téléphone de chaque salarié. Sans coût par compte.",
    href: "/espace-salarie",
    link: "Découvrir l’espace salarié",
    image: { src: "/marketing/espace-bulletins.webp", width: 600, height: 1200, alt: "Liste des bulletins de salaire dans l’espace salarié RH Pilot, sur téléphone" },
    position: "center top",
    phone: true,
  },
];

export function ModulesOverview() {
  return (
    <section className={s.modules} aria-labelledby="modules-title">
      <div className={s.inner}>
        <div className={s.head}>
          <h2 id="modules-title">Du premier jour au dernier bulletin.</h2>
          <p>Le suivi RH, la paie et l’espace salarié partagent les mêmes fiches : ce qui est saisi une fois sert partout.</p>
        </div>
        <div className={s.grid}>
          {MODULES.map((module) => (
            <article key={module.title} className={s.card}>
              <div className={`${s.visual} ${module.phone ? s.visualPhone : ""}`}>
                <Image src={module.image.src} alt={module.image.alt} width={module.image.width} height={module.image.height} sizes="(max-width: 900px) 90vw, 380px" style={{ objectPosition: module.position }} />
              </div>
              <h3>{module.title}</h3>
              <p>{module.text}</p>
              <Link href={module.href}>{module.link} →</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
