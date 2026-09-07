"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const VIDEO_SRC = "https://www.pexels.com/download/video/9034878/";
const POSTER_SRC =
  "https://images.pexels.com/photos/7794041/pexels-photo-7794041.jpeg?auto=compress&cs=tinysrgb&w=1400";

export function HumanWorkVideo() {
  const pathname = usePathname();
  const [videoError, setVideoError] = useState(false);

  if (pathname !== "/") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="human-work-video pointer-events-none absolute right-[clamp(1rem,5vw,5rem)] top-[clamp(10rem,13vw,13rem)] z-20 hidden w-[clamp(29rem,39vw,41rem)] lg:block"
    >
      <div className="human-work-video-shape human-work-video-shape-back" />
      <div className="human-work-video-shape human-work-video-shape-mid" />
      <div className="human-work-video-dots" />

      <div className="human-work-video-frame relative overflow-visible rounded-[1.75rem] border-[6px] border-white bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
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

        <div className="human-work-video-note absolute -bottom-20 -right-12 w-52 rotate-[-3deg] text-brand-primary">
          <span className="block font-handwriting text-[1.55rem] leading-[1.05]">
            Des équipes RH
            <br />
            plus sereines
          </span>
          <svg
            className="absolute -right-5 -top-7 h-20 w-20"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 78C43 79 69 60 73 28C74 20 73 14 70 9"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M70 9L82 18M70 9L66 23"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
