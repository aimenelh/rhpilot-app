// Bande-son originale du film, entièrement synthétisée : aucune source externe.
// 120 BPM, une mesure = 2 s : chaque changement de scène (6, 14, 26, 32, 42, 60, 70, 78 s)
// tombe sur un premier temps. Les bruitages sont calés sur les images clés des scènes.
//
//   node scripts/compose.mjs  →  public/soundtrack.wav
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const DURATION = 90;
const N = Math.ceil((DURATION + 0.5) * SR);
const BEAT = 0.5;
const BAR = 2;

// Deux bus stéréo : le son direct et l'envoi vers la réverbération.
const dry = [new Float32Array(N), new Float32Array(N)];
const wet = [new Float32Array(N), new Float32Array(N)];

// --- Outils ---------------------------------------------------------------
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const rnd = () => (rand() + 1) / 2;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const NOTE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const m = (name) => {
  const [, n, o] = name.match(/^([A-G]#?)(-?\d)$/);
  return 12 * (Number(o) + 1) + NOTE[n];
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

function add(buffer, i, l, r) {
  if (i < 0 || i >= N) return;
  buffer[0][i] += l;
  buffer[1][i] += r;
}
// Ajoute un signal mono avec un panoramique (-1 gauche, 1 droite) et une part envoyée en réverbération.
function place(start, samples, { gain = 1, pan = 0, send = 0.2 } = {}) {
  const i0 = Math.round(start * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
  for (let k = 0; k < samples.length; k++) {
    const v = samples[k];
    add(dry, i0 + k, v * gl, v * gr);
    if (send) add(wet, i0 + k, v * gl * send, v * gr * send);
  }
}

// Filtre d'état variable (passe-bas / passe-bande / passe-haut), fréquence modulable.
function svf() {
  let low = 0, band = 0;
  return (x, freq, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * clamp(freq, 20, SR / 6)) / SR);
    low += f * band;
    const high = x - low - band / q;
    band += f * high;
    return { low, band, high };
  };
}

// --- Instruments ------------------------------------------------------------

// Corde pincée (Karplus-Strong) : le « fil » du film.
function pluck(midi, dur, { bright = 0.5, decay = 0.996 } = {}) {
  const freq = mtof(midi);
  const len = Math.max(2, Math.round(SR / freq));
  const line = new Float32Array(len);
  const lp = svf();
  for (let i = 0; i < len; i++) line[i] = lp(rand(), 800 + bright * 7000).low * 1.6;
  const out = new Float32Array(Math.round(dur * SR));
  let idx = 0, prev = 0;
  for (let i = 0; i < out.length; i++) {
    const cur = line[idx];
    const next = decay * (0.5 * (cur + prev));
    prev = cur;
    line[idx] = next;
    idx = (idx + 1) % len;
    const fade = i > out.length - 2000 ? (out.length - i) / 2000 : 1;
    out[i] = cur * fade;
  }
  return out;
}

// Nappe chaude : partiels additifs légèrement désaccordés, attaque et relâchement lents.
function pad(midis, dur, { attack = 1.2, release = 1.5, cutoff = 1800, brightness = 1 } = {}) {
  const total = dur + release;
  const out = new Float32Array(Math.round(total * SR));
  const voices = [];
  for (const note of midis) {
    for (const detune of [-0.07, 0.06]) {
      voices.push({ f: mtof(note + detune), ph: rnd() * 6.28 });
    }
  }
  const lp = svf();
  const hp = svf();
  const harmonics = [1, 2, 3, 4, 5, 6];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const voice of voices) {
      const p = voice.ph + 2 * Math.PI * voice.f * t;
      for (const h of harmonics) v += Math.sin(p * h) / (h ** (1.6 / brightness));
    }
    const env = smooth(t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
    const wobble = 1 + 0.25 * Math.sin(2 * Math.PI * 0.15 * t);
    // Passe-haut : la nappe laisse le grave à la basse et à la grosse caisse.
    out[i] = hp(lp(v, cutoff * wobble).low, 150).high * env / voices.length;
  }
  return out;
}

// Basse ronde : sinus et octave, légère saturation.
function bass(midi, dur) {
  const f = mtof(midi);
  const out = new Float32Array(Math.round((dur + 0.15) * SR));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.01) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.15) : Math.exp(-t * 1.2) * 0.6 + 0.4);
    const v = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    out[i] = Math.tanh(v * 1.4) * env * 0.7;
  }
  return out;
}

