import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, prog, s, typed } from "../anim";
import { Logomark } from "../ui/Brand";
import { Headline } from "../ui/Headline";
import { fractionAtX, pointAt, spline, Thread, track, type Pt } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// Une phrase devient un plan daté : le fil pose les huit étapes de l'embauche.
const SENTENCE = "Sofia arrive le jeudi 8 octobre";
const ENTER = s(2.4);

const STEPS = [
  { date: "29 sept.", label: "Préparer le contrat", who: "RH" },
  { date: "5 oct.", label: "Déclarer la DPAE", who: "RH · accusé de réception" },
  { date: "6 oct.", label: "Préparer le poste", who: "Manager" },
  { date: "7 oct.", label: "Faire signer le contrat", who: "RH · contrat signé" },
  { date: "8 oct.", label: "Accueillir Sofia", who: "Manager" },
  { date: "23 oct.", label: "Demander la visite médicale", who: "RH" },
  { date: "9 nov.", label: "Point d'intégration à 30 jours", who: "Manager" },
  { date: "23 nov.", label: "Suivre la visite médicale", who: "RH" },
];
const XS = STEPS.map((_, i) => 170 + i * 226);
const wave = (x: number) => SEAM_Y + 18 + 46 * Math.sin((x / W) * Math.PI * 2.1 + 0.6) * Math.sin((x / W) * Math.PI);
const CTRL: Pt[] = [[0, SEAM_Y], ...Array.from({ length: 13 }, (_, i) => { const x = ((i + 1) / 14) * W; return [x, wave(x)] as Pt; }), [W, SEAM_Y]];
const TR = track(spline(CTRL, 40));
const AT = XS.map((x) => fractionAtX(TR, x));

export function S3Hiring() {
  const f = useCurrentFrame();
  const bar = pop(f, s(0.2));
  const text = typed(SENTENCE, f, s(0.6), 20);
  const pressed = prog(f, ENTER, 8);
  const draw = 0.06 + 0.94 * prog(f, ENTER + 4, s(3.6), (t) => t);
  const caret = Math.floor(f / 15) % 2 === 0 && f < ENTER;
  return (
    <AbsoluteFill>
      {/* Barre de saisie */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 140, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            width: 920,
            height: 104,
            padding: "0 30px",
            background: C.white,
            borderRadius: 26,
            border: `1.5px solid ${pressed > 0 && pressed < 1 ? C.coral : C.line}`,
            boxShadow: `0 30px 70px -36px rgba(60,40,25,0.45), 0 0 0 ${8 * Math.sin(pressed * Math.PI)}px rgba(232,67,46,0.12)`,
            transform: `scale(${0.94 + 0.06 * bar - 0.015 * Math.sin(pressed * Math.PI)})`,
            opacity: Math.min(1, bar),
          }}
        >
          <Logomark size={46} />
          <div style={{ flex: 1, fontFamily: F.sans, fontSize: 40, fontWeight: 500, color: text ? C.ink : C.inkFaint, letterSpacing: "-0.01em" }}>
            {text || "Écrivez ce qui arrive…"}
            <span style={{ display: "inline-block", width: 3, height: 44, marginLeft: 4, verticalAlign: "-8px", background: C.coral, opacity: caret ? 1 : 0 }} />
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 600, color: pressed > 0 ? C.white : C.inkFaint, background: pressed > 0 ? C.coral : C.paperDeep, borderRadius: 12, padding: "10px 16px" }}>Entrée ↵</div>
        </div>
        <div style={{ marginTop: 22, fontFamily: F.sans, fontSize: 24, color: C.inkSoft, opacity: prog(f, ENTER + 10, 14), transform: `translateY(${(1 - prog(f, ENTER + 10, 14)) * 10}px)` }}>
          <span style={{ color: C.teal, fontWeight: 700 }}>Compris :</span> embauche de Sofia · 8 actions datées, responsables et pièces à fournir
        </div>
      </div>

      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Thread tr={TR} draw={draw} width={3.2} />
      </svg>

      {STEPS.map((step, i) => {
        const at = AT[i];
        const [x, y] = pointAt(TR, at);
        const reached = ENTER + 4 + (at - 0.06) / 0.94 * s(3.6);
        const k = pop(f, reached);
        const label = prog(f, reached + 3, 16, ease);
        const above = i % 2 === 0;
        return (
          <div key={step.label} style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>
            <div style={{ position: "absolute", left: -13, top: -13, width: 26, height: 26, borderRadius: 13, border: `3px solid ${C.coral}`, background: C.paper, transform: `scale(${k})` }} />
            <div
              style={{
                position: "absolute",
                left: -125,
                width: 250,
                textWrap: "balance",
                textAlign: "center",
                ...(above ? { bottom: 34 } : { top: 34 }),
                opacity: label,
                transform: `translateY(${(1 - label) * (above ? 12 : -12)}px)`,
                fontFamily: F.sans,
              }}
            >
              <div style={{ fontSize: 21, fontWeight: 700, color: C.coralDeep }}>{step.date}</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 500, color: C.ink, lineHeight: 1.2 }}>{step.label}</div>
              <div style={{ marginTop: 4, fontSize: 18, color: C.inkFaint }}>{step.who}</div>
            </div>
          </div>
        );
      })}

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 96 }}>
        <Headline text={"Une phrase. *Un plan daté.*"} from={ENTER + s(3.2)} size={72} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
