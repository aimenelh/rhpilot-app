import Link from "next/link";
import { Logomark, Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";

export function MarketingHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-2">
        <Logomark size={30} />
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-6">
        <Link
          href="/pourquoi"
          className="text-sm font-medium text-ink-soft hover:text-ink"
        >
          Pourquoi RH Pilot ?
        </Link>
        <Link href="/sign-in" className="text-sm font-medium text-ink-soft hover:text-ink">
          Se connecter
        </Link>
        <Link href="/sign-up">
          <Button>Essayer gratuitement</Button>
        </Link>
      </nav>
    </header>
  );
}
