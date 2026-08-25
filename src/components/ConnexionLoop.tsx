"use client";

import { useEffect, useState } from "react";

// "Allez... démarre !" — 10 poses, en boucle tant que la connexion
// dure. Contrairement à CoffeeSpillLoop, le cadrage n'est pas
// parfaitement identique d'une pose à l'autre malgré deux tentatives
// de régénération (l'ordinateur/la tasse dérivent légèrement) — on
// utilise donc une coupure nette plutôt qu'un fondu, qui ferait
// ressortir ce décalage. Coupure nette + boucle reste lisible et
// amusant, juste moins "soyeux" que le café.
const FRAMES = [
  "/illustrations/mascot/connexion-1-normal.png",
  "/illustrations/mascot/connexion-2-clic.png",
  "/illustrations/mascot/connexion-3-attente.png",
  "/illustrations/mascot/connexion-4-incline.png",
  "/illustrations/mascot/connexion-5-perplexe.png",
  "/illustrations/mascot/connexion-6-approche.png",
  "/illustrations/mascot/connexion-7-souffle.png",
  "/illustrations/mascot/connexion-8-etincelles.png",
  "/illustrations/mascot/connexion-9-redresse.png",
  "/illustrations/mascot/connexion-10-fin.png",
];

const FRAME_MS = 500;

export function ConnexionLoop({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src={FRAMES[index]}
      alt=""
      className={`object-contain ${className ?? ""}`}
    />
  );
}
