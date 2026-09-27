import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, inOut, pop, prog, s } from "../anim";
import { LOGO_PATH } from "../ui/Brand";
import { Headline } from "../ui/Headline";
import { spline, Thread, track, type Pt } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// Final : le fil du mois dessine le contour du logo, qui se remplit.
const SIZE = 260;
const CX = W / 2;
const CY = 430;
const L = CX - SIZE / 2;
const T = CY - SIZE / 2;
const R = 64; // arrondi, même proportion que le logo (8/32)

// Le fil arrive de la gauche, puis fait le tour du carré arrondi.
function roundedSquare(): Pt[] {
  const pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= 8; k += 1) {
      const a = a0 + (k / 8) * (Math.PI / 2);
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
  };
  pts.push([L, CY]);
  corner(L + R, T + SIZE - R, Math.PI); // bas gauche
  corner(L + SIZE - R, T + SIZE - R, Math.PI / 2); // bas droit
  corner(L + SIZE - R, T + R, 0); // haut droit
  corner(L + R, T + R, -Math.PI / 2); // haut gauche
  pts.push([L, CY]);
  return pts;
}
const APPROACH = track(spline([[0, SEAM_Y], [300, SEAM_Y + 10], [600, 520], [L - 120, CY + 30], [L, CY]], 40));
const OUTLINE = track(roundedSquare());

export function S9Finale() {
  const f = useCurrentFrame();
  const approach = prog(f, 0, s(1.6), inOut);
  const outline = prog(f, s(1.5), s(1.4), inOut);
  const tailOut = prog(f, s(2.9), s(0.8), ease);
  const fill = prog(f, s(2.9), 12, ease);
  const glyph = pop(f, s(3.2));
  const word = prog(f, s(3.6), 18, ease);
  return (
    <AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Thread tr={APPROACH} draw={approach} from={tailOut} width={3.2} head={outline === 0} />
        <rect x={L} y={T} width={SIZE} height={SIZE} rx={R} fill={C.coral} opacity={fill} />
        <Thread tr={OUTLINE} draw={outline} width={4} glow head={outline < 1} opacity={1 - fill * 0.9} />
        <g transform={`translate(${L} ${T}) scale(${SIZE / 32})`} opacity={Math.min(1, glyph)}>
          <g transform={`translate(16 16) scale(${0.6 + 0.4 * Math.min(1, glyph)}) translate(-16 -16)`}>
            <path d={LOGO_PATH} fill="#fff" />
          </g>
        </g>
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + SIZE / 2 + 50, textAlign: "center", opacity: word, transform: `translateY(${(1 - word) * 20}px)` }}>
        <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 88, letterSpacing: "-0.035em", color: C.ink }}>
          RH <span style={{ color: C.coral }}>Pilot</span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + SIZE / 2 + 170, display: "flex", justifyContent: "center" }}>
        <Headline text={"Vous gardez *le fil.*"} from={s(4.3)} size={64} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + SIZE / 2 + 280, textAlign: "center", fontFamily: F.sans, fontSize: 28, color: C.inkSoft, opacity: prog(f, s(5.6), 20) }}>
        Suivi RH, paie et espace salarié · Gratuit jusqu&apos;à 3 salariés · <span style={{ color: C.ink, fontWeight: 600 }}>rhpilot.fr</span>
      </div>
    </AbsoluteFill>
  );
}
