import { AbsoluteFill, useCurrentFrame } from "remotion";
import { prog, s } from "../anim";
import { Headline, Kicker } from "../ui/Headline";
import { spline, Thread, track } from "../ui/Thread";
import { C, SEAM_Y, W } from "../theme";

// Ouverture : un point corail, puis le fil part. Huit salariés, trente jours.
const TR = track(spline([[-60, 800], [300, 790], [700, 740], [1100, 700], [1500, 600], [1780, 548], [W, SEAM_Y]]));

export function S1Opening() {
  const f = useCurrentFrame();
  const dot = prog(f, 0, 14);
  const draw = prog(f, s(0.6), s(4.6));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 210 }}>
        <Kicker opacity={prog(f, s(0.3), 20)}>Une PME, quelque part en France</Kicker>
        <div style={{ height: 36 }} />
        <Headline text={"Huit salariés. Trente jours.\n*Un seul fil.*"} from={s(0.7)} size={104} stagger={4} />
      </AbsoluteFill>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={TR.pts[0][0] + 60} cy={TR.pts[0][1]} r={7 * dot} fill={C.coral} opacity={1 - prog(f, s(1.2), 10)} />
        <Thread tr={TR} draw={draw} width={3.2} />
      </svg>
    </AbsoluteFill>
  );
}
