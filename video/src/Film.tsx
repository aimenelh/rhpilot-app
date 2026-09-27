import { AbsoluteFill, Audio, Freeze, interpolate, staticFile, useCurrentFrame } from "remotion";
import { inOut } from "./anim";
import { PAN, SCENES } from "./timeline";
import { FPS, W } from "./theme";
import { Paper } from "./ui/Paper";
import { Hud } from "./ui/Hud";

// Toutes les scènes sont posées côte à côte sur une longue bande de papier.
// La caméra glisse de l'une à l'autre : le fil se raccorde à chaque jonction,
// le film se lit comme un seul plan.

export const starts = SCENES.reduce<number[]>((acc, scene, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + Math.round(SCENES[i - 1].seconds * FPS));
  return acc;
}, []);
export const TOTAL = starts[starts.length - 1] + Math.round(SCENES[SCENES.length - 1].seconds * FPS);

export function Film() {
  const frame = useCurrentFrame();
  // Position de la caméra : fixe sur une scène, glisse pendant PAN images avant la suivante.
  let camera = 0;
  starts.forEach((start, i) => {
    if (i === 0) return;
    camera += W * interpolate(frame, [start - PAN, start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  });
  const current = Math.round(camera / W);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Paper />
      <AbsoluteFill style={{ transform: `translateX(${-camera}px)` }}>
        {SCENES.map((scene, i) => {
          if (Math.abs(i - camera / W) > 1.05) return null;
          const { Component } = scene;
          // Pendant le glissement d'arrivée, la scène suivante est déjà posée, figée sur sa première image.
          const local = Math.max(0, frame - starts[i]);
          return (
            <AbsoluteFill key={scene.id} style={{ left: i * W, width: W }}>
              <Freeze frame={local}>
                <Component />
              </Freeze>
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>
      <HudLayer frame={frame} current={current} />
      {/* Bande-son originale, générée par scripts/compose.mjs */}
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
}

function HudLayer({ frame, current }: { frame: number; current: number }) {
  const scene = SCENES[Math.min(SCENES.length - 1, Math.max(0, current))];
  const visible = scene.date ? 1 : 0;
  // Le mois avance pendant la scène jusqu'au jour indiqué.
  const previousDay = SCENES.slice(0, current).reduce((d, item) => (item.day ?? d), 0);
  const start = starts[current] ?? 0;
  const day = interpolate(frame, [start, start + 40], [previousDay, scene.day ?? previousDay], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  const fade = interpolate(frame, [start - PAN, start - PAN / 2, start], [scene.date ? 0.4 : 0, 0.2, visible], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Hud label={scene.date ?? ""} day={day} visible={Math.max(0, Math.min(1, fade))} />;
}