// Cloche douce (FM) pour les étapes, notifications et rappels.
function bell(midi, dur = 1.6, { ratio = 3.5, index = 2.2 } = {}) {
  const f = mtof(midi);
  const out = new Float32Array(Math.round(dur * SR));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const envI = Math.exp(-t * 6);
    const mod = Math.sin(2 * Math.PI * f * ratio * t) * index * envI;
    out[i] = Math.sin(2 * Math.PI * f * t + mod) * Math.exp(-t * 3.2) * Math.min(1, t / 0.002);
  }
  return out;
}

function kick(gain = 1) {
  const out = new Float32Array(Math.round(0.5 * SR));
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 45 + 85 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.tanh(Math.sin(ph) * 1.8) * Math.exp(-t * 7) * gain;
  }
  return out;
}

function hat(gain = 1, length = 0.06) {
  const out = new Float32Array(Math.round(length * SR));
  const f = svf();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = f(rand(), 9000, 0.9).high * Math.exp(-t * 60) * gain;
  }
  return out;
}

// Claquement feutré (bruit filtré + corps) sur les temps 2 et 4.
function clap(gain = 1) {
  const out = new Float32Array(Math.round(0.35 * SR));
  const f = svf();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const bursts = t < 0.03 ? 0.6 + 0.4 * Math.sin(t * 900) : 1;
    const n = f(rand(), 1500, 1.4).band;
    out[i] = (n * Math.exp(-t * 16) * bursts + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.3) * gain;
  }
  return out;
}

// --- Bruitages ----------------------------------------------------------------

function whoosh(dur = 0.9, { from = 300, to = 4000, gain = 1 } = {}) {
  const out = new Float32Array(Math.round(dur * SR));
  const f = svf();
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const freq = from * (to / from) ** Math.sin((x * Math.PI) / 2);
    const env = Math.sin(Math.PI * x) ** 2;
    out[i] = f(rand(), freq, 2.2).band * env * gain;
  }
  return out;
}

function riser(dur, { from = 200, to = 6000, gain = 1 } = {}) {
  const out = new Float32Array(Math.round(dur * SR));
  const f = svf();
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    out[i] = f(rand(), from * (to / from) ** x, 3).band * x ** 2.2 * gain;
  }
  return out;
}

function click(gain = 1) {
  const out = new Float32Array(Math.round(0.025 * SR));
  const f = svf();
  const tone = 2400 + rnd() * 900;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = (f(rand(), tone, 3).band * 1.4 + Math.sin(2 * Math.PI * 1100 * t) * 0.2) * Math.exp(-t * 260) * gain;
  }
  return out;
}

function thud(gain = 1) {
  const out = new Float32Array(Math.round(0.6 * SR));
  const f = svf();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (60 + 90 * Math.exp(-t * 40))) / SR;
    const body = Math.sin(ph) * Math.exp(-t * 11);
    const paper = f(rand(), 1800, 0.8).band * Math.exp(-t * 35) * 0.9;
    out[i] = Math.tanh((body + paper) * 1.6) * gain;
  }
  return out;
}

// Corde tendue qui vibre puis se calme (le fil que l'on tire).
function twang(midi, dur = 2.2) {
  const out = new Float32Array(Math.round(dur * SR));
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const bend = 1 + 0.06 * Math.exp(-t * 9);
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 6 * t);
    ph += (2 * Math.PI * mtof(midi) * bend * vib) / SR;
    const tone = Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph);
    out[i] = tone * Math.exp(-t * 2.2) * Math.min(1, t / 0.004) * 0.6;
  }
  return out;
}

function boom() {
  const out = new Float32Array(Math.round(3 * SR));
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (38 + 60 * Math.exp(-t * 12))) / SR;
    out[i] = Math.tanh(Math.sin(ph) * 2) * Math.exp(-t * 1.6);
  }
  return out;
}

// --- Partition ------------------------------------------------------------------

// Accords (une mesure chacun) : voicings ouverts en ré majeur.
const CH = {
  D: ["D3", "A3", "C#4", "E4", "F#4"],
  Bm: ["B2", "F#3", "A3", "D4", "E4"],
  G: ["G2", "D3", "F#3", "A3", "B3"],
  A: ["A2", "E3", "A3", "D4", "E4"],
  Em: ["E2", "B2", "D3", "F#3", "G3"],
  Fs: ["F#2", "C#3", "E3", "A#3", "C#4"],
};
const ROOT = { D: "D2", Bm: "B1", G: "G1", A: "A1", Em: "E2", Fs: "F#1" };

