"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

const VIDEO_SRC = "https://www.pexels.com/download/video/9034878/";

export function HumanWorkVideo() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <>
      <style>{`
        body:has(.rhpilot-editorial-hero) .min-h-screen > section:first-of-type {
          display: none;
        }
      `}</style>

      <section className="rhpilot-editorial-hero relative z-10 overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-20 lg:pt-24">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary">
              Le copilote du quotidien RH
            </p>
            <h1 className="mx-auto mt-5 max-w-5xl text-5xl font-semibold leading-[0.96] tracking-[-0.05em] text-ink sm:text-6xl lg:text-[5.35rem]">
              Embauche. Période d&apos;essai. Visite médicale.
              <br />
              <span className="text-brand-primary">Rien n&apos;est oublié.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              RH Pilot rassemble les actions, les échéances et les informations dont vous avez besoin pour suivre votre quotidien RH.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <Link href="/sign-up">
                <Button className="px-6 py-3 text-base">
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/sign-in" className="text-sm font-semibold text-ink-soft transition-colors hover:text-ink">
                J&apos;ai déjà un compte →
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-ink-faint">
              <span>Embauches</span><span aria-hidden>·</span><span>Paie</span><span aria-hidden>·</span><span>Absences</span><span aria-hidden>·</span><span>Échéances</span>
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
            <div aria-hidden className="absolute inset-x-10 top-10 -z-10 h-44 rounded-[3rem] bg-brand-primary/[0.06]" />
            <div className="relative mx-auto max-w-5xl">
              <div className="overflow-hidden rounded-[1.9rem] border border-surface-border bg-white p-2 shadow-[0_28px_70px_rgba(20,21,26,0.12)] sm:p-3">
                <div className="overflow-hidden rounded-[1.35rem] bg-ink">
                  <div className="aspect-[16/6.7] min-h-[240px] sm:min-h-[300px]">
                    <video className="h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata">
                      <source src={VIDEO_SRC} type="video/mp4" />
                    </video>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-[-7.5rem] max-w-4xl px-4 sm:mt-[-9rem] sm:px-10">
              <div className="overflow-visible rounded-[1.6rem] border border-surface-border bg-white p-2 shadow-[0_24px_70px_rgba(20,21,26,0.14)] sm:p-3">
                <Image
                  src="/marketing/dashboard.png"
                  alt="Tableau de bord RH Pilot"
                  width={1885}
                  height={1030}
                  className="block w-full rounded-[1.15rem]"
                  priority
                />
                <Image
                  src="/illustrations/illu-copilote-hero.png"
                  alt=""
                  width={802}
                  height={1274}
                  className="pointer-events-none absolute -right-2 -top-20 h-44 w-auto object-contain sm:-right-8 sm:-top-28 sm:h-60"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
