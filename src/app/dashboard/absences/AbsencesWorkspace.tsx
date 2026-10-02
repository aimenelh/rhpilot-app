"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  FileClock,
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
import { useAskDialog, type AskOptions } from "@/components/ui/AskDialog";
import {
  createAbsence,
  deleteAbsence,
  rejectAbsence,
  rejectAbsenceJustification,
  recordAbsenceRecovery,
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
  hasFile: boolean;
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
  rejectedReason: string | null;
  payrollImpactStatus: string;
  lastWorkedDate: string | null;
  subrogationStartDate: string | null;
  subrogationEndDate: string | null;
  workAccidentDate: string | null;
  returnDate: string | null;
  returnReasonCode: string | null;
  justification: Justification | null;
};

type ActionResult = { error?: string; success?: string } | undefined;
type Tab = "planning" | "list" | "justifications";

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

const TYPE_META: Record<string, { label: string; short: string; pill: string; bar: string; dot: string }> = {
  PAID_LEAVE: { label: "Congés payés", short: "CP", pill: "bg-surface-subtle text-ink-soft", bar: "border-surface-border bg-surface-subtle text-ink-soft", dot: "bg-ink-soft" },
  RTT: { label: "RTT", short: "RTT", pill: "bg-brand-primary/10 text-brand-primary-dark", bar: "border-brand-primary/30 bg-brand-primary/10 text-brand-primary-dark", dot: "bg-brand-primary-dark" },
  SICK_LEAVE: { label: "Maladie", short: "MAL", pill: "bg-amber-50 text-amber-800", bar: "border-amber-200 bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  WORK_ACCIDENT: { label: "Accident du travail", short: "AT", pill: "bg-accent-rose/5 text-accent-rose", bar: "border-accent-rose/30 bg-accent-rose/5 text-accent-rose", dot: "bg-accent-rose" },
  UNPAID_LEAVE: { label: "Sans solde", short: "SS", pill: "bg-slate-100 text-slate-700", bar: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  FAMILY_EVENT: { label: "Événement familial", short: "EF", pill: "bg-accent-teal/10 text-accent-teal", bar: "border-accent-teal/30 bg-accent-teal/10 text-accent-teal", dot: "bg-accent-teal" },
  MATERNITY: { label: "Maternité", short: "MAT", pill: "bg-pink-50 text-pink-700", bar: "border-pink-200 bg-pink-100 text-pink-800", dot: "bg-pink-500" },
  PATERNITY: { label: "Paternité", short: "PAT", pill: "bg-surface-subtle text-ink-soft", bar: "border-surface-border bg-surface-subtle text-ink-soft", dot: "bg-ink-soft" },
  OTHER: { label: "Autre", short: "AUT", pill: "bg-gray-100 text-gray-700", bar: "border-gray-200 bg-gray-100 text-gray-700", dot: "bg-gray-500" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  TO_VALIDATE: { label: "À valider", className: "bg-amber-50 text-amber-800" },
  TO_PROVIDE_JUSTIFICATION: { label: "Justificatif à fournir", className: "bg-orange-50 text-orange-800" },
  TO_REVIEW_JUSTIFICATION: { label: "Justificatif à vérifier", className: "bg-brand-primary/10 text-brand-primary-dark" },
  VALIDATED: { label: "Validée", className: "bg-accent-teal/10 text-accent-teal" },
  REJECTED: { label: "Refusée", className: "bg-slate-100 text-slate-600" },
};

const JUSTIFICATION_META: Record<string, { label: string; className: string }> = {
  TO_PROVIDE: { label: "À fournir", className: "bg-orange-50 text-orange-800" },
  RECEIVED: { label: "À vérifier", className: "bg-brand-primary/10 text-brand-primary-dark" },
  VALIDATED: { label: "Vérifié", className: "bg-accent-teal/10 text-accent-teal" },
  REJECTED: { label: "Refusé", className: "bg-accent-rose/5 text-accent-rose" },
};

const PAYROLL_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Non transmise", className: "bg-slate-100 text-slate-600" },
  READY: { label: "Prête pour la paie", className: "bg-surface-subtle text-ink-soft" },
  INTEGRATED: { label: "Intégrée à la paie", className: "bg-accent-teal/10 text-accent-teal" },
};

function toUtcDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function currentUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function mondayOfWeek(date: Date) {
  const day = date.getUTCDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(toUtcDate(value));
}

function formatPlannerRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function durationInDays(absence: AbsenceWorkspaceItem) {
  return Math.floor((toUtcDate(absence.endDate).getTime() - toUtcDate(absence.startDate).getTime()) / 86_400_000) + 1;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function TypeLabel({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? TYPE_META.OTHER;
  return <span className="flex items-center gap-2 text-sm text-ink-soft"><span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />{meta.label}</span>;
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
  const value = absence.justification?.status ?? "TO_PROVIDE";
  const meta = JUSTIFICATION_META[value] ?? { label: value, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}

function Metric({ icon, value, label, tone }: { icon: ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 py-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none text-ink">{value}</p>
        <p className="mt-1 truncate text-xs text-ink-faint">{label}</p>
      </div>
    </div>
  );
}

export default function AbsencesWorkspace({ employees, absences, isAdmin, initialStats }: Props) {
  const { ask, dialog, isOpen: dialogOpen } = useAskDialog();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("planning");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [onlyOccupied, setOnlyOccupied] = useState(false);
  const [anchor, setAnchor] = useState(() => mondayOfWeek(currentUtcDay()));
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; absence: AbsenceWorkspaceItem | null } | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(anchor, index)), [anchor]);

  const filteredAbsences = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("fr-FR");
    return absences.filter((absence) => {
      if (q && !absence.employeeName.toLocaleLowerCase("fr-FR").includes(q)) return false;
      if (typeFilter !== "ALL" && absence.type !== typeFilter) return false;
      if (statusFilter === "ACTIVE" && absence.status === "REJECTED") return false;
      if (statusFilter !== "ACTIVE" && statusFilter !== "ALL" && absence.status !== statusFilter) return false;
      return true;
    });
  }, [absences, search, statusFilter, typeFilter]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("fr-FR");
    const occupiedIds = new Set(filteredAbsences.map((absence) => absence.employeeId));
    return employees.filter((employee) => {
      const name = `${employee.firstName} ${employee.lastName}`.toLocaleLowerCase("fr-FR");
      if (q && !name.includes(q)) return false;
      if (onlyOccupied && !occupiedIds.has(employee.id)) return false;
      return true;
    });
  }, [employees, filteredAbsences, onlyOccupied, search]);

  function showResult(result: ActionResult, fallback = "Modification enregistrée.") {
    if (result?.error) setNotice({ tone: "error", text: result.error });
    else setNotice({ tone: "success", text: result?.success ?? fallback });
    router.refresh();
  }

  function runAction(action: () => Promise<ActionResult>, fallback?: string, afterSuccess?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        showResult(result, fallback);
        if (!result?.error) afterSuccess?.();
      } catch {
        setNotice({ tone: "error", text: "L'action n'a pas pu être réalisée. Réessayez." });
      }
    });
  }

  function confirmDelete(absence: AbsenceWorkspaceItem, afterSuccess?: () => void) {
    if (absence.payrollImpactStatus === "INTEGRATED") {
      setNotice({ tone: "error", text: "Cette absence est déjà intégrée à la paie et ne peut plus être supprimée depuis ce module." });
      return;
    }
    void ask({
      title: "Supprimer cette absence ?",
      description: `Absence de ${absence.employeeName} du ${formatDate(absence.startDate)} au ${formatDate(absence.endDate)}. Cette action est définitive.`,
      confirmLabel: "Supprimer",
      danger: true,
    }).then((answer) => {
      if (answer !== null) runAction(() => deleteAbsence(absence.id), "Absence supprimée.", afterSuccess);
    });
  }

  function reject(absence: AbsenceWorkspaceItem) {
    void ask({
      title: "Refuser cette absence ?",
      description: `Absence de ${absence.employeeName}. Le motif est visible par le salarié dans son espace.`,
      confirmLabel: "Refuser",
      danger: true,
      input: { label: "Motif du refus", defaultValue: "Absence refusée après vérification RH.", required: true },
    }).then((reason) => {
      if (reason) runAction(() => rejectAbsence(absence.id, reason));
    });
  }

  const askJustificationRejection = (options: AskOptions) => ask(options);

  return (
    <div className="mt-5 space-y-5">
      {dialog}
      {notice && (
        <div className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${notice.tone === "success" ? "border-accent-teal/30 bg-accent-teal/10 text-accent-teal" : "border-accent-rose/30 bg-accent-rose/5 text-accent-rose"}`}>
          <div className="flex items-start gap-2.5">
            {notice.tone === "success" ? <Check size={17} className="mt-0.5 shrink-0" /> : <CircleAlert size={17} className="mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer" className="shrink-0 opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users size={18} />} value={initialStats.today} label="Absents aujourd'hui" tone="bg-surface-subtle text-ink-soft" />
        <Metric icon={<FileClock size={18} />} value={initialStats.pending} label="Dossiers à traiter" tone="bg-amber-50 text-amber-700" />
        <Metric icon={<FileCheck2 size={18} />} value={initialStats.justificationAttention} label="Justificatifs à traiter" tone="bg-brand-primary/10 text-brand-primary-dark" />
        <Metric icon={<Check size={18} />} value={initialStats.validatedThisMonth} label="Validées ce mois" tone="bg-accent-teal/10 text-accent-teal" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-surface-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex flex-wrap gap-1 rounded-xl bg-surface-subtle p-1">
            <TabButton active={tab === "planning"} onClick={() => setTab("planning")} icon={<CalendarDays size={16} />}>Planning équipe</TabButton>
            <TabButton active={tab === "list"} onClick={() => setTab("list")} icon={<LayoutList size={16} />}>Liste</TabButton>
            <TabButton active={tab === "justifications"} onClick={() => setTab("justifications")} icon={<FileCheck2 size={16} />} badge={initialStats.justificationAttention}>Justificatifs</TabButton>
          </div>
          {isAdmin && <Button onClick={() => setEditor({ mode: "create", absence: null })}><Plus size={16} /> Ajouter une absence</Button>}
        </div>

        <div className="border-b border-surface-border px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un salarié..." className="h-10 w-full rounded-lg border border-surface-border bg-white pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-primary" />
              </label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 min-w-[180px] rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary">
                <option value="ALL">Tous les motifs</option>
                {Object.entries(TYPE_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 min-w-[180px] rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary">
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
                <input type="checkbox" checked={onlyOccupied} onChange={(event) => setOnlyOccupied(event.target.checked)} className="h-4 w-4 rounded border-surface-border" />
                Afficher seulement les salariés absents
              </label>
            )}
          </div>
        </div>

        {tab === "planning" && (
          <TeamPlanner
            employees={filteredEmployees}
            absences={filteredAbsences}
            days={days}
            onPrevious={() => setAnchor(addDays(anchor, -14))}
            onNext={() => setAnchor(addDays(anchor, 14))}
            onToday={() => setAnchor(mondayOfWeek(currentUtcDay()))}
            onOpen={(absence) => setEditor({ mode: "edit", absence })}
          />
        )}

        {tab === "list" && (
          <AbsenceTable
            absences={filteredAbsences}
            isAdmin={isAdmin}
            isPending={isPending}
            onOpen={(absence) => setEditor({ mode: "edit", absence })}
            onDelete={(absence) => confirmDelete(absence)}
            onValidate={(absence) => runAction(() => validateAbsence(absence.id))}
            onReject={reject}
          />
        )}

        {tab === "justifications" && (
          <JustificationsView
            absences={filteredAbsences.filter((absence) => absence.justificationRequired)}
            isAdmin={isAdmin}
            isPending={isPending}
            runAction={runAction}
            askReason={askJustificationRejection}
            onOpen={(absence) => setEditor({ mode: "edit", absence })}
          />
        )}
      </section>

      {editor && (
        <AbsenceDrawer
          mode={editor.mode}
          absence={editor.absence}
          employees={employees}
          isAdmin={isAdmin}
          isPending={isPending}
          onClose={() => setEditor(null)}
          onSubmit={(formData) => {
            const action = editor.mode === "create" ? () => createAbsence(undefined, formData) : () => updateAbsence(editor.absence!.id, formData);
            runAction(action, editor.mode === "create" ? "Absence enregistrée." : "Absence modifiée.", () => setEditor(null));
          }}
          onDelete={(absence) => confirmDelete(absence, () => setEditor(null))}
          onValidate={(absence) => runAction(() => validateAbsence(absence.id))}
          onReject={reject}
          runAction={runAction}
          askReason={askJustificationRejection}
          closeOnEscape={!dialogOpen}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, children, badge = 0 }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode; badge?: number }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>
      {icon}{children}{badge > 0 && <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span>}
    </button>
  );
}

function TeamPlanner({ employees, absences, days, onPrevious, onNext, onToday, onOpen }: {
  employees: Employee[];
  absences: AbsenceWorkspaceItem[];
  days: Date[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (absence: AbsenceWorkspaceItem) => void;
}) {
  const today = currentUtcDay();
  const byEmployee = useMemo(() => {
    const map = new Map<string, AbsenceWorkspaceItem[]>();
    for (const absence of absences) map.set(absence.employeeId, [...(map.get(absence.employeeId) ?? []), absence]);
    return map;
  }, [absences]);

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
        <div><p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Vue 2 semaines</p><h2 className="mt-0.5 text-base font-semibold text-ink">{formatPlannerRange(days[0], days[days.length - 1])}</h2></div>
        <div className="flex items-center gap-2">
          <IconButton label="Période précédente" onClick={onPrevious}><ChevronLeft size={16} /></IconButton>
          <button type="button" onClick={onToday} className="h-9 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:bg-surface-subtle">Aujourd'hui</button>
          <IconButton label="Période suivante" onClick={onNext}><ChevronRight size={16} /></IconButton>
        </div>
      </div>

      <div className="max-h-[64vh] overflow-auto">
        <div className="min-w-[1120px]">
          <div className="sticky top-0 z-20 grid grid-cols-[220px_repeat(14,minmax(58px,1fr))] border-b border-surface-border bg-surface-subtle/95 backdrop-blur">
            <div className="sticky left-0 z-30 flex items-center border-r border-surface-border bg-surface-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Équipe</div>
            {days.map((day) => {
              const isToday = dateKey(day) === dateKey(today);
              return (
                <div key={dateKey(day)} className={`border-r border-surface-border px-1 py-2 text-center last:border-r-0 ${isToday ? "bg-brand-primary/[0.06]" : ""}`}>
                  <p className="text-[10px] font-medium uppercase text-ink-faint">{new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(day).replace(".", "")}</p>
                  <p className={`mt-0.5 text-sm font-semibold ${isToday ? "mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white" : "text-ink"}`}>{day.getUTCDate()}</p>
                </div>
              );
            })}
          </div>

          {employees.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center text-sm text-ink-faint">Aucun salarié ne correspond aux filtres.</div>
          ) : employees.map((employee) => {
            const employeeAbsences = byEmployee.get(employee.id) ?? [];
            return (
              <div key={employee.id} className="grid min-h-[58px] grid-cols-[220px_repeat(14,minmax(58px,1fr))] border-b border-surface-border last:border-b-0">
                <div className="sticky left-0 z-10 flex min-w-0 items-center border-r border-surface-border bg-white px-4 py-2.5">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 truncate text-[11px] text-ink-faint">{employee.position || "Poste non renseigné"}</p></div>
                </div>
                {days.map((day) => {
                  const key = dateKey(day);
                  const absence = employeeAbsences.find((item) => item.startDate.slice(0, 10) <= key && item.endDate.slice(0, 10) >= key);
                  const meta = absence ? TYPE_META[absence.type] ?? TYPE_META.OTHER : null;
                  const isStart = Boolean(absence && absence.startDate.slice(0, 10) === key);
                  const isEnd = Boolean(absence && absence.endDate.slice(0, 10) === key);
                  const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
                  const isToday = key === dateKey(today);
                  return (
                    <div key={key} className={`relative min-h-[58px] border-r border-surface-border p-1 last:border-r-0 ${isToday ? "bg-brand-primary/[0.025]" : weekend ? "bg-surface-subtle/50" : "bg-white"}`}>
                      {absence && meta && (
                        <button type="button" onClick={() => onOpen(absence)} title={`${absence.employeeName} · ${meta.label}`} className={`absolute inset-y-2 left-0 right-0 z-[2] border-y px-1 text-left text-[10px] font-semibold leading-5 ${meta.bar} ${isStart ? "ml-1 rounded-l-md border-l" : "border-l-0"} ${isEnd ? "mr-1 rounded-r-md border-r" : "border-r-0"} hover:brightness-[0.98]`}>
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
        {Object.entries(TYPE_META).map(([key, meta]) => <span key={key} className="flex items-center gap-1.5 text-[11px] text-ink-soft"><span className={`h-2 w-2 rounded-full ${meta.dot}`} />{meta.label}</span>)}
      </div>
    </div>
  );
}

function AbsenceTable({ absences, isAdmin, isPending, onOpen, onDelete, onValidate, onReject }: {
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
      <table className="min-w-[1080px] w-full text-left">
        <thead className="border-b border-surface-border bg-surface-subtle text-[11px] uppercase tracking-wide text-ink-faint">
          <tr><th className="px-5 py-3 font-semibold">Salarié</th><th className="px-4 py-3 font-semibold">Motif</th><th className="px-4 py-3 font-semibold">Période</th><th className="px-4 py-3 font-semibold">Durée</th><th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 font-semibold">Justificatif</th><th className="px-4 py-3 font-semibold">Paie</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {absences.length === 0 ? (
            <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-ink-faint">Aucune absence ne correspond aux filtres.</td></tr>
          ) : absences.map((absence) => (
            <tr key={absence.id} className="hover:bg-surface-subtle/60">
              <td className="px-5 py-4"><p className="text-sm font-medium text-ink">{absence.employeeName}</p><p className="mt-0.5 text-xs text-ink-faint">{absence.employeePosition || "Non renseigné"}</p></td>
              <td className="px-4 py-4"><TypeLabel type={absence.type} /></td>
              <td className="px-4 py-4 text-sm text-ink-soft">{formatDate(absence.startDate)} → {formatDate(absence.endDate)}</td>
              <td className="px-4 py-4 text-sm text-ink-soft">{durationInDays(absence)} j</td>
              <td className="px-4 py-4"><StatusPill value={absence.status} /></td>
              <td className="px-4 py-4"><JustificationPill absence={absence} /></td>
              <td className="px-4 py-4"><PayrollPill value={absence.payrollImpactStatus} /></td>
              <td className="px-5 py-4"><div className="flex items-center justify-end gap-1">
                <IconButton label="Ouvrir" onClick={() => onOpen(absence)}><Pencil size={16} /></IconButton>
                {isAdmin && absence.status === "TO_VALIDATE" && absence.payrollImpactStatus !== "INTEGRATED" && <IconButton label="Valider" onClick={() => onValidate(absence)} disabled={isPending} tone="text-accent-teal hover:bg-accent-teal/10"><Check size={16} /></IconButton>}
                {isAdmin && !["VALIDATED", "REJECTED"].includes(absence.status) && absence.payrollImpactStatus !== "INTEGRATED" && <button type="button" disabled={isPending} onClick={() => onReject(absence)} className="rounded-lg px-2 py-2 text-xs font-medium text-accent-rose hover:bg-accent-rose/5 disabled:opacity-50">Refuser</button>}
                {isAdmin && absence.payrollImpactStatus !== "INTEGRATED" && <IconButton label="Supprimer" onClick={() => onDelete(absence)} disabled={isPending} tone="text-accent-rose hover:bg-accent-rose/5"><Trash2 size={16} /></IconButton>}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JustificationsView({ absences, isAdmin, isPending, runAction, askReason, onOpen }: {
  askReason: (options: AskOptions) => Promise<string | null>;
  absences: AbsenceWorkspaceItem[];
  isAdmin: boolean;
  isPending: boolean;
  runAction: (action: () => Promise<ActionResult>, fallback?: string, afterSuccess?: () => void) => void;
  onOpen: (absence: AbsenceWorkspaceItem) => void;
}) {
  const ordered = [...absences].sort((a, b) => justificationRank(a) - justificationRank(b) || b.startDate.localeCompare(a.startDate));

  function upload(event: FormEvent<HTMLFormElement>, absence: AbsenceWorkspaceItem) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => uploadAbsenceJustification(formData), `Justificatif ajouté pour ${absence.employeeName}.`);
  }

  return (
    <div className="p-4 lg:p-5">
      <div className="mb-4"><h2 className="text-base font-semibold text-ink">Suivi des justificatifs</h2><p className="mt-1 text-xs text-ink-faint">Les documents manquants et ceux à vérifier sont affichés en priorité.</p></div>
      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border px-5 py-14 text-center text-sm text-ink-faint">Aucun justificatif à suivre avec les filtres actuels.</div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {ordered.map((absence) => {
            const justification = absence.justification;
            const status = justification?.status ?? "TO_PROVIDE";
            return (
              <article key={absence.id} className="rounded-xl border border-surface-border bg-white p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{absence.employeeName}</p><p className="mt-1 text-xs text-ink-soft">{TYPE_META[absence.type]?.label ?? "Autre"} · {formatDate(absence.startDate)} → {formatDate(absence.endDate)}</p></div><JustificationPill absence={absence} /></div>

                {justification?.hasFile && (
                  <div className="mt-3 rounded-lg bg-surface-subtle px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-medium text-ink">{justification.fileName || "Justificatif"}</p><p className="mt-0.5 text-[11px] text-ink-faint">{justification.mimeType || "Document"}{justification.sizeBytes ? ` · ${formatSize(justification.sizeBytes)}` : ""}</p></div><a href={`/api/absences/justifications/${justification.id}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-brand-primary hover:underline">Ouvrir</a></div>
                    {justification.rejectionReason && <p className="mt-2 text-xs text-accent-rose">Motif : {justification.rejectionReason}</p>}
                  </div>
                )}

                {isAdmin && ["TO_PROVIDE", "REJECTED"].includes(status) && absence.payrollImpactStatus !== "INTEGRATED" && (
                  <form onSubmit={(event) => upload(event, absence)} className="mt-3 rounded-lg border border-dashed border-surface-border p-3">
                    <input type="hidden" name="absenceId" value={absence.id} />
                    <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="block w-full text-xs text-ink-soft" />
                    <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] text-ink-faint">PDF, JPG, PNG · 4 Mo max</span><Button type="submit" variant="secondary" disabled={isPending} className="min-h-8 px-3 py-1.5 text-xs">Déposer</Button></div>
                  </form>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isAdmin && status === "RECEIVED" && justification && absence.payrollImpactStatus !== "INTEGRATED" && (
                    <>
                      <Button type="button" disabled={isPending} onClick={() => runAction(() => validateAbsenceJustification(justification.id))} className="min-h-9 px-3 py-2 text-xs">Vérifier</Button>
                      <Button type="button" variant="danger" disabled={isPending} onClick={() => {
                        void askReason(JUSTIFICATION_REJECTION).then((reason) => {
                          if (reason) runAction(() => rejectAbsenceJustification(justification.id, reason));
                        });
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

const JUSTIFICATION_REJECTION: AskOptions = {
  title: "Refuser ce justificatif ?",
  description: "Le salarié est prévenu et pourra en déposer un autre.",
  confirmLabel: "Refuser",
  danger: true,
  input: { label: "Motif du refus", required: true },
};

function justificationRank(absence: AbsenceWorkspaceItem) {
  const status = absence.justification?.status ?? "TO_PROVIDE";
  if (status === "RECEIVED") return 0;
  if (status === "TO_PROVIDE") return 1;
  if (status === "REJECTED") return 2;
  return 3;
}

function AbsenceDrawer({ mode, absence, employees, isAdmin, isPending, onClose, onSubmit, onDelete, onValidate, onReject, runAction, askReason, closeOnEscape }: {
  askReason: (options: AskOptions) => Promise<string | null>;
  closeOnEscape: boolean;
  mode: "create" | "edit";
  absence: AbsenceWorkspaceItem | null;
  employees: Employee[];
  isAdmin: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  onDelete: (absence: AbsenceWorkspaceItem) => void;
  onValidate: (absence: AbsenceWorkspaceItem) => void;
  onReject: (absence: AbsenceWorkspaceItem) => void;
  runAction: (action: () => Promise<ActionResult>, fallback?: string, afterSuccess?: () => void) => void;
}) {
  const integrated = absence?.payrollImpactStatus === "INTEGRATED";
  const [selectedType, setSelectedType] = useState(absence?.type ?? "");
  useEffect(() => { setSelectedType(absence?.type ?? ""); }, [absence?.id, absence?.type, mode]);
  const isWorkStoppage = ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"].includes(selectedType);

  // Échap ferme le panneau (sauf si une fenêtre de confirmation est ouverte par-dessus).
  useEffect(() => {
    if (!closeOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeOnEscape, onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin || integrated) return;
    onSubmit(new FormData(event.currentTarget));
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runAction(() => uploadAbsenceJustification(new FormData(event.currentTarget)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/25 backdrop-blur-[1px] sm:p-4" role="dialog" aria-modal="true" aria-label={mode === "create" ? "Ajouter une absence" : "Dossier absence"}>
      <button type="button" onClick={onClose} aria-label="Fermer" className="absolute inset-0 cursor-default" />
      <aside className="relative z-10 flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border sm:border-surface-border">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">{mode === "create" ? "Nouvelle absence" : "Dossier absence"}</p><h2 className="mt-1 text-lg font-semibold text-ink">{mode === "create" ? "Ajouter une absence" : absence?.employeeName}</h2>{absence && <p className="mt-1 text-xs text-ink-faint">{STATUS_META[absence.status]?.label ?? absence.status} · {PAYROLL_META[absence.payrollImpactStatus]?.label ?? absence.payrollImpactStatus}</p>}</div>
          <IconButton label="Fermer" onClick={onClose}><X size={18} /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form id="absence-editor-form" onSubmit={submit} className="px-5 py-5">
            {integrated && <div className="mb-4 rounded-xl border border-surface-border bg-surface-subtle px-4 py-3 text-xs leading-relaxed text-ink-soft">Les données utilisées dans la paie sont figées et le dossier est conservé. Pour un arrêt de travail, une nouvelle reprise réelle peut être enregistrée dans la section dédiée ci-dessous.</div>}
            <div className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Salarié</span><select name="employeeId" defaultValue={absence?.employeeId ?? ""} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle"><option value="">Sélectionner...</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Type d'absence</span><select name="type" value={selectedType} onChange={(event) => setSelectedType(event.target.value)} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle"><option value="">Sélectionner...</option>{Object.entries(TYPE_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Du</span><input name="startDate" type="date" defaultValue={absence?.startDate.slice(0, 10) ?? dateKey(currentUtcDay())} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Au</span><input name="endDate" type="date" defaultValue={absence?.endDate.slice(0, 10) ?? dateKey(currentUtcDay())} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label></div>
              {isWorkStoppage && (
                <div className="rounded-xl border border-surface-border bg-surface-subtle/40 p-3">
                  <p className="text-sm font-medium text-ink">Informations DSN de l'arrêt</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-faint">Renseignez les données du justificatif ou du signalement réel : RH Pilot ne déduit plus automatiquement le dernier jour travaillé.</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block col-span-2 sm:col-span-1"><span className="mb-1.5 block text-xs font-medium text-ink">Dernier jour travaillé</span><input name="lastWorkedDate" type="date" defaultValue={absence?.lastWorkedDate?.slice(0, 10) ?? ""} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label>
                    {selectedType === "WORK_ACCIDENT" && <label className="block col-span-2 sm:col-span-1"><span className="mb-1.5 block text-xs font-medium text-ink">Date de l'accident</span><input name="workAccidentDate" type="date" defaultValue={absence?.workAccidentDate?.slice(0, 10) ?? ""} required disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label>}
                    <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Début de subrogation</span><input name="subrogationStartDate" type="date" defaultValue={absence?.subrogationStartDate?.slice(0, 10) ?? ""} disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Fin de subrogation</span><input name="subrogationEndDate" type="date" defaultValue={absence?.subrogationEndDate?.slice(0, 10) ?? ""} disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Date de reprise réelle</span><input name="returnDate" type="date" defaultValue={absence?.returnDate?.slice(0, 10) ?? ""} disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Motif de reprise</span><select name="returnReasonCode" defaultValue={absence?.returnReasonCode ?? ""} disabled={!isAdmin || integrated} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle"><option value="">Non renseigné</option><option value="01">01 · Reprise normale</option><option value="02">02 · Temps partiel thérapeutique</option><option value="03">03 · Temps partiel raison personnelle</option></select></label>
                  </div>
                </div>
              )}
              <label className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-subtle/40 p-3"><input name="justificationRequired" type="checkbox" defaultChecked={absence?.justificationRequired ?? false} disabled={!isAdmin || integrated} className="mt-0.5 h-4 w-4 rounded border-surface-border" /><span><span className="block text-sm font-medium text-ink">Justificatif demandé</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">Le document devra être reçu puis vérifié avant validation du dossier.</span></span></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Note interne</span><textarea name="notes" defaultValue={absence?.notes ?? ""} rows={4} maxLength={1000} disabled={!isAdmin || integrated} placeholder="Informations utiles pour le suivi RH..." className="w-full resize-y rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary disabled:bg-surface-subtle" /></label>
            </div>
          </form>

          {absence && isAdmin && isWorkStoppage && absence.status === "VALIDATED" && ["READY", "INTEGRATED"].includes(absence.payrollImpactStatus) && !absence.returnDate && (
            <form className="border-t border-surface-border px-5 py-5" onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              runAction(() => recordAbsenceRecovery(absence.id, formData), "Reprise enregistrée.", onClose);
            }}>
              <h3 className="text-sm font-semibold text-ink">Enregistrer la reprise réelle</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">À renseigner après le retour du salarié. Les mois clôturés sont conservés ; les périodes ouvertes concernées devront être recalculées. Vous pourrez ensuite préparer le signalement de reprise anticipée dans Paie → DSN.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Date de reprise réelle</span><input name="returnDate" type="date" required disabled={isPending} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Motif de reprise</span><select name="returnReasonCode" required defaultValue="" disabled={isPending} className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary"><option value="" disabled>Choisir le motif</option><option value="01">01 · Reprise normale</option><option value="03">03 · Temps partiel raison personnelle</option></select></label>
              </div>
              <div className="mt-3 flex justify-end"><Button type="submit" disabled={isPending}>{isPending && <Loader2 size={15} className="animate-spin" />}Enregistrer la reprise</Button></div>
            </form>
          )}

          {absence && (
            <div className="border-t border-surface-border px-5 py-5">
              <h3 className="text-sm font-semibold text-ink">Traitement du dossier</h3>
              <div className="mt-3 flex flex-wrap gap-2"><StatusPill value={absence.status} /><JustificationPill absence={absence} /><PayrollPill value={absence.payrollImpactStatus} /></div>
              {absence.rejectedReason && <p className="mt-3 rounded-lg bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">Motif du refus : {absence.rejectedReason}</p>}

              {absence.justificationRequired && absence.justification?.hasFile && (
                <div className="mt-4 rounded-lg bg-surface-subtle p-3">
                  <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-medium text-ink">{absence.justification.fileName || "Justificatif"}</p><p className="mt-0.5 text-[11px] text-ink-faint">{absence.justification.mimeType || "Document"}{absence.justification.sizeBytes ? ` · ${formatSize(absence.justification.sizeBytes)}` : ""}</p></div><a href={`/api/absences/justifications/${absence.justification.id}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-brand-primary hover:underline">Ouvrir</a></div>
                </div>
              )}

              {isAdmin && absence.justificationRequired && !integrated && (!absence.justification || ["TO_PROVIDE", "REJECTED"].includes(absence.justification.status)) && (
                <form onSubmit={upload} className="mt-4 rounded-lg border border-dashed border-surface-border p-3">
                  <input type="hidden" name="absenceId" value={absence.id} /><input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="block w-full text-xs text-ink-soft" /><div className="mt-2 flex justify-end"><Button type="submit" variant="secondary" disabled={isPending} className="min-h-8 px-3 py-1.5 text-xs">Déposer le justificatif</Button></div>
                </form>
              )}

              {isAdmin && absence.justification?.status === "RECEIVED" && !integrated && (
                <div className="mt-3 flex flex-wrap gap-2"><Button type="button" className="min-h-9 px-3 py-2 text-xs" disabled={isPending} onClick={() => runAction(() => validateAbsenceJustification(absence.justification!.id))}>Vérifier le justificatif</Button><Button type="button" variant="danger" className="min-h-9 px-3 py-2 text-xs" disabled={isPending} onClick={() => { void askReason(JUSTIFICATION_REJECTION).then((reason) => { if (reason) runAction(() => rejectAbsenceJustification(absence.justification!.id, reason)); }); }}>Refuser le justificatif</Button></div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-surface-border bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" && absence && isAdmin && !integrated && <Button type="button" variant="danger" disabled={isPending} onClick={() => onDelete(absence)} className="mr-auto"><Trash2 size={15} /> Supprimer</Button>}
            {mode === "edit" && absence && isAdmin && absence.status === "TO_VALIDATE" && !integrated && <Button type="button" variant="secondary" disabled={isPending} onClick={() => onValidate(absence)}><Check size={15} /> Valider</Button>}
            {mode === "edit" && absence && isAdmin && !["VALIDATED", "REJECTED"].includes(absence.status) && !integrated && <Button type="button" variant="ghost" disabled={isPending} onClick={() => onReject(absence)} className="text-accent-rose">Refuser</Button>}
            <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
            {isAdmin && !integrated && <Button type="submit" form="absence-editor-form" disabled={isPending}>{isPending && <Loader2 size={15} className="animate-spin" />}{mode === "create" ? "Ajouter" : "Enregistrer"}</Button>}
          </div>
        </div>
      </aside>
    </div>
  );
}

function IconButton({ label, onClick, children, disabled = false, tone = "text-ink-soft hover:bg-surface-subtle hover:text-ink" }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; tone?: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${tone}`}>{children}</button>;
}
