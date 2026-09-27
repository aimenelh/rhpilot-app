"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { formatCellValue } from "@/lib/payroll/entry-grid";
import { saveIjssAmount } from "../entryActions";

export type PeriodAbsenceRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  typeLabel: string;
  dates: string;
  daysInMonth: number;
  ijssEligible: boolean;
  ijssAmount: number | null;
};

function IjssInput({ periodId, row, editable, autoFocus }: { periodId: string; row: PeriodAbsenceRow; editable: boolean; autoFocus: boolean }) {
  const [value, setValue] = useState(formatCellValue(row.ijssAmount));
  const [saved, setSaved] = useState(formatCellValue(row.ijssAmount));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const commit = () => {
    if (value.trim() === saved.trim()) return;
    startTransition(async () => {
      const result = await saveIjssAmount(periodId, row.employeeId, row.id, value);
      if ("error" in result) setError(result.error);
      else { setError(null); setSaved(value); }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-end gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          disabled={!editable}
          autoFocus={autoFocus}
          inputMode="decimal"
          placeholder="Montant brut"
          aria-label={`IJSS brutes, ${row.employeeName}, ${row.dates}`}
          className={`h-9 w-32 rounded-md border bg-white px-2 text-right text-sm tabular-nums text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:bg-surface-subtle/60 ${error ? "border-accent-rose" : pending ? "border-accent-amber/60" : "border-surface-border"}`}
        />
        <span className="text-xs text-ink-faint">€</span>
      </div>
      {error ? <p className="mt-1 text-right text-[11px] text-accent-rose">{error}</p> : null}
    </div>
  );
}

export default function PayrollAbsencesPanel({ periodId, rows, pendingCount, editable, focusAbsenceId }: { periodId: string; rows: PeriodAbsenceRow[]; pendingCount: number; editable: boolean; focusAbsenceId?: string | null }) {
  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-surface-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-ink-faint">Les absences viennent du module Absences, une fois validées. Pour un arrêt, saisissez le montant brut des indemnités journalières figurant sur l&apos;attestation de la CPAM : sans lui, RH Pilot les estime et le signale.</p>
        <Link href="/dashboard/absences" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline">Modifier dans Absences <ExternalLink size={13} /></Link>
      </div>
      {pendingCount > 0 ? (
        <div className="border-b border-accent-amber/20 bg-accent-amber/5 px-5 py-2.5 text-sm text-ink-soft">
          {pendingCount === 1
            ? "Une absence du mois attend encore sa validation : elle ne compte pas dans la paie tant qu'elle n'est pas validée."
            : `${pendingCount} absences du mois attendent encore leur validation : elles ne comptent pas dans la paie tant qu'elles ne sont pas validées.`}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-soft">Aucune absence validée sur le mois.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-xs font-semibold text-ink-faint"><th className="border-b border-surface-border px-5 py-2.5">Salarié</th><th className="border-b border-surface-border px-3 py-2.5">Absence</th><th className="border-b border-surface-border px-3 py-2.5">Dates</th><th className="border-b border-surface-border px-3 py-2.5 text-right">Jours sur le mois</th><th className="border-b border-surface-border px-5 py-2.5 text-right">IJSS brutes</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-surface-border px-5 py-2 font-medium text-ink">{row.employeeName}</td>
                  <td className="border-b border-surface-border px-3 py-2 text-ink-soft">{row.typeLabel}</td>
                  <td className="border-b border-surface-border px-3 py-2 text-ink-soft">{row.dates}</td>
                  <td className="border-b border-surface-border px-3 py-2 text-right tabular-nums text-ink-soft">{row.daysInMonth}</td>
                  <td className="border-b border-surface-border px-5 py-1.5">{row.ijssEligible ? <IjssInput periodId={periodId} row={row} editable={editable} autoFocus={focusAbsenceId === row.id} /> : <p className="text-right text-xs text-ink-faint">Sans objet</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
