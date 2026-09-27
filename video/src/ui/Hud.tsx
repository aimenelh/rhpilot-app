import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { inOut } from "../anim";
import { C, F } from "../theme";

// Repères fixes à l'écran : la date du jour et le mois qui avance.
// Du lundi 28 septembre au vendredi 30 octobre : 33 jours.
export const MONTH_DAYS = 33;

export function Hud({ label, day, visible }: { label: string; day: number; visible: number }) {
  const frame = useCurrentFrame();
  void frame;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: visible }}>
      <div style={{ position: "absolute", left: 72, top: 60, fontFamily: F.sans, fontSize: 22, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.inkFaint }}>
        {label}
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 48, display: "flex", gap: 6 }}>
        {Array.from({ length: MONTH_DAYS }, (_, i) => {
          const fill = interpolate(day - i, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
          return <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: C.line, overflow: "hidden" }}><div style={{ width: `${fill * 100}%`, height: "100%", background: C.coral }} /></div>;
        })}
      </div>
    </AbsoluteFill>
  );
}
