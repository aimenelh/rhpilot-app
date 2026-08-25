"use client";

import { useEffect, useState } from "react";

// Histoire à sens unique (pas une boucle) : il cherche -> il trouve,
// content -> le document lui échappe -> il le récupère, désinvolte.
// Contrairement à CoffeeSpillLoop, ces 4 images n'ont pas un cadrage
// parfaitement identique d'une case à l'autre (vérifié : même la
// ligne de bureau bouge légèrement entre les poses) — un fondu croisé
// ferait ressortir ce décalage sous forme de flou disgracieux. On
// utilise donc une coupure nette entre chaque pose, ce qui reste
// lisible pour une histoire racontée une seule fois, façon cases de
// bande dessinée plutôt que mouvement continu.
const FRAMES = [
  "/illustrations/mascot/signup-1-recherche.png",
  "/illustrations/mascot/signup-2-trouve.png",
  "/illustrations/mascot/signup-3-echappe.png",
  "/illustrations/mascot/signup-4-recupere.png",
];

const FRAME_MS = 900;

export function SignupSearchSequence({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= FRAMES.length - 1) return; // reste sur la dernière pose, ne boucle pas
    const timeout = setTimeout(() => setIndex((current) => current + 1), FRAME_MS);
    return () => clearTimeout(timeout);
  }, [index]);

  return (
    <img
      src={FRAMES[index]}
      alt=""
      className={`object-contain ${className ?? ""}`}
    />
  );
}
