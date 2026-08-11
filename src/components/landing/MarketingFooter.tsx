import Link from "next/link";
import { Logomark, Wordmark } from "@/components/Brand";

const PRODUCT_LINKS = [
  { href: "/services", label: "Nos services" },
  { href: "/pourquoi", label: "Pourquoi RH Pilot ?" },
  { href: "/sign-up", label: "Essayer gratuitement" },
  { href: "/sign-in", label: "Se connecter" },
];

const LEGAL_LINKS = [
  { href: "/cgu", label: "CGU" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-surface-border">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 px-6 py-14 sm:grid-cols-4">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <Logomark size={24} />
            <Wordmark />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-ink-faint">
            Les oublis sont une conséquence. RH Pilot agit avant qu&apos;ils n&apos;arrivent.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Produit</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-soft transition-colors hover:text-ink hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Légal</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-soft transition-colors hover:text-ink hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-surface-border px-6 py-6">
        <p className="mx-auto max-w-6xl text-center text-xs text-ink-faint">
          © {year} RH Pilot — Version bêta
        </p>
      </div>
    </footer>
  );
}
