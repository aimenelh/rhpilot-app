import { Download } from "lucide-react";

const PUBLISHED = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });

/** Une ligne de document : toute la ligne ouvre le PDF, journalisé côté serveur. */
export function DocumentRow({ id, title, subtitle, publishedAt, isNew }: { id: string; title: string; subtitle?: string; publishedAt: Date; isNew: boolean }) {
  return (
    <a href={`/api/espace/documents/${id}`} target="_blank" rel="noopener" className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition hover:bg-surface-subtle/60 active:bg-surface-subtle sm:px-5">
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{title}</span>
          {isNew ? <span className="shrink-0 text-xs font-semibold text-brand-primary">Nouveau</span> : null}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-faint">{subtitle ? `${subtitle} · ` : ""}Publié le {PUBLISHED.format(publishedAt)}</span>
      </span>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-soft" aria-hidden>
        <Download size={17} />
      </span>
      <span className="sr-only">Ouvrir le PDF</span>
    </a>
  );
}
