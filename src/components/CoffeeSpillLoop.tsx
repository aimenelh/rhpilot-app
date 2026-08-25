"use client";

import { useEffect, useState } from "react";

// Séquence élargie en 10 temps (remplace l'ancienne version à 4
// poses) : il boit tranquillement, ça déborde progressivement, tache
// sur la chemise, il l'essuie, geste désinvolte, retour au calme.
// Boucle à l'infini. Cadrage vérifié cohérent entre toutes les poses
// (issues d'un même rendu en une seule planche).
const FRAMES = [
  "/illustrations/mascot/coffee-scene-1-anticipation.png",
  "/illustrations/mascot/coffee-scene-2-gorgee.png",
  "/illustrations/mascot/coffee-scene-3-gorgee-2.png",
  "/illustrations/mascot/coffee-scene-4-debut-debordement.png",
  "/illustrations/mascot/coffee-scene-5-debordement.png",
  "/illustrations/mascot/coffee-scene-6-tache-legere.png",
  "/illustrations/mascot/coffee-scene-7-tache.png",
  "/illustrations/mascot/coffee-scene-8-essuie.png",
  "/illustrations/mascot/coffee-scene-9-desinvolte.png",
  "/illustrations/mascot/coffee-scene-10-normal.png",
];

const FRAME_MS = 500;

export function CoffeeSpillLoop({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className ?? ""}`}>
      {FRAMES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- séquence
        // décorative locale, next/image ajoute peu de valeur ici et
        // complique le fondu croisé par calques.
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-in-out"
          style={{ opacity: index === i ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
