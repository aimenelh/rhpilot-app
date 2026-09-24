import Link from "next/link";
import { PAYROLL_TOPIC_GROUPS } from "./payrollTopics";
import s from "./PayrollHub.module.css";

// Briques partagées des pages paie : le mois de paie raconté sur un fil, et
// l'index des sujets. Composants serveur, sans JavaScript côté navigateur.

const MONTH: { date: string; title: string; text: string; links: { href: string; label: string }[] }[] = [
  {
    date: "Du 1er au 23 octobre",
    title: "Les éléments du mois arrivent",
    text: "Huit heures supplémentaires pour Léa, une prime pour Karim, un arrêt de cinq jours pour Tom. Chaque élément est rattaché au bon salarié et au bon mois, au moment où il arrive.",
    links: [
      { href: "/gestion-paie/variables", label: "Variables du mois" },
      { href: "/gestion-paie/arrets-travail", label: "Arrêts de travail" },
    ],
  },
  {
    date: "Lundi 26",
    title: "RH Pilot contrôle avant de calculer",
    text: "Il manque le taux accidents du travail de l’établissement : la période ne se calcule pas, et l’écran dit pourquoi. Une fois le taux saisi, le contrôle passe.",
    links: [{ href: "/gestion-paie/production", label: "Production de la paie" }],
  },
  {
    date: "Mardi 27",
    title: "Le calcul, ligne par ligne",
    text: "Chaque cotisation sort avec sa base, son taux et sa règle. Le salaire est comparé au Smic et au minimum de la convention collective.",
    links: [
      { href: "/gestion-paie/cotisations-sociales", label: "Cotisations sociales" },
      { href: "/gestion-paie/referentiel-conventionnel", label: "Convention collective" },
    ],
  },
  {
    date: "Mercredi 28",
    title: "La période est verrouillée",
    text: "Le calcul est figé avec les règles et leurs versions. Il pourra être relu et rejoué à l’identique, même après un changement de taux.",
    links: [{ href: "/gestion-paie/tracabilite-calcul", label: "Traçabilité du calcul" }],
  },
  {
    date: "Vendredi 30",
    title: "Les bulletins partent",
    text: "Ils ne sont générés que lorsque les sept prérequis sont réunis : période verrouillée, calcul pour chaque salarié, identification de l’employeur…",
    links: [{ href: "/gestion-paie/bulletin-de-paie", label: "Bulletin de paie" }],
  },
];

export function PayrollMonth() {
  return (
    <section className={s.month} aria-labelledby="payroll-month-title">
      <div className={s.inner}>
        <div className={s.monthHead}>
          <h2 id="payroll-month-title" className={s.h2}>
            Octobre, de la première heure sup
            <em> au bulletin.</em>
          </h2>
          <p className={s.lead}>Une période de paie dans une entreprise de trois salariés, telle que RH Pilot la déroule.</p>
        </div>
        <ol className={s.thread}>
          {MONTH.map((step) => (
            <li key={step.title}>
              <p className={s.date}>{step.date}</p>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <p className={s.links}>
                  {step.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className={s.promise}>
          Quand une information manque ou qu’une situation n’est pas encore prise en charge, RH Pilot bloque le calcul
          au lieu de deviner. <em>Un bulletin faux coûte plus cher qu’un bulletin en attente.</em>
        </p>
      </div>
    </section>
  );
}

export function PayrollTopics({ current, title = "Tous les sujets de la paie" }: { current?: string; title?: string }) {
  return (
    <section className={s.topics} aria-labelledby="payroll-topics-title">
      <div className={s.inner}>
        <h2 id="payroll-topics-title" className={s.h2Small}>
          {title}
        </h2>
        <div className={s.groups}>
          {PAYROLL_TOPIC_GROUPS.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.topics.map((topic) => (
                  <li key={topic.href} data-current={topic.href === current}>
                    <Link href={topic.href} aria-current={topic.href === current ? "page" : undefined}>
                      {topic.label}
                    </Link>
                    <span>{topic.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
