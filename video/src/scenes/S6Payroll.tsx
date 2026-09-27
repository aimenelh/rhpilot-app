import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease, euros, inOut, pop, prog, s } from "../anim";
import { Headline } from "../ui/Headline";
import { spline, Thread, track } from "../ui/Thread";
import { C, F, SEAM_Y, W } from "../theme";

// La paie en trois temps : la saisie du mois dans un tableau, le calcul du
// brut au net, puis la clôture et les bulletins prêts.

const IN = track(spline([[0, SEAM_Y], [120, SEAM_Y], [210, SEAM_Y]]));
const OUT = track(spline([[1710, SEAM_Y], [1800, SEAM_Y], [W, SEAM_Y]]));

const COLS = ["H. sup. 25 %", "Prime", "Titres-restaurant", "Transport", "Vérifié"];
const ROWS: Array<{ name: string; sub: string; cells: [string, string, string, string] }> = [
  { name: "Camille Morel", sub: "Temps plein · 151,67 h", cells: ["6", "150", "20", "43,20"] },
  { name: "Karim Belhaj", sub: "Temps plein · 151,67 h", cells: ["", "", "19", "86,40"] },
  { name: "Marc Dubois", sub: "Temps plein · 151,67 h", cells: ["4", "", "20", ""] },
  { name: "Sofia Lambert", sub: "Entrée le 8 oct.", cells: ["", "", "15", "43,20"] },
  { name: "Tom Girard", sub: "Temps partiel · 104 h", cells: ["—", "80", "12", ""] },
  { name: "Inès Roux", sub: "Temps plein · 151,67 h", cells: ["", "200", "20", "86,40"] },
];
// Ordre dans lequel les cases se remplissent (ligne, colonne).
const FILL: Array<[number, number]> = [];
ROWS.forEach((row, r) => row.cells.forEach((value, c) => { if (value && value !== "—") FILL.push([r, c]); }));
const FILL_START = s(0.9);
const FILL_STEP = 5;
const TICK_START = FILL_START + FILL.length * FILL_STEP + 6;

const LINES = [
  { label: "Salaire de base", base: "151,67 h", value: 2800 },
  { label: "Heures supplémentaires 25 %", base: "6 h", value: 138.46 },
  { label: "Prime d'activité", base: "", value: 150 },
];
const GROSS = 3088.46;
const DEDUCTIONS = [
  { label: "Cotisations salariales", value: -679.46 },
  { label: "Impôt sur le revenu prélevé à la source", value: -108.41 },
];
const NET = 2300.59;

const B = s(7.6); // début du calcul
const C3 = s(13.2); // clôture

