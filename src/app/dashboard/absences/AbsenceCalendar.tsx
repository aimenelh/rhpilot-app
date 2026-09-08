"use client";

import { useMemo, useState } from "react";

type CalendarAbsence = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  employee: { firstName: string; lastName: string };
  status: string;
};

const TYPE_STYLES: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  PAID_LEAVE: { label: "Congés payés", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-100" },
  RTT: { label: "RTT", dot: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-100" },
  SICK_LEAVE: { label: "Maladie", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-100" },
  WORK_ACCIDENT: { label: "Accident du travail", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-800", border: "border-red-100" },
  UNPAID_LEAVE: { label: "Sans solde", dot: "bg-slate-500", bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200" },
  FAMILY_EVENT: { label: "Événement familial", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-100" },
  OTHER: { label: "Autre", dot: "bg-gray-500", bg: "bg-gray-50", text: "text-gray-800", border: "border-gray-200" },
};

const STATUS_LABELS: Record<string, string> = {
  TO_VALIDATE: "À valider",
  TO_PROVIDE_JUSTIFICATION: "Justificatif à fournir",
  TO_REVIEW_JUSTIFICATION: "Justificatif à vérifier",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};

function startOfDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function isInRange(day: Date, absence: CalendarAbsence) {
  const start = startOfDay(absence.startDate);
  const end = startOfDay(absence.endDate);
  return day >= start && day <= end;
}

export default function AbsenceCalendar({ absences }: { absences: CalendarAbsence[] }) {
  const initialDate = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const days = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((mondayOffset + lastDay.getDate()) / 7) * 7;
    return Array.from({ length: totalCells }, (_, index) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), index + 1 - mondayOffset));
  }, [currentMonth]);

  const today = new Date();

  const goToMonth = (offset: number) => {
    setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-surface-border bg-white">
      <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-ink-faint">Vue mensuelle</p>
          <h3 className="mt-0.5 text-lg font-semibold capitalize text-ink">{monthLabel(currentMonth)}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => goToMonth(-1)} className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-surface-subtle" aria-label="Mois précédent">‹</button>
          <button type="button" onClick={goToToday} className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-surface-subtle">Aujourd'hui</button>
          <button type="button" onClick={() => goToMonth(1)} className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-surface-subtle" aria-label="Mois suivant">›</button>
        </div>
      </div>

      <div className="border-b border-surface-border px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(TYPE_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <span>{style.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-surface-border bg-surface-subtle/60">
        {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((label) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const current = day.getMonth() === currentMonth.getMonth();
          const dayAbsences = absences.filter((absence) => isInRange(day, absence));
          const todayCell = sameDay(day, today);

          return (
            <div key={day.toISOString()} className={`min-h-[108px] border-b border-r border-surface-border p-1.5 sm:min-h-[132px] ${current ? "bg-white" : "bg-surface-subtle/35"}`}>
              <div className="flex items-center justify-between px-0.5">
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${todayCell ? "bg-brand-primary text-white" : current ? "text-ink-soft" : "text-ink-faint"}`}>
                  {day.getDate()}
                </span>
                {dayAbsences.length > 0 ? <span className="text-[10px] font-medium text-ink-faint">{dayAbsences.length}</span> : null}
              </div>

              <div className="mt-1.5 space-y-1">
                {dayAbsences.slice(0, 3).map((absence) => {
                  const style = TYPE_STYLES[absence.type] ?? TYPE_STYLES.OTHER;
                  const isStart = sameDay(day, startOfDay(absence.startDate));
                  const isEnd = sameDay(day, startOfDay(absence.endDate));

                  return (
                    <div key={absence.id} title={`${absence.employee.firstName} ${absence.employee.lastName} · ${style.label} · ${STATUS_LABELS[absence.status] ?? absence.status}`} className={`border px-1.5 py-1 text-[10px] leading-tight ${style.bg} ${style.text} ${style.border} ${isStart ? "rounded-t-md" : "rounded-l-md"} ${isEnd ? "rounded-b-md" : "rounded-r-md"}`}>
                      <div className="truncate font-semibold">{absence.employee.firstName} {absence.employee.lastName}</div>
                      <div className="truncate opacity-80">{style.label}</div>
                    </div>
                  );
                })}
                {dayAbsences.length > 3 ? <p className="px-1 text-[10px] font-medium text-ink-faint">+ {dayAbsences.length - 3} autre{dayAbsences.length - 3 > 1 ? 's' : ''}</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-surface-border bg-surface-subtle/40 px-4 py-3 text-xs text-ink-faint">
        Les couleurs correspondent au motif d'absence. Les actions de validation et de justificatif restent accessibles dans le suivi détaillé ci-dessous.
      </div>

      {absences.length > 0 ? (
        <div className="border-t border-surface-border px-4 py-3 text-xs text-ink-soft">
          <span className="font-semibold text-ink">Périodes visibles :</span>{" "}
          {absences.slice(0, 5).map((absence, index) => `${absence.employee.firstName} ${absence.employee.lastName} · ${formatShortDate(absence.startDate)} → ${formatShortDate(absence.endDate)}`).join(" · ")}
          {absences.length > 5 ? " · …" : ""}
        </div>
      ) : null}
    </div>
  );
}
