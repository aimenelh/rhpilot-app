import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, prog, s } from "../anim";
import { Headline } from "../ui/Headline";
import { pointAt, spline, Thread, track } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// Les rappels partent seuls, le long du fil, vers la bonne personne.
const TR = track(spline([[0, SEAM_Y], [480, SEAM_Y + 10], [960, SEAM_Y - 6], [1440, SEAM_Y + 8], [W, SEAM_Y]]));

const PEOPLE = [
  { x: 420, up: true, name: "Camille", role: "RH", initials: "CM", color: C.teal, text: "Déclarer la DPAE de Sofia", when: "avant lundi 5 oct.", at: 0.9 },
  { x: 960, up: false, name: "Marc", role: "Manager", initials: "MD", color: C.violet, text: "Préparer le poste de Sofia", when: "mardi 6 oct.", at: 1.7 },
  { x: 1500, up: true, name: "Léo", role: "Dirigeant", initials: "LB", color: C.ink, text: "Résumé : 6 actions cette semaine", when: "aucune en retard", at: 2.5 },
];

export function S4Reminders() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <Headline text={"Chacun sait quoi faire, *et pour quand.*"} from={s(0.1)} size={70} />
      </AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Thread tr={TR} draw={1} head={false} width={3.2} />
        {PEOPLE.map((p, i) => {
          // Une impulsion lumineuse court sur le fil jusqu'à la personne, puis monte vers sa carte.
          const start = s(p.at) - 20;
          const travel = prog(f, start, 20, ease);
          const [x] = [p.x];
          const pulse = pointAt(TR, (x / W) * travel);
          const branch = prog(f, s(p.at), 10, ease);
          const y0 = pointAt(TR, x / W)[1];
          const y1 = p.up ? 400 : 690;
          return (
            <g key={i}>
              {travel > 0 && travel < 1 ? <circle cx={pulse[0]} cy={pulse[1]} r={9} fill={C.coral} style={{ filter: "drop-shadow(0 0 10px rgba(232,67,46,0.8))" }} /> : null}
              <line x1={x} y1={y0} x2={x} y2={y0 + (y1 - y0) * branch} stroke={C.coral} strokeWidth={2.4} strokeDasharray="2 7" strokeLinecap="round" />
              <circle cx={x} cy={y0} r={11 * pop(f, s(p.at) - 2)} fill={C.coral} />
            </g>
          );
        })}
      </svg>
      {PEOPLE.map((p, i) => {
        const k = pop(f, s(p.at) + 6);
        const sent = prog(f, s(p.at) + 20, 10);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x - 230,
              ...(p.up ? { bottom: 1080 - 400 } : { top: 690 }),
              width: 460,
              padding: "22px 24px",
              background: C.white,
              borderRadius: 22,
              border: `1px solid ${C.line}`,
              boxShadow: "0 30px 60px -30px rgba(60,40,25,0.4)",
              transform: `translateY(${(1 - Math.min(1, k)) * (p.up ? 24 : -24)}px) scale(${0.9 + 0.1 * k})`,
              opacity: Math.min(1, k),
              fontFamily: F.sans,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: p.color, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20 }}>{p.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{p.name} <span style={{ fontWeight: 500, color: C.inkFaint }}>· {p.role}</span></div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.coral, opacity: sent }}>Rappel envoyé ✓</div>
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 26, fontWeight: 500, color: C.ink }}>{p.text}</div>
            <div style={{ marginTop: 4, fontSize: 21, color: C.inkSoft }}>{p.when}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
