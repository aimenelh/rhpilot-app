import { Quote } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const FEATURED = {
  quote:
    "Ce qui demande le plus de vigilance, c'est le suivi des périodes d'essai : les délais de prévenance, les entretiens à organiser, les décisions à formaliser, et les absences qui peuvent la prolonger. Il faut vérifier régulièrement les échéances pour ne rien oublier.",
  role: "Responsable RH",
};

const SUPPORTING = [
  {
    quote: "Les échéances liées à la paie, chaque fin de mois, mettent les équipes RH sous tension.",
    role: "Chargée RH en alternance",
    accent: "bg-brand-violet",
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
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-14">
        {/* Citation vedette */}
        <Reveal variant="left" className="lg:col-span-3">
          <div className="relative">
            <Quote
              size={120}
              className="pointer-events-none absolute -left-4 -top-6 text-brand-blue/[0.06]"
              aria-hidden
              strokeWidth={1}
            />
            <p className="relative text-xl font-medium leading-relaxed text-ink sm:text-2xl">
              {FEATURED.quote}
            </p>
            <p className="relative mt-5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              {FEATURED.role}
            </p>
          </div>
        </Reveal>

        {/* Colonne de soutien */}
        <div className="flex flex-col divide-y divide-surface-border lg:col-span-2">
          {SUPPORTING.map((item, index) => (
            <Reveal key={item.quote} variant="right" delay={120 + index * 100}>
              <div className="py-4 first:pt-0">
                <div className="flex items-start gap-2.5">
                  <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.accent}`} />
                  <p className="text-sm leading-relaxed text-ink-soft">{item.quote}</p>
                </div>
                <p className="mt-1.5 pl-4 text-xs font-medium text-ink-faint">{item.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Conclusion — bande pleine largeur, se détache nettement du reste */}
      <Reveal variant="scale" delay={500}>
        <div className="mt-12 rounded-2xl bg-ink px-8 py-8 text-center sm:px-14">
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
