"use client";

import { ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";

const PHOTOS = [
  {
    matches: ["/production", "/bulletin-de-paie", "/montant-net-social", "/complementaire-sante"],
    src: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
    alt: "Professionnelle en tenue corail travaillant dans un bureau avec un ordinateur portable",
    label: "Le travail RH, en vrai",
    detail: "Une présence humaine au milieu des outils : RH Pilot accompagne les personnes qui préparent et contrôlent la paie.",
    credit: "LinkedIn Sales Solutions",
    href: "https://unsplash.com/photos/woman-in-orange-long-sleeve-shirt-sitting-beside-table-with-macbook-pro-QgYvORVDdd8?utm_source=rh_pilot&utm_medium=referral",
    position: "center",
  },
  {
    matches: ["/variables", "/profil-paie", "/tracabilite-calcul", "/contexte-employeur"],
    src: "https://images.unsplash.com/photo-1758518730327-98070967caab?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
    alt: "Professionnels réunis autour d'un document dans un bureau moderne",
    label: "Des équipes, pas des abstractions",
    detail: "Les données de paie sont toujours liées à des situations, des échanges et des décisions humaines.",
    credit: "Vitaly Gariev",
    href: "https://unsplash.com/photos/woman-in-suit-shows-document-to-man-2AOIg7Qvu8w?utm_source=rh_pilot&utm_medium=referral",
    position: "center",
  },
  {
    matches: ["/conges-absences", "/referentiel-conventionnel", "/arrets-travail", "/cotisations-sociales"],
    src: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
    alt: "Professionnelle en tenue corail travaillant dans un bureau avec un ordinateur portable",
    label: "Le contexte autour du calcul",
    detail: "Convention, période, entreprise, salarié : la paie prend son sens quand on regarde l'ensemble du contexte.",
    credit: "LinkedIn Sales Solutions",
    href: "https://unsplash.com/photos/woman-in-orange-long-sleeve-shirt-sitting-beside-table-with-macbook-pro-QgYvORVDdd8?utm_source=rh_pilot&utm_medium=referral",
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

          <figcaption className="mt-3 flex flex-col gap-1.5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
            <span>Photo par {photo.credit} sur Unsplash</span>
            <a
              href={photo.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-ink-soft transition-colors hover:text-brand-primary"
            >
              Voir la photo sur Unsplash
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
