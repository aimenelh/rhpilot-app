import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease, inOut, pop, prog, s } from "../anim";
import { Logomark } from "../ui/Brand";
import { Headline } from "../ui/Headline";
import { pointAt, spline, Thread, track } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// Le bulletin quitte le logiciel et arrive sur le téléphone du salarié.
const PHONE = { x: 1180, y: 110, w: 420, h: 860 };
// Le fil passe sous la liste avant de rejoindre le téléphone.
const IN = track(spline([[0, SEAM_Y], [70, 780], [420, 905], [900, 860], [PHONE.x, 620]]));
const OUT = track(spline([[PHONE.x + PHONE.w, SEAM_Y], [1760, SEAM_Y - 20], [W, SEAM_Y]]));
const TRAVEL = s(1.0);
const ARRIVE = s(2.4);

const MONTHS = ["Octobre 2026", "Septembre 2026", "Août 2026", "Juillet 2026"];

export function S7Employee() {
  const f = useCurrentFrame();
  const phone = pop(f, s(0.2));
  const t = prog(f, TRAVEL, ARRIVE - TRAVEL, inOut);
  const [dx, dy] = pointAt(IN, t);
  const banner = prog(f, ARRIVE, 12, ease);
  const bannerOut = prog(f, s(4.4), 12, inOut);
  const tap = prog(f, s(4.2), 8);
  const list = prog(f, s(4.6), 14, ease);
  return (
    <AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Thread tr={IN} draw={1} head={false} width={3.2} />
        <Thread tr={OUT} draw={prog(f, s(8.4), 18)} width={3.2} />
      </svg>

      <div style={{ position: "absolute", left: 120, top: 300 }}>
        <Headline text={"Le bulletin arrive\n*dans sa poche.*"} from={s(0.2)} size={86} align="left" />
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14, fontFamily: F.sans, fontSize: 26, color: C.inkSoft }}>
          {["Ses bulletins, dans un coffre-fort", "Ses congés et ses demandes d'absence", "Accessible même après son départ", "Chaque ouverture journalisée"].map((line, i) => (
            <div key={line} style={{ display: "flex", alignItems: "center", gap: 14, opacity: prog(f, s(0.9) + i * 6, 14), transform: `translateX(${(1 - prog(f, s(0.9) + i * 6, 14)) * -16}px)` }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: C.coral }} />
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Le document qui voyage sur le fil */}
      {t > 0 && t < 1 ? (
        <div style={{ position: "absolute", left: dx - 34, top: dy - 44, width: 68, height: 88, borderRadius: 8, background: C.white, border: `1px solid ${C.line}`, boxShadow: "0 12px 26px -10px rgba(60,40,25,0.5)", transform: `rotate(${-6 + 12 * t}deg) scale(${1 - 0.3 * t})` }}>
          <div style={{ margin: "12px 10px 0", height: 6, borderRadius: 3, background: C.coral }} />
          {[0, 1, 2, 3].map((k) => <div key={k} style={{ margin: "8px 10px 0", height: 4, borderRadius: 2, background: "#EEE8DF" }} />)}
        </div>
      ) : null}

      {/* Le téléphone */}
      <div style={{ position: "absolute", left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, borderRadius: 64, background: "#111216", padding: 14, boxShadow: "0 60px 120px -50px rgba(20,15,10,0.65)", transform: `translateY(${(1 - Math.min(1, phone)) * 80}px)`, opacity: Math.min(1, phone) }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: C.paper, fontFamily: F.sans }}>
          <div style={{ position: "absolute", top: 14, left: "50%", marginLeft: -60, width: 120, height: 34, borderRadius: 17, background: "#111216", zIndex: 3 }} />
          {/* Écran « Mes bulletins » */}
          <div style={{ position: "absolute", inset: 0, padding: "80px 24px 0", opacity: 0.35 + 0.65 * list }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logomark size={40} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>Boulangerie Durand</div>
                <div style={{ fontSize: 15, color: C.inkFaint }}>Camille Morel</div>
              </div>
            </div>
            <div style={{ marginTop: 28, fontSize: 32, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Mes bulletins</div>
            <div style={{ marginTop: 16, background: C.white, borderRadius: 22, border: `1px solid ${C.line}`, overflow: "hidden" }}>
              {MONTHS.map((month, i) => (
                <div key={month} style={{ display: "flex", alignItems: "center", padding: "18px 18px", borderTop: i ? `1px solid ${C.line}` : undefined, background: i === 0 && tap > 0 && tap < 1 ? "#FCEDEA" : undefined, transform: i === 0 ? `translateY(${(1 - list) * -10}px)` : undefined }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 21, fontWeight: 700, color: C.ink }}>
                      {month} {i === 0 ? <span style={{ fontSize: 15, color: C.coral, marginLeft: 6 }}>Nouveau</span> : null}
                    </div>
                    <div style={{ fontSize: 15, color: C.inkFaint }}>Publié le 28 {month.split(" ")[0].toLowerCase()}</div>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, fontSize: 20 }}>↓</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "16px 18px", background: C.white, borderRadius: 22, border: `1px solid ${C.line}`, opacity: list }}>
              <div style={{ fontSize: 15, color: C.inkFaint }}>Congés payés disponibles</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.ink }}>{interpolate(list, [0, 1], [0, 18.5]).toFixed(1).replace(".", ",")} jours</div>
            </div>
          </div>
          {/* Notification */}
          <div style={{ position: "absolute", left: 12, right: 12, top: 60, padding: "16px 18px", borderRadius: 24, background: "rgba(255,255,255,0.96)", boxShadow: "0 18px 40px -16px rgba(20,15,10,0.45)", display: "flex", gap: 12, transform: `translateY(${(1 - banner) * -120 - bannerOut * 140}px)`, opacity: banner * (1 - bannerOut), zIndex: 4 }}>
            <Logomark size={38} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>RH Pilot <span style={{ fontWeight: 400, color: C.inkFaint }}>· maintenant</span></div>
              <div style={{ fontSize: 17, color: C.ink, lineHeight: 1.3 }}>Votre bulletin d&apos;octobre est disponible dans votre espace.</div>
            </div>
          </div>
          {/* Toucher */}
          {tap > 0 && tap < 1 ? <div style={{ position: "absolute", left: 180, top: 250, width: 60, height: 60, borderRadius: 30, background: "rgba(232,67,46,0.25)", transform: `scale(${0.6 + tap})`, opacity: 1 - tap }} /> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
}