// Grille de la pièce, mesure par mesure (45 mesures de 2 s).
const SECTIONS = [
  { from: 0, to: 3, chords: ["D", "D", "Bm"], name: "ouverture" },
  { from: 3, to: 7, chords: ["Bm", "G", "Em", "Fs"], name: "noeud" },
  { from: 7, to: 16, chords: ["D", "Bm", "G", "A"], name: "embauche-rappels" },
  { from: 16, to: 21, chords: ["G", "D", "Em", "A"], name: "copilote" },
  { from: 21, to: 30, chords: ["D", "Bm", "G", "A"], name: "paie" },
  { from: 30, to: 35, chords: ["G", "D", "Bm", "A"], name: "espace" },
  { from: 35, to: 39, chords: ["D", "Bm", "G", "A"], name: "sortie" },
  { from: 39, to: 45, chords: ["Em", "A", "D", "D", "D", "D"], name: "final" },
];
const chordAt = (bar) => {
  const sec = SECTIONS.find((s) => bar >= s.from && bar < s.to);
  return { sec, chord: sec.chords[(bar - sec.from) % sec.chords.length] };
};

// Densité de chaque couche selon la mesure.
function layers(bar) {
  const { sec } = chordAt(bar);
  switch (sec.name) {
    case "ouverture": return { pad: 0.55, arp: 0, bass: 0, kick: 0, hat: 0, clap: 0 };
    case "noeud": return { pad: 0.6, arp: 0.35, bass: 0.5, kick: bar >= 4 && bar < 6 ? 0.45 : 0, hat: 0, clap: 0, pulse: true };
    case "embauche-rappels": return { pad: 0.5, arp: 0.8, bass: 0.8, kick: 0.85, hat: 0.6, clap: bar >= 10 ? 0.35 : 0 };
    case "copilote": return { pad: 0.6, arp: 0.6, bass: 0.3, kick: 0, hat: 0.35, clap: 0 };
    case "paie": return { pad: 0.5, arp: 0.9, bass: 0.9, kick: 1, hat: 0.75, clap: 0.55, lead: true };
    case "espace": return { pad: 0.6, arp: 0.7, bass: 0.55, kick: 0, hat: 0.4, clap: 0 };
    case "sortie": return { pad: 0.5, arp: 0.8, bass: 0.8, kick: 0.8, hat: 0.6, clap: 0.4 };
    case "final": return bar < 40 ? { pad: 0.5, arp: 0.7, bass: 0.7, kick: 0.7, hat: 0.6, clap: 0 } : { pad: 0, arp: 0, bass: 0, kick: 0, hat: 0, clap: 0 };
    default: return {};
  }
}

// Motif de l'arpège (en degrés de l'accord, sur 8 croches), varié une mesure sur deux.
const ARP_A = [0, 2, 3, 4, 3, 2, 4, 1];
const ARP_B = [0, 3, 4, 2, 4, 3, 1, 3];
// Petite mélodie de la paie (notes, position en croches, durée en croches), sur 4 mesures.
const LEAD = [
  ["F#5", 0, 3], ["E5", 3, 1], ["D5", 4, 2], ["A4", 6, 2],
  ["B4", 8, 3], ["D5", 11, 1], ["E5", 12, 4],
  ["D5", 16, 3], ["B4", 19, 1], ["A4", 20, 2], ["F#4", 22, 2],
  ["G4", 24, 2], ["A4", 26, 2], ["E5", 28, 4],
];

