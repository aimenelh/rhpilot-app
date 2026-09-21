import Image from "next/image";
import Link from "next/link";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";
import { InteractiveDemo } from "./InteractiveDemo";
import s from "./MarketingV2.module.css";
const features = [
  {
    id: "salaries",
    label: "Dossiers salariés",
    title: "Une fiche pour retrouver le fil.",
    text: "Consultez les informations du salarié et les parcours qui lui sont associés. Un point de départ commun pour le suivi de votre équipe.",
    items: [
      "Informations du salarié et de son contrat",
      "Parcours associés à chaque personne",
      "Accès aux étapes de son suivi RH",
    ],
    image: "/demo/fiche-salarie.png",
  },
  {
    id: "parcours",
    label: "Parcours RH & documents",
    title: "Passez de l’événement aux actions.",
    text: "Préparez les étapes à réaliser lors d’une embauche ou d’une autre échéance RH. Les tâches donnent un cadre au suivi, avec leurs dates et leurs responsables.",
    items: [
      "Parcours structurés en étapes",
      "Responsables et échéances identifiés",
      "Suivi des actions et documents associés",
    ],
    image: "/demo/parcours-avance.png",
  },
  {
    id: "echeances",
    label: "Calendrier & rappels",
    title: "Gardez les prochaines dates en vue.",
    text: "Le calendrier rassemble les échéances des parcours. Consultez ce qui arrive et retrouvez les tâches à traiter sans reprendre chaque dossier.",
    items: [
      "Vue calendrier des échéances",
      "Repérage des tâches en retard",
      "Notifications et résumés pour le suivi",
    ],
    image: "/marketing/calendar-landing.webp",
  },
  {
    id: "copilote",
    label: "Copilote RH",
    title: "Interrogez votre suivi, simplement.",
    text: "Le copilote utilise les données de votre entreprise pour vous aider à retrouver les priorités. Il propose des pistes à vérifier et accompagne la navigation dans vos parcours.",
    items: [
      "Questions sur les données de l’entreprise",
      "Repérage des parcours à surveiller",
      "Suggestions d’actions à examiner",
    ],
    image: "/marketing/copilot-landing.webp",
  },
];
export function SoftwareOverview() {
  return (
    <div className={s.site}>
      <MarketingHeader />
      <main id="main-content">
        <section className={s.pageHero}>
          <div className={s.wrap}>
            <p className={s.eyebrow}>Le logiciel RH Pilot</p>
            <h1>
              Des dossiers aux échéances,
              <br />
              un même fil conducteur.
            </h1>
            <p className={s.lead}>
              Découvrez comment RH Pilot organise le suivi des salariés,
              répartit les démarches et rend les prochaines actions visibles.
            </p>
            <div className={s.actions}>
              <Link href="/sign-up" className={s.primary}>
                Essayer gratuitement ↗
              </Link>
              <Link href="#demo" className={s.secondary}>
                Voir la démonstration →
              </Link>
              <Link href="/tutoriels" className={s.secondary}>
                Voir les tutoriels vidéo →
              </Link>
            </div>
            <nav className={s.index} aria-label="Fonctionnalités">
              {features.map((f) => (
                <Link key={f.id} href={`#${f.id}`}>
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>
        {features.map((f) => (
          <section id={f.id} key={f.id} className={s.feature}>
            <div className={`${s.wrap} ${s.featureGrid}`}>
              <div>
                <p className={s.eyebrow}>{f.label}</p>
                <h2 className={s.title}>{f.title}</h2>
                <p className={`${s.copy} mt-5`}>{f.text}</p>
                <ul>
                  {f.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <Image
                src={f.image}
                alt={`${f.label} : exemple dans RH Pilot`}
                width={1200}
                height={680}
                sizes="(max-width: 700px) 95vw, 60vw"
              />
            </div>
          </section>
        ))}
        <section id="demo" className={`${s.section} ${s.demo}`}>
          <div className={s.wrap}>
            <p className={s.eyebrow}>Démonstration guidée</p>
            <h2 className={s.title}>
              Suivez un parcours,
              <br />
              du début à la suite.
            </h2>
            <p className={`${s.copy} mb-8`}>
              Un exemple illustré, à parcourir à votre rythme. Les écrans
              présentent des données de démonstration.
            </p>
            <InteractiveDemo />
            <Link href="/services?demo=1" className={s.textLink}>
              Découvrir aussi l’expérience interactive →
            </Link>
          </div>
        </section>
        <section className={s.cta}>
          <div className={`${s.wrap} ${s.ctaInner}`}>
            <div>
              <h2 className={s.title}>
                Votre équipe.
                <br />
                Votre premier parcours.
              </h2>
              <p>Comparez les offres ou commencez à découvrir RH Pilot.</p>
            </div>
            <div className="flex flex-col gap-5">
              <Link href="/sign-up" className={s.primary}>
                Essayer gratuitement ↗
              </Link>
              <Link
                href="/tarifs"
                className="text-center text-sm underline underline-offset-4"
              >
                Consulter les tarifs
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
