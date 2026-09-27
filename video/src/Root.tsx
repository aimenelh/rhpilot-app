import { Composition } from "remotion";
import "./fonts";
import { Film, TOTAL } from "./Film";
import { FPS, H, W } from "./theme";

export function Root() {
  return <Composition id="RHPilot" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />;
}
