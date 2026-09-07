"use client";

import { useState } from "react";

const VIDEO_SRC = "https://www.pexels.com/download/video/9034878/";
const POSTER_SRC =
  "https://images.pexels.com/photos/12662856/pexels-photo-12662856.jpeg?cs=srgb&dl=pexels-shvetsa-12662856.jpg&fm=jpg";

export function HumanWorkVideo() {
  const [videoError, setVideoError] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-[clamp(1.25rem,4vw,4.5rem)] top-[17.5rem] z-20 hidden w-[clamp(15rem,19vw,20rem)] xl:block"
    >
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-brand-primary/10">
          {videoError ? (
            <img
              src={POSTER_SRC}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={POSTER_SRC}
              onError={() => setVideoError(true)}
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-white/10" />
        </div>
      </div>
      <div className="absolute -bottom-3 -left-3 h-10 w-10 rounded-xl border border-white bg-brand-primary shadow-lg" />
      <div className="absolute -right-2 -top-2 h-5 w-5 rounded-full border-4 border-white bg-brand-primary" />
    </div>
  );
}
