"use client";

import { useEffect, useState } from "react";

// Séquence en 4 temps : il verse tranquillement -> ça déborde -> tache
// sur la chemise -> il hausse les épaules, désinvolte. Boucle ensuite
// à l'infini. Les 4 images ont été découpées d'une même planche
// générée en un seul appel, avec un cadrage rigoureusement identique
// (vérifié avant intégration) — condition nécessaire pour un
// enchaînement fluide sans saut de position.
const FRAMES = [
  "/illustrations/mascot/coffee-1-anticipation.png",
  "/illustrations/mascot/coffee-2-debordement.png",
  "/illustrations/mascot/coffee-3-oups.png",
  "/illustrations/mascot/coffee-4-desinvolte.png",
];

const FRAME_MS = 900;

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
      {/* Les 4 images restent chargées en permanence, seule leur
          opacité change — évite tout échange de source en cours de
          transition (c'est ce qui causait le dédoublement visuel de
          la version précédente à 2 calques). */}
      {FRAMES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- séquence
        // décorative locale, next/image ajoute peu de valeur ici et
        // complique le fondu croisé par calques.
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ease-in-out"
          style={{ opacity: index === i ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