for (let bar = 0; bar < 45; bar++) {
  const t0 = bar * BAR;
  const { chord } = chordAt(bar);
  const L = layers(bar);
  const notes = CH[chord].map(m);

  if (L.pad) {
    place(t0, pad(notes, BAR + 0.1, { attack: bar === 0 ? 2.5 : 0.6, release: 1.4, cutoff: 1500 }), { gain: 0.22 * L.pad, send: 0.5 });
  }
  if (L.pulse) {
    // Tension du nœud : note répétée en doubles croches, de plus en plus présente.
    for (let k = 0; k < 16; k++) {
      const g = 0.05 + 0.12 * ((bar - 3) / 4 + k / 64);
      place(t0 + k * BEAT / 4, pluck(m("F#4") + (k % 4 === 3 ? 1 : 0), 0.3, { bright: 0.35, decay: 0.99 }), { gain: g, pan: k % 2 ? 0.3 : -0.3, send: 0.25 });
    }
  }
  if (L.arp) {
    const pattern = bar % 2 ? ARP_B : ARP_A;
    pattern.forEach((deg, k) => {
      const note = notes[deg] + 12;
      const accent = k % 4 === 0 ? 1 : 0.7;
      place(t0 + k * (BEAT / 2), pluck(note, 1.4, { bright: 0.55 + 0.2 * accent }), { gain: 0.2 * L.arp * accent, pan: Math.sin(k * 1.3) * 0.5, send: 0.35 });
    });
  }
  if (L.bass) {
    const root = m(ROOT[chord]);
    place(t0, bass(root, BEAT * 1.5), { gain: 0.3 * L.bass, send: 0.05 });
    place(t0 + BEAT * 1.75, bass(root, BEAT * 0.25), { gain: 0.18 * L.bass, send: 0.05 });
    place(t0 + BEAT * 2, bass(root + (bar % 2 ? 7 : 12), BEAT * 1.5), { gain: 0.26 * L.bass, send: 0.05 });
  }
  if (L.kick) {
    [0, 2].forEach((b) => place(t0 + b * BEAT, kick(), { gain: 0.5 * L.kick, send: 0.03 }));
    if (bar % 4 === 3) place(t0 + 3.5 * BEAT, kick(0.6), { gain: 0.5 * L.kick, send: 0.03 });
  }
  if (L.hat) {
    for (let k = 0; k < 8; k++) {
      const off = k % 2 === 1;
      place(t0 + k * (BEAT / 2) + (off ? 0.012 : 0), hat(off ? 1 : 0.55, off ? 0.08 : 0.04), { gain: 0.13 * L.hat, pan: off ? 0.35 : -0.25, send: 0.1 });
    }
  }
  if (L.clap) {
    [1, 3].forEach((b) => place(t0 + b * BEAT, clap(), { gain: 0.22 * L.clap, send: 0.35 }));
  }
  if (L.lead) {
    const phrase = (bar - 21) % 4;
    for (const [note, pos, len] of LEAD) {
      if (Math.floor(pos / 8) !== phrase) continue;
      const start = t0 + (pos % 8) * (BEAT / 2);
      place(start, bell(m(note), len * BEAT / 2 + 1.2, { ratio: 2, index: 1.1 }), { gain: 0.1, pan: 0.15, send: 0.45 });
    }
  }
}

// --- Ouverture : le fil se déroule, quelques notes pincées -------------------------
[["A4", 0.7], ["D5", 1.6], ["E5", 2.3], ["F#5", 3.0], ["A5", 4.2], ["E5", 5.0]].forEach(([n, t]) =>
  place(t, pluck(m(n), 3, { bright: 0.6, decay: 0.998 }), { gain: 0.28, pan: -0.4 + t / 8, send: 0.55 }),
);
place(0, riser(6, { from: 120, to: 1500, gain: 0.25 }), { gain: 0.5, send: 0.6 });

// --- Transitions : souffle à chaque glissement de caméra ------------------------------
const CUTS = [6, 14, 26, 32, 42, 60, 70, 78];
for (const cut of CUTS) place(cut - 0.95, whoosh(1.1, { gain: 0.9 }), { gain: 0.16, pan: 0.2, send: 0.4 });

// --- Le nœud : dispersion, fil tiré, vibration, puis silence et montée -------------------
place(10.4, whoosh(0.9, { from: 2000, to: 300 }), { gain: 0.2, send: 0.4 });
place(10.6, riser(1.5, { from: 300, to: 3000 }), { gain: 0.25, send: 0.3 });
place(12.1, twang(m("D3")), { gain: 0.55, send: 0.5 });
place(12.1, twang(m("D4"), 1.6), { gain: 0.2, pan: 0.3, send: 0.6 });
place(12.4, riser(1.6, { from: 150, to: 5000, gain: 1 }), { gain: 0.28, send: 0.45 });

