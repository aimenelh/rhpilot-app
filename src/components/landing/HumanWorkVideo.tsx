"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

const VIDEO_SRC = "https://www.pexels.com/download/video/9034878/";

export function HumanWorkVideo() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <>
      <style>{`
        /* The old landing hero is intentionally hidden only when this new
           editorial hero is mounted on the home page. Other landing sections
           remain untouched. */
        body:has(.rhpilot-editorial-hero) .min-h-screen > section:first-of-type {
          display: none;
        }
      `}</style>

      <div className="rhpilot-editorial-hero relative z-10 overflow-hidden bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:px-8 sm:pb-24 sm:pt-24 lg:pt-28">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">
              RH Pilot · Gestion RH
            </p>

            <h1 className="mx-auto mt-5 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-ink sm:text-6xl lg:text-[5.4rem]">
              Embauche. Période d&apos;essai. Visite médicale.
              <br />
              <span className="text-brand-primary">Rien n&apos;est oublié.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              RH Pilot transforme chaque événement RH en plan d&apos;action clair, avec ses
              échéances et ses responsables.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <Link href="/sign-up">
                <Button className="px-6 py-3 text-base">
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link
                href="/sign-in"
                className="text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                J&apos;ai déjà un compte →
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-ink-faint">
              <span>Embauches</span>
              <span aria-hidden>·</span>
              <span>Paie</span>
              <span aria-hidden>·</span>
              <span>Absences</span>
              <span aria-hidden>·</span>
              <span>Échéances</span>
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
            <div
              aria-hidden
              className="absolute inset-x-8 top-7 -z-10 h-[72%] rounded-[3rem] bg-brand-primary/[0.075]"
            />

            <div className="relative mx-auto max-w-4xl">
              <div className="overflow-hidden rounded-[2rem] border border-surface-border bg-white p-2 shadow-[0_30px_90px_rgba(20,21,26,0.13)] sm:p-3">
                <div className="overflow-hidden rounded-[1.45rem] bg-ink">
                  <div className="aspect-video">
                    <video
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    >
                      <source src={VIDEO_SRC} type="video/mp4" />
                    </video>
                  </div>
                </div>
              </div>

              <Image
                src="/illustrations/illu-copilote-hero.png"
                alt=""
                width={802}
                height={1274}
                className="pointer-events-none absolute -bottom-14 -right-8 h-44 w-auto object-contain sm:-bottom-20 sm:-right-16 sm:h-56"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
