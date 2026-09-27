import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease, pop, prog, s } from "../anim";
import { Headline, Kicker } from "../ui/Headline";
import { spline, Thread, track } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// Jusqu'au dernier jour : les documents de sortie, prêts et déposés.
const TR = track(spline([[0, SEAM_Y], [W / 2, SEAM_Y + 8], [W, SEAM_Y]]));
const DOCS = [
  { x: 520, title: "Certificat de travail", at: 1.0 },
  { x: 960, title: "Reçu pour solde de tout compte", at: 1.6 },
  { x: 1400, title: "Attestation France Travail", at: 2.2 },
];

export function S8Exit() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Thread tr={TR} draw={1} head={false} width={3.2} />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <Kicker opacity={prog(f, 0, 16)}>Tom quitte l&apos;entreprise</Kicker>
        <div style={{ height: 22 }} />
        <Headline text={"Jusqu'au *dernier jour.*"} from={s(0.2)} size={84} />
      </AbsoluteFill>
      {DOCS.map((doc) => {
        const k = pop(f, s(doc.at));
        const stamp = pop(f, s(doc.at) + 22);
        return (
          <div key={doc.title} style={{ position: "absolute", left: doc.x - 150, top: SEAM_Y - 190, width: 300, fontFamily: F.sans, transform: `translateY(${(1 - Math.min(1, k)) * -60}px) rotate(${(1 - Math.min(1, k)) * -4}deg)`, opacity: Math.min(1, k) }}>
            <div style={{ height: 380, background: C.white, borderRadius: 14, border: `1px solid ${C.line}`, boxShadow: "0 36px 70px -36px rgba(60,40,25,0.5)", padding: "30px 28px", position: "relative" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, lineHeight: 1.2, height: 60 }}>{doc.title}</div>
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ marginTop: 16, height: 9, width: `${92 - (i % 3) * 18}%`, borderRadius: 5, background: "#F1ECE4" }} />)}
              <div style={{ position: "absolute", left: 28, bottom: 30, height: 9, width: 110, borderRadius: 5, background: "#E6DED3" }} />
              <div style={{ position: "absolute", right: 22, bottom: 24, padding: "8px 14px", border: `3px solid ${C.teal}`, borderRadius: 10, color: C.teal, fontWeight: 800, fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase", transform: `rotate(-8deg) scale(${interpolate(Math.min(1.2, stamp), [0, 1], [1.8, 1])})`, opacity: prog(f, s(doc.at) + 22, 4), background: "rgba(255,255,255,0.8)" }}>Publié</div>
            </div>
          </div>
        );
      })}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150 }}>
        <div style={{ fontFamily: F.sans, fontSize: 30, color: C.inkSoft, opacity: prog(f, s(3.4), 16, ease) }}>
          Préparés à partir de sa dernière paie, déposés dans son espace.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
