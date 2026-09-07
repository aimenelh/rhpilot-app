"use client";

import { usePathname } from "next/navigation";

const PHOTOS = [
  {
    matches: ["/production", "/bulletin-de-paie", "/montant-net-social"],
    src: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&fm=jpg&q=84&w=1800",
    alt: "Professionnelle travaillant avec un ordinateur dans un bureau",
    label: "Le travail RH, en vrai",
    detail: "Une présence humaine au milieu des outils : RH Pilot accompagne les personnes qui préparent et contrôlent la paie.",
    source: "Unsplash · LinkedIn Sales Solutions",
    href: "https://unsplash.com/photos/woman-in-orange-long-sleeve-shirt-sitting-beside-table-with-macbook-pro-QgYvORVDdd8",
    position: "center",
  },
  {
    matches: ["/variables", "/profil-paie", "/tracabilite-calcul"],
    src: "https://images.unsplash.com/photo-1677078610152-8a627d8ced8d?auto=format&fit=crop&fm=jpg&q=84&w=1800",
    alt: "Équipe professionnelle travaillant autour d'une table dans une salle orange",
    label: "Des équipes, pas des abstractions",
    detail: "Les données de paie sont toujours liées à des situations, des échanges et des décisions humaines.",
    source: "Unsplash · Paymo",
    href: "https://unsplash.com/photos/a-group-of-people-sitting-around-a-table-with-laptops-gY430v3SD6c",
    position: "center",
  },
  {
    matches: ["/conges-absences", "/referentiel-conventionnel", "/contexte-employeur"],
    src: "https://images.unsplash.com/photo-1677078610588-aed2834ad968?auto=format&fit=crop&fm=jpg&q=84&w=1800",
    alt: "Équipe réunie pour travailler dans un bureau à la décoration orange",
    label: "Le contexte autour du calcul",
    detail: "Convention, période, entreprise, salarié : la paie prend son sens quand on regarde l'ensemble du contexte.",
    source: "Unsplash · Paymo",
    href: "https://unsplash.com/photos/a-group-of-people-sitting-around-a-table-in-a-room-nl_BzA2z6LE",
    position: "center",
  },
  {
    matches: ["/arrets-travail", "/complementaire-sante", "/cotisations-sociales"],
    src: "https://images.unsplash.com/photo-1737729991003-521d47240eb3?auto=format&fit=crop&fm=jpg&q=84&w=1800",
    alt: "Professionnel travaillant sur un ordinateur dans un espace de travail lumineux",
    label: "Une paie qui reste humaine",
    detail: "L'écran n'efface pas le métier : il donne aux équipes un cadre plus lisible pour travailler et vérifier.",
    source: "Unsplash · litoon dev",
    href: "https://unsplash.com/photos/a-man-sitting-in-front-of-a-laptop-computer-NOZETh4j2FE",
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
        <div className="grid overflow-hidden border border-surface-border lg:grid-cols-[1.15fr_.85fr]">
          <div className="relative min-h-[280px] bg-surface-subtle sm:min-h-[380px] lg:min-h-[420px]">
            <img
              src={photo.src}
              alt={photo.alt}
              className="h-full w-full object-cover"
              style={{ objectPosition: photo.position }}
              loading="eager"
            />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-4 bg-[#14151A]/92 px-5 py-4 text-white sm:px-6">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">{photo.label}</span>
              <span className="hidden text-[11px] text-white/45 sm:block">{photo.source}</span>
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
            <a
              href={photo.href}
              target="_blank"
              rel="noreferrer"
              className="mt-10 inline-flex w-fit items-center gap-2 text-xs font-medium text-ink-soft transition-colors hover:text-[#E8432E]"
            >
              Voir la photo sur Unsplash
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
