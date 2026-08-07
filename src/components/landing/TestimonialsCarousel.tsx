"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Ce qui demande le plus de vigilance, c'est le suivi des périodes d'essai : les délais de prévenance, les entretiens à organiser, les décisions à formaliser, et les absences qui peuvent la prolonger. Il faut vérifier régulièrement les échéances pour ne rien oublier.",
    role: "Responsable RH.",
  },
  {
    quote: "Les échéances liées à la paie, chaque fin de mois, mettent les équipes RH sous tension.",
    role: "Chargée RH en alternance.",
  },
  {
    quote:
      "Le suivi des échéances RH (contrats, visites médicales, entretiens obligatoires) demande beaucoup de rigueur. Un oubli peut vite avoir des conséquences.",
    role: "Gestionnaire RH.",
  },
  {
    quote:
      "Il manquait parfois un simple rappel : une visite médicale, une pièce d'identité arrivée à expiration, ou un bon suivi après le recrutement.",
    role: "Assistant RH.",
  },
  {
    quote: "Certaines entreprises en auraient bien besoin...",
    role: "Assistante RH.",
  },
];

const ACCENTS = ["bg-brand-blue", "bg-brand-violet", "bg-accent-teal", "bg-accent-amber", "bg-brand-blue"];
const AUTOPLAY_MS = 6000;

export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isConclusion = index === TESTIMONIALS.length;
  const total = TESTIMONIALS.length + 1; // +1 pour la carte de conclusion

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, total]);

  function goTo(newIndex: number) {
    const wrapped = (newIndex + total) % total;
    setDirection(wrapped > index || (index === total - 1 && wrapped === 0) ? 1 : -1);
    setIndex(wrapped);
  }

  return (
    <div
      className="mx-auto max-w-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes testimonialInRight { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes testimonialInLeft { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes testimonialProgress { from { width: 0%; } to { width: 100%; } }
        .testimonial-in-right { animation: testimonialInRight 0.5s ease-out both; }
        .testimonial-in-left { animation: testimonialInLeft 0.5s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .testimonial-in-right, .testimonial-in-left { animation: none; }
        }
      `}</style>

      <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-surface-border bg-white/80 p-8 shadow-sm backdrop-blur-md sm:p-10">
        <div
          key={index}
          aria-live="polite"
          className={direction === 1 ? "testimonial-in-right" : "testimonial-in-left"}
        >
          {isConclusion ? (
            <div className="text-center">
              <p className="text-base leading-relaxed text-ink">
                Un constat revenait systématiquement : ce n&apos;est pas un manque
                d&apos;informations, mais un manque de temps, d&apos;anticipation et de
                rappels.
              </p>
              <p className="mt-3 text-sm font-medium text-brand-blue">
                C&apos;est précisément de ce constat qu&apos;est né RH Pilot.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <Quote size={20} className="text-brand-blue/40" aria-hidden />
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${ACCENTS[index % ACCENTS.length]}`}
                />
              </div>
              <p className="mt-3 text-base leading-relaxed text-ink">{TESTIMONIALS[index].quote}</p>
              <p className="mt-4 text-sm font-medium text-ink-soft">{TESTIMONIALS[index].role}</p>
            </div>
          )}
        </div>
      </div>

      {!reducedMotion && (
        <div className="mx-auto mt-3 h-0.5 w-full max-w-[220px] overflow-hidden rounded-full bg-surface-border">
          <div
            key={`${index}-${paused}`}
            className="h-full rounded-full bg-brand-blue"
            style={{ animation: paused ? "none" : `testimonialProgress ${AUTOPLAY_MS}ms linear` }}
          />
        </div>
      )}

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
              onClick={() => goTo(i)}
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
