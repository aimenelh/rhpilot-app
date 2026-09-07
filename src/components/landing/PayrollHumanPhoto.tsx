"use client";

import { usePathname } from "next/navigation";

const PHOTOS = [
  {
    match: "/production",
    src: "https://images.unsplash.com/photo-1758598304540-1ac6fd7d477b?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnelle travaillant sur un ordinateur dans un bureau",
    label: "La paie, au quotidien",
    detail: "Un outil pensé pour les personnes qui préparent, contrôlent et sécurisent la paie.",
  },
  {
    match: "/variables",
    src: "https://images.unsplash.com/photo-1758876021859-bd2371d8f0a2?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnelle travaillant sur un ordinateur dans un environnement de bureau",
    label: "Les équipes avant les écrans",
    detail: "Les variables restent un travail humain : RH Pilot les organise sans perdre le contexte.",
  },
  {
    match: "/conges-absences",
    src: "https://images.unsplash.com/photo-1758873269317-51888e824b28?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Équipe professionnelle échangeant autour d'une table",
    label: "Des situations réelles",
    detail: "Congés, absences et événements de paie partent toujours d'une situation salarié concrète.",
  },
  {
    match: "/arrets-travail",
    src: "https://images.unsplash.com/photo-1758876021772-2684360dfc97?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnelle concentrée devant son ordinateur",
    label: "Le contexte compte",
    detail: "Un arrêt de travail n'est jamais juste une ligne : il faut retrouver le bon contexte.",
  },
  {
    match: "/referentiel-conventionnel",
    src: "https://images.unsplash.com/photo-1758691737568-a1572060ce5a?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Équipe professionnelle réunie dans un espace de travail",
    label: "Les bonnes règles au bon moment",
    detail: "Le référentiel conventionnel accompagne le travail des équipes plutôt que de le remplacer.",
  },
  {
    match: "/complementaire-sante",
    src: "https://images.unsplash.com/photo-1758598304540-1ac6fd7d477b?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnelle travaillant sur un ordinateur dans un bureau lumineux",
    label: "Prendre soin du cadre salarié",
    detail: "La complémentaire santé fait partie des paramètres concrets qui donnent du sens au calcul.",
  },
  {
    match: "/cotisations-sociales",
    src: "https://images.unsplash.com/photo-1758873269317-51888e824b28?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Équipe professionnelle en réunion dans un bureau",
    label: "Comprendre ce qui compose la paie",
    detail: "Les cotisations deviennent lisibles quand on rattache les chiffres à un véritable bulletin.",
  },
  {
    match: "/montant-net-social",
    src: "https://images.unsplash.com/photo-1758691737568-a1572060ce5a?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnels réunis autour d'un ordinateur portable",
    label: "Le chiffre qui compte",
    detail: "Le montant net social est présenté comme un résultat de paie, pas comme un simple indicateur abstrait.",
  },
  {
    match: "/bulletin-de-paie",
    src: "https://images.unsplash.com/photo-1758598304540-1ac6fd7d477b?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnelle travaillant sur un ordinateur portable",
    label: "Du calcul au bulletin",
    detail: "Le document final reste le point de rencontre entre données, contrôle et travail RH.",
  },
  {
    match: "/tracabilite-calcul",
    src: "https://images.unsplash.com/photo-1758876021859-bd2371d8f0a2?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnelle travaillant dans un bureau avec des documents",
    label: "Pouvoir revenir sur ses calculs",
    detail: "La traçabilité est utile parce qu'elle sert de support aux équipes qui contrôlent réellement la paie.",
  },
  {
    match: "/profil-paie",
    src: "https://images.unsplash.com/photo-1758876021772-2684360dfc97?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Professionnelle concentrée sur son ordinateur dans un bureau",
    label: "Chaque salarié a son histoire",
    detail: "Le profil de paie rassemble les informations qui rendent le calcul cohérent avec la personne.",
  },
  {
    match: "/contexte-employeur",
    src: "https://images.unsplash.com/photo-1758873269317-51888e824b28?auto=format&fit=crop&fm=jpg&q=82&w=2200",
    alt: "Équipe professionnelle échangeant dans un bureau",
    label: "L'entreprise compte aussi",
    detail: "Le calcul social tient compte de l'environnement dans lequel le salarié travaille.",
  },
];

const DEFAULT_PHOTO = {
  src: "https://images.unsplash.com/photo-1758873269317-51888e824b28?auto=format&fit=crop&fm=jpg&q=82&w=2200",
  alt: "Équipe professionnelle échangeant dans un bureau",
  label: "La paie reste un métier humain",
  detail: "RH Pilot apporte une technologie rigoureuse sans effacer le travail des équipes RH.",
};

export function PayrollHumanPhoto() {
  const pathname = usePathname() ?? "";
  const photo = PHOTOS.find((item) => pathname.includes(item.match)) ?? DEFAULT_PHOTO;

  return (
    <section className="border-b border-surface-border bg-[#14151A]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative h-[250px] overflow-hidden sm:h-[310px] lg:h-[340px]">
          <img
            src={photo.src}
            alt={photo.alt}
            className="h-full w-full object-cover object-center saturate-[0.72] contrast-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14151A]/90 via-[#14151A]/35 to-[#E8432E]/20" />
          <div className="absolute inset-0 bg-[#E8432E]/10 mix-blend-multiply" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-2xl p-7 sm:p-10 lg:p-12">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur-sm">
                {photo.label}
              </span>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
                {photo.detail}
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/3 bg-gradient-to-l from-[#E8432E]/25 to-transparent lg:block" />
        </div>
      </div>
    </section>
  );
}
