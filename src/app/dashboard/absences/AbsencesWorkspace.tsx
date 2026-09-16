"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  FileClock,
  Filter,
  LayoutList,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  createAbsence,
  deleteAbsence,
  rejectAbsence,
  rejectAbsenceJustification,
  updateAbsence,
  uploadAbsenceJustification,
  validateAbsence,
  validateAbsenceJustification,
} from "./actions";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
};

type Justification = {
  id: string;
  status: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  storageKey: string | null;
  rejectionReason: string | null;
};

export type AbsenceWorkspaceItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string | null;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  justificationRequired: boolean;
  notes: string | null;
  payrollImpactStatus: string;
  justification: Justification | null;
};

type Tab = "planning" | "list" | "justifications";
type EditorMode = "create" | "edit";

type Props = {
  employees: Employee[];
  absences: AbsenceWorkspaceItem[];
  isAdmin: boolean;
  initialStats: {
    today: number;
    pending: number;
    justificationAttention: number;
    validatedThisMonth: number;
  };
};

const TYPE_META: Record<string, { label: string; short: string; color: string; dot: string }> = {
  PAID_LEAVE: { label: "Congés payés", short: "CP", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  RTT: { label: "RTT", short: "RTT", color: "bg-violet-100 text-violet-800 border-violet-200", dot: "bg-violet-500" },
  SICK_LEAVE: { label: "Maladie", short: "MAL", color: "bg-amber-100 text-amber-900 border-amber-200", dot: "bg-amber-500" },
  WORK_ACCIDENT: { label: "Accident du travail", short: "AT", color: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-500" },
  UNPAID_LEAVE: { label: "Sans solde", short: "SS", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500" },
  FAMILY_EVENT: { label: "Événement familial", short: "EF", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  OTHER: { label: "Autre", short: "AUT", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-500" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  TO_VALIDATE: { label: "À valider", className: "bg-amber-50 text-amber-800" },
  TO_PROVIDE_JUSTIFICATION: { label: "Justificatif à fournir", className: "bg-orange-50 text-orange-800" },
  TO_REVIEW_JUSTIFICATION: { label: "Justificatif à vérifier", className: "bg-violet-50 text-violet-800" },
  VALIDATED: { label: "Validée", className: "bg-emerald-50 text-emerald-800" },
  REJECTED: { label: "Refusée", className: "bg-slate-100 text-slate-600" },
};

const JUSTIFICATION_META: Record<string, { label: string; className: string }> = {
  TO_PROVIDE: { label: "À fournir", className: "bg-orange-50 text-orange-800" },
  RECEIVED: { label: "À vérifier", className: "bg-violet-50 text-violet-800" },
  VALIDATED: { label: "Vérifié", className: "bg-emerald-50 text-emerald-800" },
  REJECTED: { label: "Refusé", className: "bg-red-50 text-red-700" },
};

const PAYROLL_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Non transmise", className: "bg-slate-100 text-slate-600" },
  READY: { label: "Prête pour la paie", className: "bg-blue-50 text-blue-700" },
  INTEGRATED: { label: "Intégrée à la paie", className: "bg-emerald-50 text-emerald-800" },
};

function utcDateFromIso(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(utcDateFromIso(iso));
}

function formatRange(start: Date, end: Date) {
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = new Intl.DateTimeFormat("fr-FR", sameMonth ? { day: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }).format(start);
  const endLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(end);
  return `${startLabel} – ${endLabel}`;
}

function durationDays(absence: AbsenceWorkspaceItem) {
  return Math.floor((utcDateFromIso(absence.endDate).getTime() - utcDateFromIso(absence.startDate).getTime()) / 86_400_000) + 1;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function StatusPill({ value }: { value: string }) {
  const meta = STATUS_META[value] ?? { label: value, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}

function PayrollPill({ value }: { value: string }) {
  const meta = PAYROLL_META[value] ?? { label: value, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}

function JustificationPill({ absence }: { absence: AbsenceWorkspaceItem }) {
  if (!absence.justificationRequired) {
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Non demandé</span>;
  }
  const status = absence.justification?.status ?? "TO_PROVIDE";
  const meta = JUSTIFICATION_META[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}

function Metric({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-surface-border bg-white px-4 py-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none text-ink">{value}</p>
        <p className="mt-1 truncate text-xs text-ink-faint">{label}</p>
      </div>
    </div>
  );
}

export default function AbsencesWorkspace({ employees, absences, isAdmin, initialStats }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("planning");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [onlyWithAbsence, setOnlyWithAbsence] = useState(false);
  const [anchor, setAnchor] = useState(() => startOfWeek(todayUtc()));
  const [editor, setEditor] = useState<{ mode: EditorMode; absence: AbsenceWorkspaceItem | null } | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleDays = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(anchor, index)), [anchor]);
  const rangeEnd = visibleDays[visibleDays.length - 1];

  const filteredAbsences = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr-FR");
    return absences.filter((absence) => {
      if (query && !absence.employeeName.toLocaleLowerCase("fr-FR").includes(query)) return false;
      if (typeFilter !== "ALL" && absence.type !== typeFilter) return false;
      if (statusFilter === "ACTIVE" && absence.status === "REJECTED") return false;
      if (statusFilter !== "ALL" && statusFilter !== "ACTIVE" && absence.status !== statusFilter) return false;
      return true;
    });
  }, [absences, search, typeFilter, statusFilter]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr-FR");
    const idsWithAbsence = new Set(filteredAbsences.map((absence) => absence.employeeId));
    return employees.filter((employee) => {
      const name = `${employee.firstName} ${employee.lastName}`.toLocaleLowerCase("fr-FR");
      if (query && !name.includes(query)) return false;
      if (onlyWithAbsence && !idsWithAbsence.has(employee.id)) return false;
      return true;
    });
  }, [employees, filteredAbsences, onlyWithAbsence, search]);

  function refreshWithNotice(result: { error?: string; success?: string } | undefined, fallbackSuccess?: string) {
    if (result?.error) setNotice({ tone: "error", text: result.error });
    else setNotice({ tone: "success", text: result?.success ?? fallbackSuccess ?? "Modification enregistrée." });
    router.refresh();
  }

  function runServerAction(action: () => Promise<{ error?: string; success?: string } | undefined>, fallbackSuccess?: string) {
    startTransition(async () => {
      try {
        const result = await action();
        refreshWithNotice(result, fallbackSuccess);
      } catch {
        setNotice({ tone: "error", text: "L'action n'a pas pu être réalisée. Réessayez." });
      }
    });
  }

  function openCreate() {
    setNotice(null);
    setEditor({ mode: "create", absence: null });
  }

  function openEdit(absence: AbsenceWorkspaceItem) {
    setNotice(null);
    setEditor({ mode: "edit", absence });
  }

  function requestDelete(absence: AbsenceWorkspaceItem) {
    if (absence.payrollImpactStatus === "INTEGRATED") {
      setNotice({ tone: "error", text: "Cette absence est déjà intégrée à la paie et ne peut plus être supprimée ici." });
      return;
    }
    if (!window.confirm(`Supprimer l'absence de ${absence.employeeName} du ${formatShortDate(absence.startDate)} au ${formatShortDate(absence.endDate)} ?`)) return;
    runServerAction(() => deleteAbsence(absence.id), "Absence supprimée.");
  }

  function requestReject(absence: AbsenceWorkspaceItem) {
    const reason = window.prompt("Motif du refus de l'absence :", "Absence refusée après vérification RH.");
    if (!reason?.trim()) return;
    runServerAction(() => rejectAbsence(absence.id, reason));
  }

  return (
    <div className="mt-5 space-y-5">
      {notice && (
        <div className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          <div className="flex items-start gap-2.5">
            {notice.tone === "success" ? <Check size={17} className="mt-0.5 shrink-0" /> : <CircleAlert size={17} className="mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer" className="shrink-0 opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users size={18} />} value={initialStats.today} label="Absents aujourd'hui" tone="bg-blue-50 text-blue-700" />
        <Metric icon={<FileClock size={18} />} value={initialStats.pending} label="Dossiers à traiter" tone="bg-amber-50 text-amber-700" />
        <Metric icon={<FileCheck2 size={18} />} value={initialStats.justificationAttention} label="Justificatifs à traiter" tone="bg-violet-50 text-violet-700" />
        <Metric icon={<Check size={18} />} value={initialStats.validatedThisMonth} label="Validées ce mois" tone="bg-emerald-50 text-emerald-700" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-surface-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex flex-wrap gap-1 rounded-xl bg-surface-subtle p-1">
            <button type="button" onClick={() => setTab("planning")} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === "planning" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>
              <CalendarDays size={16} /> Planning équipe
            </button>
            <button type="button" onClick={() => setTab("list")} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === "list" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>
              <LayoutList size={16} /> Liste
            </button>
            <button type="button" onClick={() => setTab("justifications")} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === "justifications" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>
              <FileCheck2 size={16} /> Justificatifs
              {initialStats.justificationAttention > 0 && <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{initialStats.justificationAttention}</span>}
            </button>
          </div>
          {isAdmin && <Button onClick={openCreate}><Plus size={16} /> Ajouter une absence</Button>}
        </div>

        <div className="border-b border-surface-border bg-white px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un salarié..." className="h-10 w-full rounded-lg border border-surface-border bg-white pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-primary" />
              </label>
              <div className="relative">
                <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 min-w-[180px] rounded-lg border border-surface-border bg-white pl-9 pr-8 text-sm text-ink outline-none focus:border-brand-primary">
                  <option value="ALL">Tous les motifs</option>
                  {Object.entries(TYPE_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                </select>
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 min-w-[170px] rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary">
                <option value="ACTIVE">Hors refusées</option>
                <option value="ALL">Tous les statuts</option>
                <option value="TO_VALIDATE">À valider</option>
                <option value="TO_PROVIDE_JUSTIFICATION">Justificatif à fournir</option>
                <option value="TO_REVIEW_JUSTIFICATION">Justificatif à vérifier</option>
                <option value="VALIDATED">Validées</option>
                <option value="REJECTED">Refusées</option>
              </select>
            </div>
            {tab === "planning" && (
              <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
                <input type="checkbox" checked={onlyWithAbsence} onChange={(event) => setOnlyWithAbsence(event.target.checked)} className="h-4 w-4 rounded border-surface-border" />
                Uniquement les salariés avec une absence
              </label>
            )}
          </div>
        </div>

        {tab === "planning" && (
          <TeamPlanner
            employees={filteredEmployees}
            absences={filteredAbsences}
            days={visibleDays}
            anchor={anchor}
            rangeEnd={rangeEnd}
            onPrevious={() => setAnchor(addDays(anchor, -14))}
            onNext={() => setAnchor(addDays(anchor, 14))}
            onToday={() => setAnchor(startOfWeek(todayUtc()))}
            onOpen={openEdit}
          />
        )}

        {tab === "list" && (
          <AbsenceList absences={filteredAbsences} isAdmin={isAdmin} isPending={isPending} onOpen={openEdit} onDelete={requestDelete} onValidate={(absence) => runServerAction(() => validateAbsence(absence.id))} onReject={requestReject} />
        )}

        {tab === "justifications" && (
          <JustificationList absences={filteredAbsences.filter((absence) => absence.justificationRequired)} isAdmin={isAdmin} isPending={isPending} onAction={runServerAction} onOpen={openEdit} />
        )}
      </section>

      {editor && (
        <AbsenceEditor
          mode={editor.mode}
          absence={editor.absence}
          employees={employees}
          isAdmin={isAdmin}
          isPending={isPending}
          onClose={() => setEditor(null)}
          onSaved={(result) => {
            refreshWithNotice(result);
            if (!result?.error) setEditor(null);
          }}
          onDelete={(absence) => {
            setEditor(null);
            requestDelete(absence);
          }}
          run={(action, fallback) => runServerAction(action, fallback)}
        />
      )}
    </div>
  );
}

function TeamPlanner({ employees, absences, days, anchor, rangeEnd, onPrevious, onNext, onToday, onOpen }: {
  employees: Employee[];
  absences: AbsenceWorkspaceItem[];
  days: Date[];
  anchor: Date;
  rangeEnd: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (absence: AbsenceWorkspaceItem) => void;
}) {
  const today = todayUtc();
  const byEmployee = useMemo(() => {
    const map = new Map<string, AbsenceWorkspaceItem[]>();
    for (const absence of absences) {
      const current = map.get(absence.employeeId) ?? [];
      current.push(absence);
      map.set(absence.employeeId, current);
    }
    return map;
  }, [absences]);

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Vue 2 semaines</p>
          <h2 className="mt-0.5 text-base font-semibold text-ink">{formatRange(anchor, rangeEnd)}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevious} aria-label="Période précédente" className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-soft hover:bg-surface-subtle"><ChevronLeft size={16} /></button>
          <button type="button" onClick={onToday} className="h-9 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:bg-surface-subtle">Aujourd'hui</button>
          <button type="button" onClick={onNext} aria-label="Période suivante" className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-soft hover:bg-surface-subtle"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="max-h-[64vh] overflow-auto">
        <div className="min-w-[1120px]">
          <div className="sticky top-0 z-20 grid grid-cols-[220px_repeat(14,minmax(58px,1fr))] border-b border-surface-border bg-surface-subtle/95 backdrop-blur">
            <div className="sticky left-0 z-30 flex items-center border-r border-surface-border bg-surface-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Équipe</div>
            {days.map((day) => (
              <div key={dateKey(day)} className={`border-r border-surface-border px-1 py-2 text-center last:border-r-0 ${isSameDay(day, today) ? "bg-brand-primary/[0.06]" : ""}`}>
                <p className="text-[10px] font-medium uppercase text-ink-faint">{new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(day).replace(".", "")}</p>
                <p className={`mt-0.5 text-sm font-semibold ${isSameDay(day, today) ? "mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white" : "text-ink"}`}>{day.getUTCDate()}</p>
              </div>
            ))}
          </div>

          {employees.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center text-sm text-ink-faint">Aucun salarié ne correspond aux filtres.</div>
          ) : employees.map((employee) => {
            const employeeAbsences = byEmployee.get(employee.id) ?? [];
            return (
              <div key={employee.id} className="grid min-h-[58px] grid-cols-[220px_repeat(14,minmax(58px,1fr))] border-b border-surface-border last:border-b-0">
                <div className="sticky left-0 z-10 flex min-w-0 items-center border-r border-surface-border bg-white px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{employee.firstName} {employee.lastName}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-faint">{employee.position || "Poste non renseigné"}</p>
                  </div>
                </div>
                {days.map((day) => {
                  const key = dateKey(day);
                  const absence = employeeAbsences.find((item) => item.startDate.slice(0, 10) <= key && item.endDate.slice(0, 10) >= key);
                  const meta = absence ? TYPE_META[absence.type] ?? TYPE_META.OTHER : null;
                  const isStart = Boolean(absence && absence.startDate.slice(0, 10) === key);
                  const isEnd = Boolean(absence && absence.endDate.slice(0, 10) === key);
                  return (
                    <div key={key} className={`relative min-h-[58px] border-r border-surface-border p-1 last:border-r-0 ${isSameDay(day, today) ? "bg-brand-primary/[0.025]" : day.getUTCDay() === 0 || day.getUTCDay() === 6 ? "bg-surface-subtle/50" : "bg-white"}`}>
                      {absence && meta && (
                        <button
                          type="button"
                          onClick={() => onOpen(absence)}
                          title={`${absence.employeeName} · ${meta.label} · ${formatShortDate(absence.startDate)} → ${formatShortDate(absence.endDate)}`}
                          className={`absolute inset-y-2 left-0 right-0 z-[2] border-y px-1 text-left text-[10px] font-semibold leading-5 ${meta.color} ${isStart ? "ml-1 rounded-l-md border-l" : "border-l-0"} ${isEnd ? "mr-1 rounded-r-md border-r" : "border-r-0"} hover:brightness-[0.98]`}
                        >
                          {isStart ? <span className="block truncate">{meta.short}</span> : <span className="sr-only">{meta.label}</span>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-surface-border bg-surface-subtle/40 px-4 py-3 lg:px-5">
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <span key={key} className="flex items-center gap-1.5 text-[11px] text-ink-soft"><span className={`h-2 w-2 rounded-full ${meta.dot}`} />{meta.label}</span>
        ))}
      </div>
    </div>
  );
}

function AbsenceList({ absences, isAdmin, isPending, onOpen, onDelete, onValidate, onReject }: {
  absences: AbsenceWorkspaceItem[];
  isAdmin: boolean;
  isPending: boolean;
  onOpen: (absence: AbsenceWorkspaceItem) => void;
  onDelete: (absence: AbsenceWorkspaceItem) => void;
  onValidate: (absence: AbsenceWorkspaceItem) => void;
  onReject: (absence: AbsenceWorkspaceItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1050px] w-full text-left">
        <thead className="border-b border-surface-border bg-surface-subtle text-[11px] uppercase tracking-wide text-ink-faint">
          <tr>
            <th className="px-5 py-3 font-semibold">Salarié</th>
            <th className="px-4 py-3 font-semibold">Motif</th>
            <th className="px-4 py-3 font-semibold">Période</th>
            <th className="px-4 py-3 font-semibold">Durée</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 font-semibold">Justificatif</th>
            <th className="px-4 py-3 font-semibold">Paie</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {absences.length === 0 ? (
            <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-ink-faint">Aucune absence ne correspond aux filtres.</td></tr>
          ) : absences.map((absence) => (
            <tr key={absence.id} className="hover:bg-surface-subtle/60">
              <td className="px-5 py-4"><p className="text-sm font-medium text-ink">{absence.employeeName}</p><p className="mt-0.5 text-xs text-ink-faint">{absence.employeePosition || "—"}</p></td>
              <td className="px-4 py-4"><span className="flex items-center gap-2 text-sm text-ink-soft"><span className={`h-2.5 w-2.5 rounded-full ${(TYPE_META[absence.type] ?? TYPE_META.OTHER).dot}`} />{(TYPE_META[absence.type] ?? TYPE_META.OTHER).label}</span></td>
              <td className="px-4 py-4 text-sm text-ink-soft">{formatShortDate(absence.startDate)} → {formatShortDate(absence.endDate)}</td>
              <td className="px-4 py-4 text-sm text-ink-soft">{durationDays(absence)} j</td>
              <td className="px-4 py-4"><StatusPill value={absence.status} /></td>
              <td className="px-4 py-4"><JustificationPill absence={absence} /></td>
              <td className="px-4 py-4"><PayrollPill value={absence.payrollImpactStatus} /></td>
              <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => onOpen(absence)} className="rounded-lg p-2 text-ink-soft hover:bg-white hover:text-ink" title="Ouvrir"><Pencil size={16} /></button>
                  {isAdmin && absence.status === "TO_VALIDATE" && <button type="button" disabled={isPending} onClick={() => onValidate(absence)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" title="Valider"><Check size={16} /></button>}
                  {isAdmin && absence.status !== "VALIDATED" && absence.status !== "REJECTED" && <button type="button" disabled={isPending} onClick={() => onReject(absence)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Refuser</button>}
                  {isAdmin && absence.payrollImpactStatus !== "INTEGRATED" && <button type="button" disabled={isPending} onClick={() => onDelete(absence)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Supprimer"><Trash2 size={16} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JustificationList({ absences, isAdmin, isPending, onAction, onOpen }: {
  absences: AbsenceWorkspaceItem[];
  isAdmin: boolean;
  isPending: boolean;
  onAction: (action: () => Promise<{ error?: string; success?: string } | undefined>, fallbackSuccess?: string) => void;
  onOpen: (absence: AbsenceWorkspaceItem) => void;
}) {
  const sorted = [...absences].sort((a, b) => {
    const rank = (absence: AbsenceWorkspaceItem) => absence.justification?.status === "RECEIVED" ? 0 : absence.justification?.status === "TO_PROVIDE" || !absence.justification ? 1 : absence.justification?.status === "REJECTED" ? 2 : 3;
    return rank(a) - rank(b) || b.startDate.localeCompare(a.startDate);
  });

  async function handleUpload(event: FormEvent<HTMLFormElement>, absence: AbsenceWorkspaceItem) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onAction(() => uploadAbsenceJustification(formData), `Justificatif ajouté pour ${absence.employeeName}.`);
  }

  return (
    <div className="p-4 lg:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-ink">Suivi des justificatifs</h2>
        <p className="mt-1 text-xs text-ink-faint">Les documents manquants et ceux à vérifier remontent en premier.</p>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border px-5 py-14 text-center text-sm text-ink-faint">Aucun justificatif à suivre avec les filtres actuels.</div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {sorted.map((absence) => {
            const justification = absence.justification;
            const status = justification?.status ?? "TO_PROVIDE";
            return (
              <article key={absence.id} className="rounded-xl border border-surface-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{absence.employeeName}</p>
                    <p className="mt-1 text-xs text-ink-soft">{(TYPE_META[absence.type] ?? TYPE_META.OTHER).label} · {formatShortDate(absence.startDate)} → {formatShortDate(absence.endDate)}</p>
                  </div>
                  <JustificationPill absence={absence} />
                </div>

                {justification?.storageKey ? (
                  <div className="mt-3 rounded-lg bg-surface-subtle px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-xs font-medium text-ink">{justification.fileName || "Justificatif"}</p><p className="mt-0.5 text-[11px] text-ink-faint">{justification.mimeType || "Document"}{justification.sizeBytes ? ` · ${formatSize(justification.sizeBytes)}` : ""}</p></div>
                      <a href={`/api/absences/justifications/${justification.id}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-brand-primary hover:underline">Ouvrir</a>
                    </div>
                    {justification.rejectionReason && <p className="mt-2 text-xs text-red-700">Motif : {justification.rejectionReason}</p>}
                  </div>
                ) : null}

                {isAdmin && (status === "TO_PROVIDE" || status === "REJECTED") && absence.payrollImpactStatus !== "INTEGRATED" && (
                  <form onSubmit={(event) => handleUpload(event, absence)} className="mt-3 rounded-lg border border-dashed border-surface-border p-3">
                    <input type="hidden" name="absenceId" value={absence.id} />
                    <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="block w-full text-xs text-ink-soft" />
                    <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] text-ink-faint">PDF, JPG, PNG · 10 Mo max</span><Button type="submit" variant="secondary" disabled={isPending} className="min-h-8 px-3 py-1.5 text-xs">Déposer</Button></div>
                  </form>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isAdmin && status === "RECEIVED" && justification && (
                    <>
                      <Button type="button" disabled={isPending} onClick={() => onAction(() => validateAbsenceJustification(justification.id))} className="min-h-9 px-3 py-2 text-xs">Vérifier le document</Button>
                      <Button type="button" variant="danger" disabled={isPending} onClick={() => {
                        const reason = window.prompt("Motif du refus du justificatif :");
                        if (reason?.trim()) onAction(() => rejectAbsenceJustification(justification.id, reason));
                      }} className="min-h-9 px-3 py-2 text-xs">Refuser</Button>
                    </>
                  )}
                  <button type="button" onClick={() => onOpen(absence)} className="ml-auto text-xs font-medium text-brand-primary hover:underline">Ouvrir le dossier →</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AbsenceEditor({ mode, absence, employees, isAdmin, isPending, onClose, onSaved, onDelete, run }: {
  mode: EditorMode;
  absence: AbsenceWorkspaceItem | null;
  employees: Employee[];
  isAdmin: boolean;
  isPending: boolean;
  onClose: () => void;
  onSaved: (result: { error?: string; success?: string } | undefined) => void;
  onDelete: (absence: AbsenceWorkspaceItem) => void;
  run: (action: () => Promise<{ error?: string; success?: string } | undefined>, fallback?: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const integrated = absence?.payrollImpactStatus === "INTEGRATED";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin || integrated) return;
    const formData = new FormData(event.currentTarget);
    setError(null);
    run(async () => {
      const result = mode === "create" ? await createAbsence(undefined, formData) : await updateAbsence(absence!.id, formData);
      if (result?.error) setError(result.error);
      else onSaved(result);
      return result;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/25 p-0 backdrop-blur-[1px] sm:p-4" role="dialog" aria-modal="true" aria-label={mode === "create" ? "Ajouter une absence" : "Modifier une absence"}>
      <button type="button" onClick={onClose} className="absolute inset-0 cursor-default" aria-label="Fermer" />
      <aside className="relative z-10 flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border sm:border-surface-border">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">{mode === "create" ? "Nouvelle absence" : "Dossier absence"}</p><h2 className="mt-1 text-lg font-semibold text-ink">{mode === "create" ? "Ajouter une absence" : absence?.employeeName}</h2>{absence && <p className="mt-1 text-xs text-ink-faint">{STATUS_META[absence.status]?.label ?? absence.status} · {PAYROLL_META[absence.payrollImpactStatus]?.label ?? absence.payrollImpactStatus}</p>}</div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint hover:bg-surface-subtle" aria-label="Fermer"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5">
          {integrated && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">Cette absence a déjà été intégrée à la paie. Les données sont consultables ici mais la modification et la suppression sont bloquées afin de préserver la traçabilité.</div>}
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

          <div className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Salarié</span><select name="employeeId" defaultValue={absence?.employeeId ?? ""} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle"><option value="">Sélectionner...</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Type d'absence</span><select name="type" defaultValue={absence?.type ?? ""} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle"><option value="">Sélectionner...</option>{Object.entries(TYPE_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Du</span><input name="startDate" type="date" defaultValue={absence?.startDate.slice(0, 10) ?? dateKey(todayUtc())} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Au</span><input name="endDate" type="date" defaultValue={absence?.endDate.slice(0, 10) ?? dateKey(todayUtc())} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label></div>
            <label className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-subtle/40 p-3"><input name="justificationRequired" type="checkbox" defaultChecked={absence?.justificationRequired ?? false} disabled={!isAdmin || integrated} className="mt-0.5 h-4 w-4 rounded border-surface-border" /><span><span className="block text-sm font-medium text-ink">Justificatif demandé</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">Le dossier restera à traiter tant que le document n'a pas été reçu et vérifié.</span></span></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Note interne</span><textarea name="notes" defaultValue={absence?.notes ?? ""} disabled={!isAdmin || integrated} rows={4} maxLength={1000} placeholder="Informations utiles pour le suivi RH..." className="w-full resize-y rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label>
          </div>

          {absence && (
            <div className="mt-6 border-t border-surface-border pt-5">
              <h3 className="text-sm font-semibold text-ink">Traitement du dossier</h3>
              <div className="mt-3 flex flex-wrap gap-2"><StatusPill value={absence.status} /><JustificationPill absence={absence} /><PayrollPill value={absence.payrollImpactStatus} /></div>
              {absence.rejectedReason && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Motif du refus : {absence.rejectedReason}</p>}
              {absence.notes && <p className="mt-3 text-xs leading-relaxed text-ink-soft">Note : {absence.notes}</p>}
            </div>
          )}
        </form>

        <div className="border-t border-surface-border bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" && absence && isAdmin && !integrated && (
              <Button type="button" variant="danger" disabled={isPending} onClick={() => onDelete(absence)} className="mr-auto"><Trash2 size={15} /> Supprimer</Button>
            )}
            {mode === "edit" && absence && isAdmin && absence.status === "TO_VALIDATE" && !integrated && <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => validateAbsence(absence.id))}><Check size={15} /> Valider</Button>}
            <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
            {isAdmin && !integrated && <Button type="submit" form="absence-editor-form" disabled={isPending} className="hidden">Enregistrer</Button>}
            {isAdmin && !integrated && (
              <button type="button" disabled={isPending} onClick={() => {
                const form = document.querySelector<HTMLFormElement>("[data-absence-editor-form]");
                form?.requestSubmit();
              }} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-card hover:opacity-95 disabled:opacity-50">
                {isPending && <Loader2 size={15} className="animate-spin" />}{mode === "create" ? "Ajouter" : "Enregistrer"}
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
