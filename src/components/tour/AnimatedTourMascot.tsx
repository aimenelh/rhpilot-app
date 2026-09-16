"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Mascot, type MascotPose } from "@/components/Mascot";

const INTRO_FRAMES = [
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

export function AnimatedTourMascot({
  pose,
  stepKey,
}: {
  pose: MascotPose;
  stepKey: number;
}) {
  const [frameIndex, setFrameIndex] = useState<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setFrameIndex(null);
      return;
    }

    let index = 0;
    setFrameIndex(0);
    const interval = window.setInterval(() => {
      index += 1;
      if (index >= INTRO_FRAMES.length) {
        window.clearInterval(interval);
        setFrameIndex(null);
        return;
      }
      setFrameIndex(index);
    }, 85);

    return () => window.clearInterval(interval);
  }, [stepKey]);

  return (
    <div className="relative h-32 w-32 max-sm:h-24 max-sm:w-24" aria-hidden="true">
      <style>{`
        @keyframes tourMascotIdle {
          0%, 100% { transform: translateY(0) rotate(-0.4deg); }
          50% { transform: translateY(-5px) rotate(0.5deg); }
        }
        @keyframes tourMascotShadow {
          0%, 100% { transform: translateX(-50%) scaleX(1); opacity: .15; }
          50% { transform: translateX(-50%) scaleX(.88); opacity: .1; }
        }
        .tour-mascot-idle { animation: tourMascotIdle 2.8s ease-in-out infinite; transform-origin: 50% 90%; }
        .tour-mascot-shadow { animation: tourMascotShadow 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tour-mascot-idle, .tour-mascot-shadow { animation: none !important; }
        }
      `}</style>

      <div className="tour-mascot-shadow absolute bottom-1 left-1/2 h-2.5 w-16 -translate-x-1/2 rounded-[100%] bg-black blur-[5px]" />

      {frameIndex !== null ? (
        <Image
          key={INTRO_FRAMES[frameIndex]}
          src={INTRO_FRAMES[frameIndex]}
          alt=""
          fill
          sizes="128px"
          className="object-contain object-bottom"
          priority
        />
      ) : (
        <div className="tour-mascot-idle absolute inset-0 flex items-end justify-center">
          <Mascot pose={pose} className="h-full w-auto max-w-none object-contain object-bottom" />
        </div>
      )}
    </div>
  );
}
