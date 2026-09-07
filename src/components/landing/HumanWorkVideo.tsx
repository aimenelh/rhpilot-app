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
      className="human-work-video pointer-events-none absolute right-[clamp(2rem,7vw,7rem)] top-[15.5rem] z-20 hidden w-[clamp(27rem,36vw,38rem)] lg:block"
    >
      <div className="relative">
        <div className="absolute -left-14 top-2 rounded-2xl border border-brand-primary/10 bg-white/95 px-5 py-3 shadow-[0_12px_35px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <span className="text-lg font-semibold">✦</span>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Des équipes RH plus sereines</p>
              <p className="mt-0.5 text-[11px] text-ink-soft">Le quotidien, sans les oublis</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border-[6px] border-white bg-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[1rem] bg-brand-primary/10">
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
            <div className="absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-white/5" />
            <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-lg">
              <span className="ml-1 text-lg text-brand-primary">▶</span>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-7 -right-8 rounded-2xl border border-white bg-white px-5 py-3 shadow-[0_16px_45px_rgba(15,23,42,0.12)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <span className="text-sm font-bold">↗</span>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Moins d’administratif</p>
              <p className="text-[11px] text-ink-soft">plus de temps pour l’humain</p>
            </div>
          </div>
        </div>

        <div className="absolute -right-10 -top-10 h-16 w-16 rotate-12 rounded-full border-[5px] border-brand-primary/70 border-l-transparent border-b-transparent" />
      </div>

      <div className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-ink-soft">
        <span className="italic">Découvrez RH Pilot en 30 secondes</span>
        <span className="text-xl text-brand-primary">↗</span>
      </div>
    </div>
  );
}
