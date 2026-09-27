import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, prog, s, typed } from "../anim";
import { Logomark } from "../ui/Brand";
import { Headline } from "../ui/Headline";
import { spline, Thread, track } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// Le Copilote : une question, et une réponse tirée des données de l'entreprise.
const CARD = { left: 820, top: 190, width: 980, height: 700 };
// Le fil passe sous le texte d'accroche avant de rejoindre la carte.
const IN = track(spline([[0, SEAM_Y], [70, 760], [300, 905], [620, 880], [CARD.left, 620]]));
const OUT = track(spline([[CARD.left + CARD.width, SEAM_Y], [1860, SEAM_Y - 10], [W, SEAM_Y]]));
const QUESTION = "Que dois-je anticiper cette semaine ?";
const ANSWERS = [
  { when: "Jeu. 15 oct.", text: "Décider de la suite de l'essai de Karim", who: "Dirigeant", tone: C.coral },
  { when: "Mar. 13 oct.", text: "Envoyer la convocation à la visite médicale de Tom", who: "RH", tone: C.teal },
  { when: "En attente", text: "Joindre l'accusé de réception DPAE de Sofia", who: "RH", tone: C.violet },
];

export function S5Copilot() {
  const f = useCurrentFrame();
  const card = pop(f, s(0.3));
  const q = typed(QUESTION, f, s(1.0), 26);
  const asked = s(1.0) + Math.ceil((QUESTION.length / 26) * 30) + 6;
  const thinking = f > asked && f < asked + 22;
  return (
    <AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Thread tr={IN} draw={1} head={false} width={3.2} />
        <Thread tr={OUT} draw={prog(f, s(7.4), 20)} width={3.2} />
      </svg>
      <div style={{ position: "absolute", left: 120, top: 330 }}>
        <Headline text={"Une question.\n*Le contexte\nsous les yeux.*"} from={s(0.2)} size={84} align="left" />
        <div style={{ marginTop: 34, width: 560, fontFamily: F.sans, fontSize: 25, lineHeight: 1.5, color: C.inkSoft, opacity: prog(f, s(1.2), 20) }}>
          Le Copilote répond à partir des parcours, des dates et de ce qui est déjà fait.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          ...CARD,
          background: C.white,
          borderRadius: 28,
          border: `1px solid ${C.line}`,
          boxShadow: "0 50px 100px -50px rgba(60,40,25,0.5)",
          transform: `translateY(${(1 - Math.min(1, card)) * 40}px)`,
          opacity: Math.min(1, card),
          fontFamily: F.sans,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 28px", borderBottom: `1px solid ${C.line}` }}>
          <Logomark size={40} />
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>Copilote</div>
          <div style={{ marginLeft: "auto", fontSize: 18, color: C.teal, fontWeight: 600 }}>● Vos données, en direct</div>
        </div>
        <div style={{ padding: "30px 30px 0" }}>
          {q ? (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: C.coral, color: C.white, fontSize: 27, fontWeight: 500, padding: "16px 22px", borderRadius: "22px 22px 6px 22px" }}>{q}</div>
            </div>
          ) : null}
          {thinking ? (
            <div style={{ marginTop: 26, display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: C.inkFaint, opacity: 0.35 + 0.65 * Math.abs(Math.sin((f - asked) / 5 + i)) }} />
              ))}
            </div>
          ) : null}
          <div style={{ marginTop: 26 }}>
            {f >= asked + 22 ? (
              <div style={{ fontSize: 24, color: C.inkSoft, marginBottom: 14, opacity: prog(f, asked + 22, 10) }}>Cette semaine, trois points demandent votre attention :</div>
            ) : null}
            {ANSWERS.map((a, i) => {
              const t = prog(f, asked + 34 + i * 12, 16, ease);
              return (
                <div key={a.text} style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 18px", marginBottom: 12, borderRadius: 18, background: "#FBFAF7", border: `1px solid ${C.line}`, opacity: t, transform: `translateX(${(1 - t) * 30}px)` }}>
                  <div style={{ width: 10, alignSelf: "stretch", borderRadius: 5, background: a.tone }} />
                  <div style={{ width: 150, fontSize: 21, fontWeight: 700, color: a.tone === C.coral ? C.coralDeep : C.ink }}>{a.when}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 25, fontWeight: 500, color: C.ink }}>{a.text}</div>
                    <div style={{ fontSize: 19, color: C.inkFaint, marginTop: 2 }}>{a.who}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
