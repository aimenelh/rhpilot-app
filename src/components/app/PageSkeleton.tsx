// Squelette affiché pendant le chargement d'une page de l'application.
// Il n'apparaît qu'après un court délai : une page rapide s'affiche
// directement, sans clignotement.

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="page-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="skeleton-block h-4 w-28" />
      <div className="skeleton-block mt-3 h-8 w-72 max-w-full" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-xl border border-surface-border bg-white p-4">
            <div className="skeleton-block h-3 w-24" />
            <div className="skeleton-block mt-3 h-5 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-surface-border bg-white">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-surface-border px-4 py-3.5 last:border-b-0">
            <div className="skeleton-block h-8 w-8 rounded-full" />
            <div className="flex-1">
              <div className="skeleton-block h-3.5" style={{ width: `${55 - index * 6}%` }} />
              <div className="skeleton-block mt-2 h-3 w-24" />
            </div>
            <div className="skeleton-block h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
