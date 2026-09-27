import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease, inOut, mix, pop, prog, s } from "../anim";
import { Headline } from "../ui/Headline";
import { spline, Thread, track, type Pt } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// Le nœud : les échéances oubliées emmêlent le fil. Puis RH Pilot tire, et
// le nœud se défait en une ligne droite.

// Même nombre de points dans les deux formes : on passe de l'une à l'autre.
const KNOT: Pt[] = [
  [0, SEAM_Y], [420, 560], [760, 600], [980, 470], [880, 360], [760, 470], [960, 640], [1180, 610],
  [1120, 430], [940, 520], [1080, 700], [1300, 560], [1180, 420], [1020, 610], [1280, 690], [1560, 560], [W, SEAM_Y],
];
const STRAIGHT: Pt[] = KNOT.map((_, i) => [(i / (KNOT.length - 1)) * W, SEAM_Y]);

const NOTES = [
  { text: "DPAE de Sofia ?", x: 520, y: 330, r: -7, at: 0.9 },
  { text: "Visite médicale Tom… quand ?", x: 1360, y: 330, r: 5, at: 1.25 },
  { text: "Fin d'essai Karim ??", x: 1420, y: 770, r: -4, at: 1.6 },
  { text: "Bulletins d'octobre", x: 470, y: 780, r: 6, at: 1.95 },
  { text: "Mutuelle : dispense ?", x: 880, y: 860, r: -3, at: 2.3 },
];

export function S2Knot() {
  const f = useCurrentFrame();
  const pull = prog(f, s(4.6), s(1.5), inOut);
  // Une fois tendu, le fil vibre et se calme (corde pincée).
  const since = f - s(6.1);
  const twang = since > 0 ? Math.sin(since * 0.9) * Math.exp(-since / 9) * 26 : 0;
  const pts = KNOT.map((p, i) => {
    const envelope = Math.sin((i / (KNOT.length - 1)) * Math.PI);
    return [mix(p[0], STRAIGHT[i][0], pull), mix(p[1], STRAIGHT[i][1], pull) + twang * envelope] as Pt;
  });
  const tr = track(spline(pts, 30));
  const draw = interpolate(f, [0, s(2.6)], [0.18, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const shake = (1 - pull) * prog(f, s(2.6), s(1.6)) * Math.sin(f * 1.7) * 2.2;
  const scatter = prog(f, s(4.4), s(0.9), inOut);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 96 }}>
        <Headline text={"Et d'ici là, tout repose *sur vous.*"} from={s(0.2)} size={78} exitAt={s(4.2)} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 96 }}>
        <Headline text={"RH Pilot *tire le fil.*"} from={s(5.0)} size={78} />
      </AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
        <Thread tr={tr} draw={draw} width={3.2 + 2.4 * Math.max(0, 1 - Math.abs(since) / 10)} head={pull < 0.02 && draw < 1} />
      </svg>
      {NOTES.map((note, i) => {
        const inT = pop(f, s(note.at));
        const dx = (note.x - 960) * 0.9 * scatter;
        const dy = (note.y - 540) * 0.9 * scatter - scatter * 60;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: note.x - 170,
              top: note.y - 50,
              width: 340,
              padding: "22px 26px",
              background: i % 2 ? "#FFF3D6" : "#FFE6DF",
              boxShadow: "0 22px 40px -18px rgba(60,40,25,0.4)",
              transform: `translate(${dx}px, ${dy}px) rotate(${note.r + scatter * note.r * 3}deg) scale(${inT * (1 - scatter * 0.3)})`,
              opacity: Math.min(1, inT) * (1 - scatter),
              fontFamily: F.serif,
              fontStyle: "italic",
              fontSize: 34,
              color: C.ink,
              lineHeight: 1.15,
            }}
          >
            {note.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