// --- Embauche : frappe clavier, puis une cloche par étape -----------------------------
{
  const sentence = "Sofia arrive le jeudi 8 octobre";
  const t0 = 14 + 0.6;
  for (let i = 0; i < sentence.length; i++) {
    if (sentence[i] === " ") continue;
    place(t0 + i / 20 + (rnd() - 0.5) * 0.015, click(0.9 + rnd() * 0.2), { gain: 0.22, pan: 0.1, send: 0.08 });
  }
  place(t0 + sentence.length / 20 + 0.15, click(1.4), { gain: 0.3, send: 0.1 }); // Entrée
  const scale = ["D5", "E5", "F#5", "A5", "B5", "D6", "E6", "F#6"];
  const enter = 14 + 2.4 + 4 / 30;
  for (let i = 0; i < 8; i++) {
    const at = (170 + i * 226) / 1920;
    const reached = enter + ((at - 0.06) / 0.94) * 3.6;
    place(reached, bell(m(scale[i]), 1.8), { gain: 0.1, pan: -0.7 + i * 0.2, send: 0.45 });
  }
}

// --- Rappels : trois impulsions qui atteignent chacun ----------------------------------
[[26.9, "A5", -0.6], [27.7, "D6", 0], [28.5, "F#6", 0.6]].forEach(([t, n, p]) => {
  place(t - 0.66, riser(0.66, { from: 800, to: 5000 }), { gain: 0.12, pan: p, send: 0.2 });
  place(t, bell(m(n), 2, { ratio: 1.5, index: 1.4 }), { gain: 0.13, pan: p, send: 0.5 });
});

// --- Copilote : la question se tape, la réponse arrive -------------------------------
{
  const q = "Que dois-je anticiper cette semaine ?";
  const t0 = 32 + 1.0;
  for (let i = 0; i < q.length; i++) {
    if (q[i] === " ") continue;
    place(t0 + i / 26 + (rnd() - 0.5) * 0.012, click(0.8 + rnd() * 0.2), { gain: 0.2, pan: 0.25, send: 0.08 });
  }
  const asked = t0 + Math.ceil((q.length / 26) * 30) / 30 + 0.2;
  place(asked, bell(m("A5"), 0.8, { ratio: 2, index: 0.6 }), { gain: 0.08, pan: 0.3, send: 0.3 });
  [0, 1, 2].forEach((k) => place(asked + (34 + k * 12) / 30, bell(m(["D6", "E6", "F#6"][k]), 1.2, { ratio: 1, index: 0.5 }), { gain: 0.08, pan: 0.4, send: 0.35 }));
}

// --- Paie : saisie, contrôles, calcul, clôture ------------------------------------------
{
  const fillStart = 42 + 0.9;
  for (let i = 0; i < 17; i++) place(fillStart + (i * 5) / 30, click(0.7), { gain: 0.16, pan: -0.4 + (i % 4) * 0.25, send: 0.1 });
  const tickStart = fillStart + (17 * 5 + 6) / 30;
  for (let i = 0; i < 6; i++) place(tickStart + (i * 4) / 30, bell(m("A6"), 0.4, { ratio: 1, index: 0.3 }), { gain: 0.05, pan: 0.5, send: 0.2 });
  place(49.6 - 0.3, whoosh(0.9, { from: 400, to: 3000 }), { gain: 0.18, send: 0.3 });
  place(50.2, riser(2.2, { from: 400, to: 4000 }), { gain: 0.12, send: 0.3 });
  place(53.4, bell(m("D6"), 2.5, { ratio: 2, index: 1 }), { gain: 0.12, send: 0.5 }); // net à payer
  const stamp = 42 + 13.2 + 26 / 30;
  place(stamp, thud(), { gain: 0.5, send: 0.25 });
  place(stamp, bell(m("D5"), 2.5, { ratio: 1.5, index: 1.8 }), { gain: 0.12, send: 0.6 });
}

// --- Espace salarié : le bulletin voyage, la notification sonne -------------------------------
place(61, whoosh(1.4, { from: 500, to: 2500 }), { gain: 0.14, pan: 0.3, send: 0.4 });
place(62.4, bell(m("E6"), 1.4, { ratio: 1, index: 0.8 }), { gain: 0.16, pan: 0.5, send: 0.35 });
place(62.55, bell(m("A6"), 1.8, { ratio: 1, index: 0.8 }), { gain: 0.14, pan: 0.5, send: 0.35 });
place(64.2, click(1.3), { gain: 0.25, pan: 0.5, send: 0.1 });