export function S6Payroll() {
  const f = useCurrentFrame();
  const gridIn = pop(f, s(0.2));
  const gridOut = prog(f, B, 16, inOut);
  const slip = prog(f, B + 10, 20, ease);
  const close = prog(f, C3, 18, inOut);
  const cursor = FILL[Math.min(FILL.length - 1, Math.max(0, Math.floor((f - FILL_START) / FILL_STEP)))];
  return (
    <AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Thread tr={IN} draw={1} head={false} width={3.2} />
        <Thread tr={OUT} draw={prog(f, s(16.8), 16)} width={3.2} />
      </svg>

      {/* Temps 1 : la saisie */}
      <div
        style={{
          position: "absolute",
          left: 210,
          top: 150,
          width: 1500,
          background: C.white,
          borderRadius: 26,
          border: `1px solid ${C.line}`,
          boxShadow: "0 50px 110px -50px rgba(60,40,25,0.5)",
          fontFamily: F.sans,
          overflow: "hidden",
          opacity: Math.min(1, gridIn) * (1 - gridOut),
          transform: `translateY(${(1 - Math.min(1, gridIn)) * 40 - gridOut * 60}px) scale(${1 - gridOut * 0.06})`,
          filter: gridOut ? `blur(${gridOut * 10}px)` : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "26px 34px 0" }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Paie d&apos;octobre 2026</div>
            <div style={{ marginTop: 4, fontSize: 20, color: C.inkFaint }}>
              Saisie en cours · {Math.min(ROWS.length, Math.max(0, Math.floor((f - TICK_START) / 6) + 1))}/{ROWS.length} salariés vérifiés
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, padding: 6, background: "#F4F1EB", borderRadius: 16 }}>
            {["Saisie", "Contrôle", "Bulletins", "Déclaration"].map((tab, i) => (
              <div key={tab} style={{ padding: "12px 22px", borderRadius: 12, fontSize: 21, fontWeight: 600, background: i === 0 ? C.ink : "transparent", color: i === 0 ? C.white : C.inkSoft }}>{tab}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 34, padding: "22px 34px 0", borderBottom: `1px solid ${C.line}` }}>
          {["Heures", "Primes et variables", "Absences", "Entrées et sorties"].map((tab, i) => (
            <div key={tab} style={{ paddingBottom: 14, fontSize: 21, fontWeight: 600, color: i === 1 ? C.ink : C.inkFaint, borderBottom: `3px solid ${i === 1 ? C.coral : "transparent"}` }}>{tab}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 0.6fr", padding: "16px 34px", fontSize: 18, fontWeight: 600, color: C.inkFaint }}>
          <div>Salarié</div>
          {COLS.map((col) => <div key={col} style={{ textAlign: col === "Vérifié" ? "center" : "right" }}>{col}</div>)}
        </div>
        {ROWS.map((row, r) => {
          const checked = f >= TICK_START + r * 6;
          return (
            <div key={row.name} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 0.6fr", alignItems: "center", padding: "10px 34px", borderTop: `1px solid ${C.line}`, fontSize: 23 }}>
              <div>
                <div style={{ fontWeight: 600, color: C.ink }}>{row.name}</div>
                <div style={{ fontSize: 16, color: C.inkFaint }}>{row.sub}</div>
              </div>
              {row.cells.map((value, c) => {
                const order = FILL.findIndex(([rr, cc]) => rr === r && cc === c);
                const shown = order >= 0 && f >= FILL_START + order * FILL_STEP;
                const active = cursor && cursor[0] === r && cursor[1] === c && f < TICK_START;
                return (
                  <div key={c} style={{ margin: "0 6px", padding: "10px 14px", textAlign: "right", borderRadius: 10, border: `1.5px solid ${active ? C.coral : "#ECE7DF"}`, background: value === "—" ? "#F6F3EE" : C.white, color: value === "—" ? C.inkFaint : C.ink, boxShadow: active ? "0 0 0 4px rgba(232,67,46,0.12)" : undefined, fontVariantNumeric: "tabular-nums", minHeight: 28 }}>
                    {value === "—" ? "sans objet" : shown ? value : ""}
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, border: `2px solid ${checked ? C.teal : "#D9D0C5"}`, background: checked ? C.teal : C.white, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, transform: `scale(${checked ? 0.85 + 0.15 * Math.min(1, pop(f, TICK_START + r * 6)) : 1})` }}>{checked ? "✓" : ""}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Temps 2 : du brut au net */}
      <div style={{ position: "absolute", left: 210, top: 150, width: 1500, height: 780, display: "flex", gap: 60, alignItems: "center", opacity: slip * (1 - close), pointerEvents: "none" }}>
        <div style={{ width: 560 }}>
          <Headline text={"Calculée au centime.\n*Contrôlée avant l'envoi.*"} from={B + 14} size={56} align="left" exitAt={C3 - 4} />
          <div style={{ marginTop: 30, fontFamily: F.sans, fontSize: 24, lineHeight: 1.55, color: C.inkSoft, opacity: prog(f, B + 30, 20) }}>
            Cotisations 2026, réduction générale, heures supplémentaires, absences et congés : tout est calculé, chaque ligne est expliquée.
          </div>
        </div>
        <div style={{ flex: 1, background: C.white, borderRadius: 24, border: `1px solid ${C.line}`, boxShadow: "0 50px 110px -50px rgba(60,40,25,0.5)", padding: "34px 40px", fontFamily: F.sans, transform: `translateY(${(1 - slip) * 50}px) rotate(${(1 - slip) * 2}deg)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: C.ink }}>Camille Morel</div>
            <div style={{ fontSize: 20, color: C.inkFaint }}>Bulletin d&apos;octobre 2026</div>
          </div>
          <div style={{ marginTop: 20, borderTop: `1px solid ${C.line}` }} />
          {LINES.map((line, i) => {
            const t = prog(f, B + 22 + i * 7, 12, ease);
            return (
              <div key={line.label} style={{ display: "flex", padding: "12px 0", fontSize: 24, color: C.ink, opacity: t, transform: `translateX(${(1 - t) * 20}px)` }}>
                <div style={{ flex: 1 }}>{line.label}</div>
                <div style={{ width: 130, textAlign: "right", color: C.inkFaint, fontSize: 20 }}>{line.base}</div>
                <div style={{ width: 200, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{euros(line.value)}</div>
              </div>
            );
          })}
          <Total label="Salaire brut" value={GROSS * prog(f, B + 46, 18, inOut)} show={prog(f, B + 44, 10)} />
          {DEDUCTIONS.map((line, i) => {
            const t = prog(f, B + 64 + i * 8, 12, ease);
            return (
              <div key={line.label} style={{ display: "flex", padding: "12px 0", fontSize: 24, color: C.inkSoft, opacity: t, transform: `translateX(${(1 - t) * 20}px)` }}>
                <div style={{ flex: 1 }}>{line.label}</div>
                <div style={{ width: 200, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{euros(line.value)}</div>
              </div>
            );
          })}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", padding: "20px 24px", borderRadius: 18, background: C.ink, color: C.white, opacity: prog(f, B + 84, 12), transform: `scale(${0.96 + 0.04 * Math.min(1, pop(f, B + 84))})` }}>
            <div style={{ flex: 1, fontSize: 26, fontWeight: 600 }}>Net à payer</div>
            <div style={{ fontSize: 40, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{euros(NET * prog(f, B + 86, 26, inOut))}</div>
          </div>
        </div>
      </div>

      {/* Temps 3 : clôture */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: close }}>
        <div style={{ position: "relative", width: 560, height: 400, marginTop: -40 }}>
          {Array.from({ length: 6 }, (_, i) => {
            const t = prog(f, C3 + 4 + i * 3, 14, ease);
            return (
              <div key={i} style={{ position: "absolute", left: 60 + i * 8, top: 30 - i * 8, width: 420, height: 300, background: C.white, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: "0 20px 40px -24px rgba(60,40,25,0.4)", transform: `rotate(${(i - 2.5) * 2.2 * t}deg) translateY(${(1 - t) * 40}px)`, opacity: t }}>
                <div style={{ margin: "30px 34px 0", height: 16, width: 200, borderRadius: 8, background: "#EEE8DF" }} />
                {[0, 1, 2, 3].map((k) => <div key={k} style={{ margin: "18px 34px 0", height: 10, width: 330 - k * 40, borderRadius: 5, background: "#F3EFE8" }} />)}
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: 150,
              top: 120,
              padding: "16px 30px",
              border: `5px solid ${C.teal}`,
              borderRadius: 14,
              color: C.teal,
              fontFamily: F.sans,
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              background: "rgba(255,255,255,0.85)",
              transform: `rotate(-8deg) scale(${interpolate(pop(f, C3 + 26), [0, 1], [1.8, 1])})`,
              opacity: prog(f, C3 + 26, 4),
            }}
          >
            Octobre clôturé
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Headline text={"La paie, *sans tableur ni surprise.*"} from={C3 + 30} size={70} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 96, opacity: 1 - gridOut }}>
        <Headline text={"Saisir le mois : *un tableau, c'est tout.*"} from={s(1.4)} size={60} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Total({ label, value, show }: { label: string; value: number; show: number }) {
  return (
    <div style={{ display: "flex", marginTop: 6, padding: "16px 0", borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.line}`, fontSize: 27, fontWeight: 700, color: C.ink, opacity: show }}>
      <div style={{ flex: 1 }}>{label}</div>
      <div style={{ fontVariantNumeric: "tabular-nums" }}>{euros(value)}</div>
    </div>
  );
}
