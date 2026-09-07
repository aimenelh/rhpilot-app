"use client";

import { useState } from "react";

const VIDEO_SRC = "https://www.pexels.com/download/video/9034878/";
const POSTER_SRC =
  "https://images.pexels.com/photos/7794041/pexels-photo-7794041.jpeg?auto=compress&cs=tinysrgb&w=1400";

export function HumanWorkVideo() {
  const [videoError, setVideoError] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="human-work-video pointer-events-none absolute right-[clamp(1.5rem,5vw,5rem)] top-[16rem] z-20 hidden w-[clamp(27rem,35vw,37rem)] lg:block"
    >
      <div className="overflow-hidden rounded-[1.75rem] border-[6px] border-white bg-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[1.2rem] bg-brand-primary/10">
          {videoError ? (
            <img src={POSTER_SRC} alt="" className="h-full w-full object-cover" />
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
        </div>
      </div>
    </div>
  );
}
