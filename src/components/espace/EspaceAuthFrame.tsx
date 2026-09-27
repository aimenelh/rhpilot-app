import type { ReactNode } from "react";
import { Logomark, Wordmark } from "@/components/Brand";

/** Cadre des pages d'accès de l'espace salarié : sobre et lisible sur téléphone. */
export function EspaceAuthFrame({ children, organizationName, note }: { children: ReactNode; organizationName?: string | null; note?: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-subtle">
      <header className="flex items-center gap-2 px-5 pb-2 pt-6 sm:px-8">
        <Logomark size={26} />
        <Wordmark />
        <span className="ml-1 text-sm text-ink-faint">Espace salarié</span>
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
