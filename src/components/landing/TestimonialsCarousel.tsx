import { Quote } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const FEATURED = {
  quote: "Les échéances liées à la paie, chaque fin de mois, mettent les équipes RH sous tension.",
  role: "Chargée RH en alternance",
};

const SUPPORTING = [
  {
    quote:
      "Ce qui demande le plus de vigilance, c'est le suivi des périodes d'essai : les délais de prévenance, les entretiens à organiser, les décisions à formaliser, et les absences qui peuvent la prolonger. Il faut vérifier régulièrement les échéances pour ne rien oublier.",
    role: "Responsable RH",
    accent: "bg-brand-primary",
  },
  {
    quote:
      "Le suivi des échéances RH (contrats, visites médicales, entretiens obligatoires) demande beaucoup de rigueur. Un oubli peut vite avoir des conséquences.",
    role: "Gestionnaire RH",
    accent: "bg-accent-teal",
  },
  {
    quote:
      "Il manquait parfois un simple rappel : une visite médicale, une pièce d'identité arrivée à expiration, ou un bon suivi après le recrutement.",
    role: "Assistant RH",
    accent: "bg-accent-amber",
  },
  {
    quote: "Certaines entreprises en auraient bien besoin...",
    role: "Assistante RH",
    accent: "bg-accent-rose",
  },
];

export function TestimonialsCarousel() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-16">
        {/* Citation vedette — courte et percutante, jamais un pavé */}
        <Reveal variant="left" className="lg:col-span-3">
          <div className="relative flex h-full flex-col justify-center py-6">
            <Quote
              size={140}
              className="pointer-events-none absolute -left-6 -top-10 text-brand-primary/[0.05]"
              aria-hidden
              strokeWidth={1}
            />
            <p className="relative text-2xl font-medium leading-snug text-ink sm:text-3xl">
              {FEATURED.quote}
            </p>
            <p className="relative mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              {FEATURED.role}
            </p>
          </div>
        </Reveal>

        {/* Colonne de soutien — compacte, texte réduit, beaucoup d'espace entre chaque voix */}
        <div className="flex flex-col divide-y divide-surface-border lg:col-span-2">
          {SUPPORTING.map((item, index) => (
            <Reveal key={item.quote} variant="right" delay={120 + index * 100}>
              <div className="py-5 first:pt-0">
                <div className="flex items-start gap-2.5">
                  <span aria-hidden className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.accent}`} />
                  <p className="text-[13px] leading-relaxed text-ink-soft">{item.quote}</p>
                </div>
                <p className="mt-1.5 pl-4 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  {item.role}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Conclusion — bande pleine largeur, se détache nettement du reste */}
      <Reveal variant="scale" delay={500}>
        <div className="mt-14 rounded-2xl bg-ink px-8 py-8 text-center sm:px-14">
          <p className="text-base leading-relaxed text-white/85 sm:text-lg">
            Un constat revenait systématiquement : ce n&apos;est pas un manque
            d&apos;informations, mais un manque de temps, d&apos;anticipation et de rappels.
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            C&apos;est précisément de ce constat qu&apos;est né RH Pilot.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
