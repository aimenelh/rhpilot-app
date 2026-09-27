// Rend plusieurs images fixes du film en une passe : node scripts/stills.mjs 100 250 700
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const frames = process.argv.slice(2).map(Number);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "RHPilot", browserExecutable });
for (const frame of frames) {
  await renderStill({ serveUrl, composition, frame, output: `out/stills/f${frame}.png`, browserExecutable });
  console.log("image", frame);
}
