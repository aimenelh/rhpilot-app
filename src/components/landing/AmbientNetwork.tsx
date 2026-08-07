"use client";

import { useEffect, useRef, useState } from "react";

// Positions fixes (pas de Math.random) pour éviter tout écart entre le
// rendu serveur et le rendu client — un réseau statique mais qui a l'air
// organique, pas parfaitement grillagé.
const DOTS = [
  { x: 80, y: 60, r: 2.2, tone: "text-brand-blue", o: 0.35 },
  { x: 240, y: 140, r: 1.6, tone: "text-brand-violet", o: 0.3 },
  { x: 150, y: 260, r: 1.8, tone: "text-brand-blue", o: 0.25 },
  { x: 380, y: 90, r: 2, tone: "text-accent-teal", o: 0.3 },
  { x: 430, y: 240, r: 1.6, tone: "text-brand-violet", o: 0.25 },
  { x: 60, y: 400, r: 1.8, tone: "text-brand-blue", o: 0.3 },
  { x: 260, y: 380, r: 2.2, tone: "text-brand-blue", o: 0.3 },
  { x: 560, y: 180, r: 1.6, tone: "text-accent-teal", o: 0.25 },
  { x: 650, y: 60, r: 1.8, tone: "text-brand-violet", o: 0.3 },
  { x: 720, y: 300, r: 2, tone: "text-brand-blue", o: 0.28 },
  { x: 480, y: 420, r: 1.6, tone: "text-brand-violet", o: 0.25 },
  { x: 900, y: 140, r: 2, tone: "text-brand-blue", o: 0.3 },
  { x: 980, y: 320, r: 1.8, tone: "text-accent-teal", o: 0.28 },
  { x: 850, y: 400, r: 1.6, tone: "text-brand-violet", o: 0.25 },
  { x: 1120, y: 80, r: 2.2, tone: "text-brand-blue", o: 0.32 },
  { x: 1180, y: 260, r: 1.8, tone: "text-brand-violet", o: 0.28 },
  { x: 1050, y: 460, r: 1.6, tone: "text-brand-blue", o: 0.24 },
  { x: 1320, y: 160, r: 2, tone: "text-accent-teal", o: 0.3 },
  { x: 1400, y: 380, r: 1.8, tone: "text-brand-blue", o: 0.28 },
  { x: 1250, y: 440, r: 1.6, tone: "text-brand-violet", o: 0.24 },
  { x: 1500, y: 100, r: 2, tone: "text-brand-blue", o: 0.3 },
  { x: 1540, y: 300, r: 1.6, tone: "text-brand-violet", o: 0.26 },
  { x: 200, y: 620, r: 1.8, tone: "text-brand-blue", o: 0.24 },
  { x: 420, y: 680, r: 1.6, tone: "text-accent-teal", o: 0.22 },
  { x: 700, y: 630, r: 2, tone: "text-brand-violet", o: 0.26 },
  { x: 950, y: 700, r: 1.6, tone: "text-brand-blue", o: 0.22 },
  { x: 1200, y: 650, r: 1.8, tone: "text-brand-violet", o: 0.24 },
  { x: 1450, y: 720, r: 1.6, tone: "text-accent-teal", o: 0.22 },
];

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 3], [1, 2], [2, 5], [3, 4], [4, 7], [3, 8], [7, 9], [8, 11],
  [9, 12], [9, 10], [11, 12], [12, 13], [11, 14], [14, 15], [12, 16],
  [15, 17], [17, 18], [15, 19], [17, 20], [18, 21], [20, 21],
  [5, 6], [6, 10], [22, 23], [23, 24], [24, 25], [25, 26], [26, 27],
  [6, 22], [10, 24],
];

// Un sous-ensemble seulement — une pulsation sur chaque connexion serait
// trop chargé, l'idée est "de temps en temps, une info circule quelque part".
const PULSE_CONNECTIONS: [number, number][] = [
  [1, 3], [8, 11], [9, 12], [15, 17], [12, 16], [6, 22], [23, 24],
];

export function AmbientNetwork() {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    if (mql.matches) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (parallaxRef.current) {
          parallaxRef.current.style.transform = `translateY(${window.scrollY * 0.035}px)`;
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-white">
      <style>{`
        @keyframes ambientDrift {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(-3%, 2%) scale(1.06); }
        }
        .ambient-gradient { animation: ambientDrift 28s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ambient-gradient { animation: none; }
        }
      `}</style>

      <div
        className="ambient-gradient absolute -inset-[10%]"
        style={{
          background:
            "radial-gradient(55% 45% at 18% 15%, rgba(46,111,242,0.05), transparent 60%), " +
            "radial-gradient(50% 45% at 85% 70%, rgba(123,92,250,0.05), transparent 60%), " +
            "radial-gradient(40% 35% at 50% 95%, rgba(20,201,176,0.04), transparent 60%)",
        }}
      />

      <div ref={parallaxRef} className="absolute inset-0" style={{ willChange: "transform" }}>
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
        >
          {CONNECTIONS.map(([a, b], i) => (
            <line
              key={i}
              x1={DOTS[a].x}
              y1={DOTS[a].y}
              x2={DOTS[b].x}
              y2={DOTS[b].y}
              stroke="currentColor"
              className="text-brand-blue/[0.07]"
              strokeWidth="1"
            />
          ))}

          {DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} className={d.tone} fill="currentColor" opacity={d.o} />
          ))}

          {!reducedMotion &&
            PULSE_CONNECTIONS.map(([a, b], i) => {
              const id = `ambient-line-${i}`;
              return (
                <g key={i}>
                  <path
                    id={id}
                    d={`M${DOTS[a].x},${DOTS[a].y} L${DOTS[b].x},${DOTS[b].y}`}
                    fill="none"
                    stroke="none"
                  />
                  <circle r="2.6" className="text-brand-blue" fill="currentColor" opacity="0.65">
                    <animateMotion
                      dur={`${6.5 + i * 0.7}s`}
                      begin={`${i * 1.1}s`}
                      repeatCount="indefinite"
                    >
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}
        </svg>
      </div>
    </div>
  );
}
