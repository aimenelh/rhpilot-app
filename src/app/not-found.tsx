import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <AmbientNetwork />
      <MarketingHeader />

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
          <Compass size={26} />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-blue">Erreur 404</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
          Cette page a été oubliée.
        </h1>
        <p className="mt-4 max-w-md text-ink-soft">
          Contrairement à vos échéances RH, celle-ci ne reviendra pas toute seule vous le
          rappeler. La page que vous cherchez n&apos;existe pas, ou a changé d&apos;adresse.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/">
            <Button className="px-6 py-3 text-base">
              <span className="inline-flex items-center gap-2">
                Retour à l&apos;accueil <ArrowRight size={16} />
              </span>
            </Button>
          </Link>
          <Link href="/services" className="text-sm font-medium text-ink-soft hover:text-ink">
            Découvrir RH Pilot →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
