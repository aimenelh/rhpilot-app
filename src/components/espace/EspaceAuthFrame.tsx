import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logomark, Wordmark } from "@/components/Brand";

/** Cadre des pages d'accès de l'espace salarié : sobre et lisible sur téléphone. */
export function EspaceAuthFrame({ children, organizationName, note }: { children: ReactNode; organizationName?: string | null; note?: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-subtle">
      <header className="flex items-center gap-2 px-5 pb-2 pt-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-md" aria-label="RH Pilot, retour à l’accueil du site">
          <Logomark size={26} />
          <Wordmark />
        </Link>
        <span className="ml-1 text-sm text-ink-faint">Espace salarié</span>
        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-ink-soft hover:bg-white hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Retour au site</span>
          <span className="sm:hidden">Accueil</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pb-10 pt-4 sm:justify-center sm:pt-0">
        <div className="w-full max-w-[420px] rounded-2xl border border-surface-border bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          {organizationName ? <p className="mb-4 text-sm text-ink-soft">Espace salarié de <strong className="font-semibold text-ink">{organizationName}</strong></p> : null}
          {children}
        </div>
        {note ? <div className="mt-5 w-full max-w-[420px] px-1 text-center text-xs leading-5 text-ink-faint">{note}</div> : null}
      </main>
    </div>
  );
}
