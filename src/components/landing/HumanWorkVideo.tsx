"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logomark, Wordmark } from "@/components/Brand";

const VIDEO_SRC = "https://www.pexels.com/download/video/9034878/";
const END_MESSAGE = "Moins de relances. Plus de temps pour l’humain.";

export function HumanWorkVideo({ className = "" }: { className?: string }) {
  const [showEndCard, setShowEndCard] = useState(false);
  const [typedMessage, setTypedMessage] = useState("");
  const [showBrand, setShowBrand] = useState(false);

  useEffect(() => {
    if (!showEndCard) return;

    setTypedMessage("");
    setShowBrand(false);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedMessage(END_MESSAGE.slice(0, index));
      if (index >= END_MESSAGE.length) {
        window.clearInterval(timer);
        window.setTimeout(() => setShowBrand(true), 260);
      }
    }, 42);

    return () => window.clearInterval(timer);
  }, [showEndCard]);

  return (
    <div className={`human-work-video pointer-events-none absolute z-30 ${className}`}>
      <div className="human-work-video-shape human-work-video-shape-back" />
      <div className="human-work-video-shape human-work-video-shape-mid" />
      <div className="human-work-video-dots" />

      <div className="human-work-video-frame relative overflow-visible rounded-[1.75rem] border-[6px] border-white bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[1.2rem] bg-brand-primary/10">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={() => setShowEndCard(true)}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>

          <div
            aria-hidden={!showEndCard}
            className={`absolute inset-0 z-20 flex items-center justify-center bg-white/88 backdrop-blur-[2px] transition-opacity duration-700 ease-out ${
              showEndCard ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div
              className={`flex flex-col items-center text-center transition-opacity duration-300 ease-out ${
                showEndCard ? "opacity-100" : "opacity-0"
              }`}
            >
              <p
                className="min-h-[2.8em] max-w-[90%] font-handwriting text-[1.65rem] leading-tight text-brand-primary sm:text-[2rem]"
                aria-label={END_MESSAGE}
              >
                {typedMessage}
                <span className="ml-0.5 inline-block h-[1.05em] w-px translate-y-[0.12em] bg-brand-primary/70 motion-safe:animate-pulse" aria-hidden="true" />
              </p>

              <div
                className={`transition-all duration-700 ease-out ${
                  showBrand ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
              >
                <Link
                  href="/"
                  aria-label="RH Pilot"
                  className="flex items-center gap-3 hover:scale-[1.03] transition-transform duration-300"
                >
                  <Logomark size={46} />
                  <Wordmark />
                </Link>
                <Link
                  href="/pourquoi"
                  className="mt-5 block text-base font-semibold text-ink transition-colors hover:text-brand-primary"
                >
                  En savoir plus →
                </Link>
              </div>
            </div>
          </div>
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
