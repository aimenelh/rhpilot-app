import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

// Fond de papier : crème, grain léger et vignette douce.
export function Paper({ children, tone = C.paper }: { children?: ReactNode; tone?: string }) {
  return (
    <AbsoluteFill style={{ background: tone }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(120% 90% at 50% 45%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%, rgba(120,90,60,0.08) 100%)",
        }}
      />
      <AbsoluteFill style={{ opacity: 0.35, mixBlendMode: "multiply", backgroundImage: GRAIN }} />
      {children}
    </AbsoluteFill>
  );
}

// Grain de papier en SVG (bruit fractal), sans fichier externe.
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.22 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

/** Carte d'interface RH Pilot : blanche, fine bordure, ombre douce. */
export function Card({ children, width, style }: { children: ReactNode; width?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width,
        background: C.white,
        border: `1px solid ${C.line}`,
        borderRadius: 22,
        boxShadow: "0 40px 90px -40px rgba(60,40,25,0.35), 0 2px 6px rgba(60,40,25,0.05)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
