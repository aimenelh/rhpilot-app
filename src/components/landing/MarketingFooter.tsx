import Link from "next/link";
import { Logomark, Wordmark } from "@/components/Brand";

export function MarketingFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex items-center gap-2">
        <Logomark size={22} />
        <Wordmark />
      </div>
      <p className="text-xs text-ink-faint">Votre copilote d&apos;organisation RH</p>
      <p className="max-w-sm text-xs text-ink-faint">
        Les oublis sont une conséquence. RH Pilot agit avant qu&apos;ils n&apos;arrivent.
      </p>
      <Link href="/pourquoi" className="text-xs font-medium text-brand-blue hover:underline">
        Pourquoi RH Pilot ?
      </Link>
      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <Link href="/cgu" className="hover:text-ink-soft hover:underline">
          CGU
        </Link>
        <span>·</span>
        <Link href="/confidentialite" className="hover:text-ink-soft hover:underline">
          Confidentialité
        </Link>
      </div>
    </footer>
  );
}