// --- Sortie : trois documents publiés ----------------------------------------------------------
[1.0, 1.6, 2.2].forEach((at, i) => {
  place(70 + at, whoosh(0.35, { from: 1500, to: 4000 }), { gain: 0.1, pan: -0.5 + i * 0.5, send: 0.2 });
  place(70 + at + 22 / 30, thud(0.8), { gain: 0.32, pan: -0.5 + i * 0.5, send: 0.2 });
});

// --- Final : le fil dessine le logo, l'accord se résout -------------------------------------------
place(78, riser(2.9, { from: 200, to: 7000, gain: 1 }), { gain: 0.3, send: 0.5 });
{
  const hit = 78 + 2.9;
  place(hit, boom(), { gain: 0.55, send: 0.2 });
  place(hit, pad(["D2", "A2", "D3", "F#3", "A3", "C#4", "E4", "F#4"].map(m), 6.5, { attack: 0.04, release: 2.5, cutoff: 2600, brightness: 1.3 }), { gain: 0.3, send: 0.6 });
  ["D5", "F#5", "A5", "C#6", "E6"].forEach((n, i) => place(hit + i * 0.07, bell(m(n), 3.5, { ratio: 2, index: 1.2 }), { gain: 0.07, pan: -0.5 + i * 0.25, send: 0.7 }));
  // Rappel de l'ouverture pendant la signature.
  [["A4", 82.3], ["D5", 82.9], ["E5", 83.5], ["F#5", 84.1], ["D5", 85.6]].forEach(([n, t]) =>
    place(t, pluck(m(n), 3.5, { bright: 0.55, decay: 0.998 }), { gain: 0.26, pan: -0.3 + (t - 82) / 10, send: 0.6 }),
  );
  place(86, pad(["D3", "A3", "E4", "F#4"].map(m), 3.5, { attack: 1.5, release: 1.5, cutoff: 1200 }), { gain: 0.16, send: 0.6 });
}

// --- Réverbération (Freeverb simplifié, stéréo) --------------------------------------------------
function reverb(input, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round(((d + spread) * SR) / 44100 * 1.25));
  const allpasses = [556, 441, 341, 225].map((d) => Math.round(((d + spread) * SR) / 44100));
  const out = new Float32Array(N);
  const feedback = 0.86, damp = 0.3;
  for (const len of combs) {
    const buf = new Float32Array(len);
    let idx = 0, store = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      store = y * (1 - damp) + store * damp;
      buf[idx] = input[i] + store * feedback;
      idx = (idx + 1) % len;
      out[i] += y;
    }
  }
  for (const len of allpasses) {
    const buf = new Float32Array(len);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      idx = (idx + 1) % len;
      out[i] = y;
    }
  }
  return out;
}
// Pas de grave dans la réverbération : elle reste claire.
for (const channel of wet) {
  const hp = svf();
  for (let i = 0; i < N; i++) channel[i] = hp(channel[i], 250).high;
}
const revL = reverb(wet[0], 0);
const revR = reverb(wet[1], 23);

// --- Mixage final : réverbération, compression douce, fondus ---------------------------------------
const mixL = new Float32Array(N), mixR = new Float32Array(N);
let peak = 0;
const subL = svf(), subR = svf();
for (let i = 0; i < N; i++) {
  // Coupe l'infra-grave, inaudible sur la plupart des enceintes et qui mange la dynamique.
  mixL[i] = subL(dry[0][i] + revL[i] * 0.09, 35).high;
  mixR[i] = subR(dry[1][i] + revR[i] * 0.09, 35).high;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}
const norm = 0.9 / peak;
let env = 0;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let l = mixL[i] * norm * 1.6, r = mixR[i] * norm * 1.6;
  // Compresseur lent sur le niveau crête, puis saturation douce.
  const level = Math.max(Math.abs(l), Math.abs(r));
  env = level > env ? env + (level - env) * 0.01 : env + (level - env) * 0.0002;
  const gain = env > 0.6 ? 0.6 / env : 1;
  const fade = Math.min(1, t / 0.05) * (t > DURATION - 2.5 ? Math.max(0, (DURATION + 0.3 - t) / 2.8) : 1);
  l = Math.tanh(l * gain) * 0.92 * fade;
  r = Math.tanh(r * gain) * 0.92 * fade;
  pcm.writeInt16LE(Math.round(clamp(l, -1, 1) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(clamp(r, -1, 1) * 32767), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "soundtrack.wav");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, Buffer.concat([header, pcm]));
console.log(`soundtrack.wav : ${DURATION} s, crête normalisée (x${norm.toFixed(2)})`);
