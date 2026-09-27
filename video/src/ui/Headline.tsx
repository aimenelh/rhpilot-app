import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { ease, prog } from "../anim";
import { C, F } from "../theme";

// Titre qui entre mot à mot : chaque mot monte d'un cran, passe du flou au net.
// Les mots entourés d'astérisques (*ainsi*) passent en italique corail.
export function Headline({
  text,
  from = 0,
  size = 96,
  stagger = 3,
  duration = 22,
  exitAt,
  align = "center",
  color = C.ink,
  accent = C.coral,
  serif = true,
  style,
}: {
  text: string;
  from?: number;
  size?: number;
  stagger?: number;
  duration?: number;
  exitAt?: number;
  align?: "left" | "center";
  color?: string;
  accent?: string;
  serif?: boolean;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const lines = text.split("\n");
  let index = 0;
  let accentOn = false;
  const out = exitAt === undefined ? 0 : prog(frame, exitAt, 14, ease);
  return (
    <div
      style={{
        fontFamily: serif ? F.serif : F.sans,
        fontSize: size,
        fontWeight: serif ? 400 : 600,
        lineHeight: 1.04,
        letterSpacing: serif ? "-0.035em" : "-0.04em",
        color,
        textAlign: align,
        opacity: 1 - out,
        transform: `translateY(${-out * 24}px)`,
        filter: out ? `blur(${out * 8}px)` : undefined,
        ...style,
      }}
    >
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} style={{ whiteSpace: "nowrap" }}>
          {line.split(" ").map((word, wordIndex) => {
            const t = prog(frame, from + index++ * stagger, duration, ease);
            // Un passage entre astérisques peut couvrir plusieurs mots.
            if (word.startsWith("*")) accentOn = true;
            const isAccent = accentOn;
            if (word.replace(/[.,!?:;]+$/, "").endsWith("*")) accentOn = false;
            const clean = word.replace(/\*/g, "");
            const node: ReactNode = (
              <span
                key={wordIndex}
                style={{
                  display: "inline-block",
                  marginRight: "0.24em",
                  opacity: t,
                  transform: `translateY(${(1 - t) * 0.45}em)`,
                  filter: `blur(${(1 - t) * 12}px)`,
                  fontStyle: isAccent ? "italic" : undefined,
                  color: isAccent ? accent : undefined,
                }}
              >
                {clean}
              </span>
            );
            return node;
          })}
        </div>
      ))}
    </div>
  );
}

/** Petit libellé en capitales espacées, pour situer la scène (date, chapitre). */
export function Kicker({ children, opacity = 1, color = C.inkFaint }: { children: ReactNode; opacity?: number; color?: string }) {
  return (
    <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color, opacity }}>
      {children}
    </div>
  );
}
