"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Ce qui demande le plus de vigilance, c'est le suivi des périodes d'essai — les délais de prévenance, les entretiens à organiser, les décisions à formaliser, et les absences qui peuvent la prolonger. Il faut vérifier régulièrement les échéances pour ne rien oublier.",
    role: "Professionnelle RH, anonymisé",
  },
  {
    quote: "Les échéances liées à la paie, chaque fin de mois, mettent les équipes RH sous tension.",
    role: "Chargée RH en alternance, anonymisé",
  },
  {
    quote:
      "Le suivi des échéances RH — contrats, visites médicales, entretiens obligatoires — demande beaucoup de rigueur. Un oubli peut vite avoir des conséquences.",
    role: "Professionnelle RH, anonymisé",
  },
  {
    quote:
      "Il manquait parfois un simple rappel : une visite médicale, une pièce d'identité arrivée à expiration, ou un bon suivi après le recrutement.",
    role: "Professionnelle RH, anonymisé",
  },
];

export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const isConclusion = index === TESTIMONIALS.length;
  const total = TESTIMONIALS.length + 1; // +1 pour la carte de conclusion

  function goTo(newIndex: number) {
    setIndex((newIndex + total) % total);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="min-h-[220px] rounded-2xl border border-surface-border bg-white p-8 shadow-sm sm:p-10">
        {isConclusion ? (
          <div className="text-center">
            <p className="text-base leading-relaxed text-ink">
              Un constat revenait systématiquement — moins un manque d&apos;informations qu&apos;un
              manque de temps, d&apos;anticipation et de rappels.
            </p>
            <p className="mt-3 text-sm font-medium text-brand-blue">
              C&apos;est précisément de ce constat qu&apos;est né RH Pilot.
            </p>
          </div>
        ) : (
          <div>
            <Quote size={20} className="text-brand-blue/40" aria-hidden />
            <p className="mt-3 text-base leading-relaxed text-ink">
              {TESTIMONIALS[index].quote}
            </p>
            <p className="mt-4 text-sm font-medium text-ink-soft">{TESTIMONIALS[index].role}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Témoignage précédent"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-ink-faint transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Aller au témoignage ${i + 1}`}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index ? "bg-brand-blue" : "bg-surface-border hover:bg-ink-faint"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Témoignage suivant"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-ink-faint transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
