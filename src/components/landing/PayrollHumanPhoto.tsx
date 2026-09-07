"use client";

import { usePathname } from "next/navigation";

const PHOTOS = [
  {
    matches: ["/production"],
    src: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Professionnelle en tenue corail travaillant dans un bureau avec un ordinateur portable",
    label: "Produire la paie, au quotidien",
    detail: "Une production de paie fiable reste un travail humain : contrôler, arbitrer, puis valider chaque période.",
    position: "center",
  },
  {
    matches: ["/variables"],
    src: "https://images.unsplash.com/photo-1573878586940-330328d3cbeb?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Professionnelle travaillant sur un ordinateur dans un bureau lumineux",
    label: "Les variables font la différence",
    detail: "Primes, absences, avantages ou changements : chaque variable modifie la paie et mérite son propre contrôle.",
    position: "center",
  },
  {
    matches: ["/conges-absences"],
    src: "https://images.unsplash.com/photo-1530971013997-e06bb52a2372?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Deux personnes travaillant autour d'une table avec des documents et un ordinateur",
    label: "Le contexte salarié",
    detail: "Une absence n'est jamais une simple ligne : son origine, sa période et son traitement doivent être compris avant le calcul.",
    position: "center",
  },
  {
    matches: ["/arrets-travail"],
    src: "https://images.unsplash.com/photo-1758520144417-e1c432042dec?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Professionnelle assise dans un bureau avec un document entre les mains",
    label: "Une situation à traiter avec précision",
    detail: "Les arrêts de travail demandent une lecture attentive du dossier, de la période et du traitement applicable.",
    position: "center",
  },
  {
    matches: ["/referentiel-conventionnel"],
    src: "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Main tenant un stylo au-dessus d'un document professionnel",
    label: "Le cadre avant le calcul",
    detail: "Convention collective, statut et règles applicables donnent le cadre dans lequel chaque bulletin doit être construit.",
    position: "center",
  },
  {
    matches: ["/complementaire-sante"],
    src: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Équipe réunie autour d'une table en réunion",
    label: "La protection sociale, côté humain",
    detail: "La complémentaire santé traduit une règle collective en éléments concrets qui apparaissent sur la paie du salarié.",
    position: "center",
  },
  {
    matches: ["/cotisations-sociales"],
    src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Professionnels échangeant autour d'une table dans un bureau",
    label: "Comprendre ce qui finance quoi",
    detail: "Les cotisations sociales prennent leur sens quand on relie les montants calculés aux protections qu'elles financent.",
    position: "center",
  },
  {
    matches: ["/montant-net-social"],
    src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Équipe en réunion dans un environnement de travail moderne",
    label: "Un montant lisible pour le salarié",
    detail: "Le montant net social est avant tout une information à expliquer clairement, sans perdre le lien avec le bulletin.",
    position: "center",
  },
  {
    matches: ["/bulletin-de-paie"],
    src: "https://images.unsplash.com/photo-1758873271949-742d6648b6b0?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Professionnelle travaillant sur un ordinateur dans un espace de travail partagé",
    label: "Le bulletin, résultat du travail",
    detail: "Un bulletin de paie rassemble une multitude de données qui doivent rester cohérentes, vérifiables et compréhensibles.",
    position: "center",
  },
  {
    matches: ["/tracabilite-calcul"],
    src: "https://images.unsplash.com/photo-1530971013997-e06bb52a2372?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Personne prenant des notes avec un ordinateur portable pendant une réunion",
    label: "Pouvoir expliquer le résultat",
    detail: "La traçabilité permet de revenir sur les données, les règles et les étapes qui ont conduit au montant final.",
    position: "center",
  },
  {
    matches: ["/profil-paie"],
    src: "https://images.unsplash.com/photo-1758876021772-2684360dfc97?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Professionnelle travaillant sur un ordinateur dans un bureau avec des notes de travail",
    label: "Un profil qui ressemble à la réalité",
    detail: "Chaque salarié a un contexte propre : contrat, statut, protection sociale, ancienneté et paramètres de paie.",
    position: "center",
  },
  {
    matches: ["/contexte-employeur"],
    src: "https://images.unsplash.com/photo-1770048532712-4fde5ef7eb90?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400",
    alt: "Professionnel travaillant seul dans une salle de réunion vitrée",
    label: "Le contexte employeur compte",
    detail: "Effectif, établissement, date de création et paramètres collectifs influencent directement la paie produite.",
    position: "center",
  },
];

const DEFAULT_PHOTO = PHOTOS[0];

export function PayrollHumanPhoto() {
  const pathname = usePathname() ?? "";
  const photo = PHOTOS.find((item) => item.matches.some((match) => pathname.includes(match))) ?? DEFAULT_PHOTO;

  return (
    <section className="border-b border-surface-border bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14 lg:py-16">
        <figure>
          <div className="grid overflow-hidden border border-surface-border lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative min-h-[280px] bg-surface-subtle sm:min-h-[380px] lg:min-h-[420px]">
              <img
                src={photo.src}
                alt={photo.alt}
                className="h-full w-full object-cover"
                style={{ objectPosition: photo.position }}
                loading="eager"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-[#14151A]/92 px-5 py-4 text-white sm:px-6">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">{photo.label}</span>
              </div>
            </div>

            <div className="relative flex flex-col justify-between bg-[#FCF7F5] p-7 sm:p-9 lg:p-10">
              <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-[#E8432E]" />
              <div>
                <span className="inline-flex border border-[#E8432E]/20 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E8432E]">
                  RH Pilot · le facteur humain
                </span>
                <p className="mt-7 max-w-md text-xl font-semibold leading-8 tracking-[-0.02em] text-ink sm:text-2xl sm:leading-9">
                  {photo.detail}
                </p>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
