"use client";

import { useEffect, useRef, useState } from "react";

const STOPS = [
  { title: "Professionnels RH", meta: "interrogés sur le terrain" },
  { title: "Besoins remontés", meta: "oublis, rappels, responsabilités" },
  { title: "RH Pilot", meta: "transforme ces besoins en fonctionnalités", accent: true },
];

export function ObservatoryFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    if (mql.matches) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto flex max-w-xs flex-col items-center gap-8 py-2">
      <style>{`
        @keyframes observatoryPulse {
          0% { top: 0%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      <div
        aria-hidden
        className="absolute bottom-4 left-1/2 top-4 w-px origin-top -translate-x-1/2 bg-gradient-to-b from-brand-blue/10 via-brand-blue/35 to-brand-violet/20 transition-transform duration-[1400ms] ease-out"
        style={{ transform: visible ? "scaleY(1)" : "scaleY(0)" }}
      />
      {visible && !reducedMotion && (
        <span
          aria-hidden
          className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-blue shadow-[0_0_8px_2px_rgba(46,111,242,0.5)]"
          style={{ animation: "observatoryPulse 4s ease-in-out infinite", animationDelay: "1.4s" }}
        />
      )}

      {STOPS.map((stop, i) => (
        <div
          key={stop.title}
          className="relative z-10 flex flex-col items-center gap-1 text-center transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.94)",
            transitionDelay: visible ? `${i * 220}ms` : "0ms",
          }}
        >
          <span className={`text-sm font-medium ${stop.accent ? "font-semibold text-brand-blue" : "text-ink"}`}>
            {stop.title}
          </span>
          <span className="text-xs text-ink-faint">{stop.meta}</span>
        </div>
      ))}
    </div>
  );
}
