import { Quote } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const TESTIMONIALS = [
  {
    quote:
      "Ce qui demande le plus de vigilance, c'est le suivi des périodes d'essai : les délais de prévenance, les entretiens à organiser, les décisions à formaliser, et les absences qui peuvent la prolonger. Il faut vérifier régulièrement les échéances pour ne rien oublier.",
    role: "Responsable RH.",
    rotate: "-rotate-1",
  },
  {
    quote: "Les échéances liées à la paie, chaque fin de mois, mettent les équipes RH sous tension.",
    role: "Chargée RH en alternance.",
    rotate: "rotate-1",
  },
  {
    quote:
      "Le suivi des échéances RH (contrats, visites médicales, entretiens obligatoires) demande beaucoup de rigueur. Un oubli peut vite avoir des conséquences.",
    role: "Gestionnaire RH.",
    rotate: "rotate-1",
  },
  {
    quote:
      "Il manquait parfois un simple rappel : une visite médicale, une pièce d'identité arrivée à expiration, ou un bon suivi après le recrutement.",
    role: "Assistant RH.",
    rotate: "-rotate-1",
  },
  {
    quote: "Certaines entreprises en auraient bien besoin...",
    role: "Assistante RH.",
    rotate: "rotate-2",
  },
];

const ACCENTS = ["bg-brand-blue", "bg-brand-violet", "bg-accent-teal", "bg-accent-amber", "bg-brand-blue"];

export function TestimonialsCarousel() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((item, index) => (
          <Reveal key={item.quote} variant="bounce" delay={(index % 3) * 100 + Math.floor(index / 3) * 120}>
            <div
              className={`h-full rounded-2xl border border-surface-border bg-white p-6 shadow-sm transition-transform duration-300 hover:rotate-0 hover:shadow-md ${item.rotate}`}
            >
              <div className="flex items-center gap-2">
                <Quote size={22} className="text-brand-blue/30" aria-hidden />
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${ACCENTS[index % ACCENTS.length]}`} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">{item.quote}</p>
              <p className="mt-4 text-sm font-medium text-ink-soft">{item.role}</p>
            </div>
          </Reveal>
        ))}

        {/* La carte de conclusion — pas inclinée, pas une citation comme
            les autres, mérite de se détacher plutôt que de se fondre
            dans la grille. */}
        <Reveal variant="scale" delay={420}>
          <div className="flex h-full flex-col justify-center rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-6 text-center">
            <p className="text-sm leading-relaxed text-ink">
              Un constat revenait systématiquement : ce n&apos;est pas un manque
              d&apos;informations, mais un manque de temps, d&apos;anticipation et de rappels.
            </p>
            <p className="mt-3 text-sm font-semibold text-brand-blue">
              C&apos;est précisément de ce constat qu&apos;est né RH Pilot.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
