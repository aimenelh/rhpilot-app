"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logomark, Wordmark } from "@/components/Brand";

const VIDEO_SRC = "https://www.pexels.com/download/video/8103022/?v=8103022";
const MAX_VIDEO_SECONDS = 8;
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
        window.setTimeout(() => setShowBrand(true), 360);
      }
    }, 78);

    return () => window.clearInterval(timer);
  }, [showEndCard]);

  return (
    <>
      <style>{`
        @keyframes rhpilot-video-wash {
          0% { opacity: 0; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes rhpilot-video-glow {
          0%, 100% { opacity: .12; transform: scale(.94); }
          50% { opacity: .3; transform: scale(1.08); }
        }
        @keyframes rhpilot-brand-in {
          0% { opacity: 0; transform: translateY(10px) scale(.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 1023px) {
          .min-h-screen:has(#copilote) > section:nth-of-type(3) img[src*="illu-copilote-hero"] {
            top: -12px !important;
            right: 5% !important;
            height: 100px !important;
            width: auto !important;
            transform: none !important;
            z-index: 40 !important;
          }
        }
      `}</style>

      <div className={`human-work-video pointer-events-none absolute z-30 ${className}`}>
        <div className="human-work-video-shape human-work-video-shape-back" />
        <div className="human-work-video-shape human-work-video-shape-mid" />
        <div className="human-work-video-dots" />

        <div className="human-work-video-frame relative overflow-visible rounded-[1.75rem] border-[6px] border-white bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[1.2rem] bg-[#fff1ed]">
            <video
              className="h-full w-full object-cover brightness-[1.04] saturate-[1.02]"
              autoPlay
              muted
              playsInline
              preload="metadata"
              onTimeUpdate={(event) => {
                if (event.currentTarget.currentTime >= MAX_VIDEO_SECONDS) {
                  event.currentTarget.pause();
                  event.currentTarget.currentTime = MAX_VIDEO_SECONDS;
                  setShowEndCard(true);
                }
              }}
              onEnded={() => setShowEndCard(true)}
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>

            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background:
                  "linear-gradient(135deg, rgba(244,111,97,0.10) 0%, rgba(255,154,118,0.05) 45%, rgba(255,247,244,0.02) 100%)",
                mixBlendMode: "soft-light",
              }}
            />

            <div
              aria-hidden={!showEndCard}
              className={`absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-[#fffaf8]/96 backdrop-blur-[3px] transition-all duration-1000 ease-out ${
                showEndCard ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div
                className={`pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#f46f61]/20 blur-3xl transition-opacity duration-1000 ${showEndCard ? "opacity-100" : "opacity-0"}`}
                style={{ animation: showEndCard ? "rhpilot-video-glow 5s ease-in-out infinite" : undefined }}
              />
              <div
                className={`pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#ff9a76]/20 blur-3xl transition-opacity duration-1000 ${showEndCard ? "opacity-100" : "opacity-0"}`}
                style={{ animation: showEndCard ? "rhpilot-video-glow 6s ease-in-out 1s infinite" : undefined }}
              />

              <div
                className={`relative flex flex-col items-center text-center transition-opacity duration-500 ease-out ${
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
                  className={`mt-1 transition-all duration-700 ease-out ${
                    showBrand ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                  }`}
                  style={{ animation: showBrand ? "rhpilot-brand-in 700ms ease-out both" : undefined }}
                >
                  <Link
                    href="/"
                    aria-label="RH Pilot"
                    className="flex items-center gap-3 transition-transform duration-300 hover:scale-[1.03]"
                  >
                    <Logomark size={46} />
                    <Wordmark />
                  </Link>
                  <Link
                    href="/pourquoi"
                    className="group mt-5 block text-base font-semibold text-ink transition-colors hover:text-brand-primary"
                  >
                    En savoir plus <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
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
    </>
  );
}
