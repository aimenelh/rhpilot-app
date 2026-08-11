"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "up" | "scale" | "left" | "right" | "bounce";

const VARIANT_STYLES: Record<Variant, { hidden: string; easing: string }> = {
  up: { hidden: "translate-y-6 opacity-0", easing: "cubic-bezier(0.16,1,0.3,1)" },
  scale: { hidden: "scale-90 opacity-0", easing: "cubic-bezier(0.16,1,0.3,1)" },
  left: { hidden: "-translate-x-12 opacity-0", easing: "cubic-bezier(0.16,1,0.3,1)" },
  right: { hidden: "translate-x-12 opacity-0", easing: "cubic-bezier(0.16,1,0.3,1)" },
  bounce: { hidden: "scale-75 opacity-0", easing: "cubic-bezier(0.34,1.56,0.64,1)" },
};

export function Reveal({
  children,
  delay = 0,
  className = "",
  variant = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  variant?: Variant;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Respecte la préférence système "mouvement réduit" — apparition
    // immédiate, sans animation, pour qui l'a activée.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // une seule apparition, pas à chaque scroll
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { hidden, easing } = VARIANT_STYLES[variant];

  return (
    <div
      ref={ref}
      style={{ transitionDelay: isVisible ? `${delay}ms` : "0ms", transitionTimingFunction: easing }}
      className={`transition-all duration-700 ${className} ${
        isVisible ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden
      }`}
    >
      {children}
    </div>
  );
}
