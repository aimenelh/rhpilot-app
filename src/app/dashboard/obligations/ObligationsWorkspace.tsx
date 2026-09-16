"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type {
  ComplianceSnapshot,
  LegalObligationItem,
  ObligationStatus,
} from "@/lib/compliance/obligations";

type Tab = "overview" | "timeline" | "reference";

const STATUS_META: Record<
  ObligationStatus,
  { label: string; classes: string; icon: typeof AlertTriangle }
> = {
  TO_DO: {
    label: "À traiter",
    classes: "bg-red-50 text-red-700 ring-red-100",
    icon: AlertTriangle,
  },
  UPCOMING: {
    label: "À venir",
    classes: "bg-blue-50 text-blue-700 ring-blue-100",
    icon: CalendarClock,
  },
  COMPLIANT: {
    label: "Conforme",
    classes: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    icon: CheckCircle2,
  },
  INFO_NEEDED: {
    label: "Information manquante",
    classes: "bg-amber-50 text-amber-700 ring-amber-100",
    icon: CircleHelp,
  },
  MONITOR: {
    label: "À surveiller",
    classes: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: ShieldCheck,
  },
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ status }: { status: ObligationStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${meta.classes}`}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

function ObligationCard({ item, onOpen }: { item: LegalObligationItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-surface-border bg-white p-4 text-left transition hover:border-brand-primary/20 hover:shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            {item.scope === "ORGANIZATION" ? <Building2 size={14} /> : <UserRound size={14} />}
            <span className="truncate">{item.subjectLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{item.category}</span>
          </div>
          <h3 className="mt-2 font-semibold text-ink">{item.title}</h3>
          <p className="mt-1 text-sm leading-5 text-ink-soft">{item.summary}</p>
          {item.dueDate ? (
            <p className="mt-2 text-xs font-medium text-ink-faint">Échéance : {formatDate(item.dueDate)}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={item.status} />
          <ChevronRight
            size={17}
            className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-soft"
          />
        </div>
      </div>
    </button>
  );
}

function DetailDrawer({ item, onClose }: { item: LegalObligationItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={item.title}>
      <button
        type="button"
        className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Fermer le dossier"
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-surface-border bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-surface-border bg-white/95 px-5 py-5 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-subtle hover:text-ink"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Dossier obligation</p>
          <h2 className="mt-1 pr-10 text-xl font-semibold text-ink">{item.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{item.subjectLabel}</p>
          <div className="mt-3"><StatusBadge status={item.status} /></div>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-6">
          <section className="rounded-xl border border-surface-border bg-surface-subtle/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Pourquoi cette obligation apparaît</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{item.why}</p>
          </section>

          {item.dueDate ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Échéance calculée</p>
              <p className="mt-2 text-lg font-semibold text-ink">{formatDate(item.dueDate)}</p>
            </section>
          ) : null}

          {item.missingData.length > 0 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Informations à compléter</p>
              <div className="mt-2 space-y-2">
                {item.missingData.map((missing) => (
                  <div key={missing} className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2.5 text-sm text-amber-900">
                    <CircleHelp size={16} className="mt-0.5 shrink-0" />
                    <span>{missing}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-faint">
                RH Pilot préfère demander cette donnée plutôt que conclure automatiquement à une conformité ou à un manquement.
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border border-surface-border p-4">
            <div className="flex items-start gap-3">
              <BookOpenCheck size={18} className="mt-0.5 shrink-0 text-brand-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Source officielle</p>
                <p className="mt-1 text-xs text-ink-faint">{item.source.reference}</p>
                <p className="mt-1 text-xs text-ink-faint">Référentiel vérifié le {formatDate(item.source.checkedAt)}</p>
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline"
                >
                  {item.source.name}
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function ObligationsWorkspace({ snapshot }: { snapshot: ComplianceSnapshot }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<LegalObligationItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<ObligationStatus | "ALL">("ALL");

  const filtered = useMemo(
    () => snapshot.items.filter((item) => statusFilter === "ALL" || item.status === statusFilter),
    [snapshot.items, statusFilter],
  );

  const ordered = useMemo(() => {
    const priority: Record<ObligationStatus, number> = {
      TO_DO: 0,
      INFO_NEEDED: 1,
      UPCOMING: 2,
      MONITOR: 3,
      COMPLIANT: 4,
    };
    return [...filtered].sort((a, b) => {
      const statusDiff = priority[a.status] - priority[b.status];
      if (statusDiff !== 0) return statusDiff;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.title.localeCompare(b.title, "fr");
    });
  }, [filtered]);

  const timeline = useMemo(
    () => [...snapshot.items].filter((item) => item.dueDate).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
    [snapshot.items],
  );

  return (
    <>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-white p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-ink-faint">À traiter</p><AlertTriangle size={17} className="text-red-500" /></div>
          <p className="mt-2 text-2xl font-semibold text-ink">{snapshot.stats.toDo}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-ink-faint">À venir / surveiller</p><CalendarClock size={17} className="text-blue-500" /></div>
          <p className="mt-2 text-2xl font-semibold text-ink">{snapshot.stats.upcoming}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-ink-faint">Conformes</p><CheckCircle2 size={17} className="text-emerald-500" /></div>
          <p className="mt-2 text-2xl font-semibold text-ink">{snapshot.stats.compliant}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-ink-faint">Informations manquantes</p><CircleHelp size={17} className="text-amber-500" /></div>
          <p className="mt-2 text-2xl font-semibold text-ink">{snapshot.stats.infoNeeded}</p>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-3 border-b border-surface-border sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {([
            ["overview", "Vue d'ensemble"],
            ["timeline", "Échéancier"],
            ["reference", "Référentiel"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                tab === key ? "border-brand-primary text-brand-primary" : "border-transparent text-ink-faint hover:text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ObligationStatus | "ALL")}
            className="mb-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink"
            aria-label="Filtrer par statut"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="TO_DO">À traiter</option>
            <option value="INFO_NEEDED">Information manquante</option>
            <option value="UPCOMING">À venir</option>
            <option value="MONITOR">À surveiller</option>
            <option value="COMPLIANT">Conforme</option>
          </select>
        ) : null}
      </div>

      {tab === "overview" ? (
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Suivi des obligations</h2>
              <p className="mt-1 text-sm text-ink-soft">Les points qui nécessitent une action ou une information apparaissent en premier.</p>
            </div>
            <span className="text-xs text-ink-faint">{ordered.length} dossier{ordered.length > 1 ? "s" : ""}</span>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {ordered.map((item) => <ObligationCard key={item.id} item={item} onOpen={() => setSelected(item)} />)}
          </div>
          {ordered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border px-5 py-10 text-center text-sm text-ink-faint">Aucune obligation ne correspond à ce filtre.</div>
          ) : null}
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className="mt-5 rounded-xl border border-surface-border bg-white">
          <div className="border-b border-surface-border px-5 py-4">
            <h2 className="font-semibold text-ink">Échéancier calculé</h2>
            <p className="mt-1 text-xs text-ink-faint">Seules les échéances calculables à partir des données actuellement connues sont affichées.</p>
          </div>
          <div className="divide-y divide-surface-border">
            {timeline.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelected(item)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-surface-subtle/50">
                <div className="w-24 shrink-0 text-sm font-semibold text-ink">{formatDate(item.dueDate)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">{item.subjectLabel}</p>
                </div>
                <StatusBadge status={item.status} />
                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </button>
            ))}
            {timeline.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink-faint">Aucune échéance calculable pour le moment.</p> : null}
          </div>
        </section>
      ) : null}

      {tab === "reference" ? (
        <section className="mt-5 grid gap-3 lg:grid-cols-3">
          {snapshot.rules.map((rule) => (
            <article key={rule.key} className="flex flex-col rounded-xl border border-surface-border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">{rule.category}</p>
                  <h2 className="mt-1 font-semibold text-ink">{rule.title}</h2>
                </div>
                <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[10px] font-semibold text-ink-faint">v{rule.version}</span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-6 text-ink-soft">{rule.description}</p>
              <div className="mt-4 border-t border-surface-border pt-4">
                <p className="text-xs text-ink-faint">{rule.source.reference}</p>
                <p className="mt-1 text-xs text-ink-faint">Vérifié le {formatDate(rule.source.checkedAt)}</p>
                <a href={rule.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline">
                  Voir la source officielle <ExternalLink size={14} />
                </a>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <p className="mt-6 max-w-4xl text-xs leading-5 text-ink-faint">
        RH Pilot organise les informations et échéances connues à partir des données de l'entreprise et de sources officielles. Une information absente reste signalée comme telle : le module ne remplace pas une analyse juridique adaptée à une situation particulière.
      </p>

      {selected ? <DetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
