"use client";

import { useState, useTransition } from "react";
import { saveBonusDsnDeclaration } from "../entryActions";

export type BonusDsnRow = {
  employeeId: string;
  employeeName: string;
  code: string;
  label: string;
  amount: number;
  /** Valeurs enregistrées, ou null si la prime n'est pas encore qualifiée. */
  saved: { type: string; start: string; end: string } | null;
  /** Proposition à confirmer : jamais enregistrée sans action de l'utilisateur. */
  suggestion: { type: string; start: string; end: string };
};

const TYPES = [
  { value: "027", label: "Liée à l'activité, versée pour une période", hint: "13e mois, prime de fin d'année, prime de vacances, prime annuelle d'objectifs." },
  { value: "026", label: "Exceptionnelle, liée à l'activité", hint: "Prime ponctuelle qui récompense le travail d'une période précise." },
  { value: "028", label: "Non liée à l'activité", hint: "Prime d'événement (mariage, naissance, médaille), sans lien avec le travail fourni." },
];

const euros = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function Row({ periodId, row, editable }: { periodId: string; row: BonusDsnRow; editable: boolean }) {
  const initial = row.saved ?? row.suggestion;
  const [type, setType] = useState(initial.type);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [saved, setSaved] = useState(row.saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = !saved || saved.type !== type || saved.start !== start || saved.end !== end;
  const hint = TYPES.find((option) => option.value === type)?.hint;

  const save = () => startTransition(async () => {
    const result = await saveBonusDsnDeclaration(periodId, row.employeeId, row.code, { type, start, end });
    if ("error" in result) setError(result.error);
    else { setError(null); setSaved({ type, start, end }); }
  });

  return (
    <div className="grid gap-3 border-b border-surface-border px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
      <div>
        <p className="font-medium text-ink">{row.employeeName}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{row.label} · <span className="tabular-nums">{euros(row.amount)}</span></p>
        <p className={`mt-1 text-xs ${saved && !dirty ? "text-ink-faint" : "text-accent-amber"}`}>{saved && !dirty ? "Qualifiée pour la DSN" : "À confirmer avant le calcul"}</p>
      </div>
      <div className="space-y-2">
        <label className="block">
          <span className="sr-only">Nature de la prime pour la DSN</span>
          <select value={type} onChange={(event) => setType(event.target.value)} disabled={!editable || pending} className="h-9 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:bg-surface-subtle/60">
            <option value="">Choisir la nature de la prime</option>
            {TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {hint ? <p className="text-xs leading-5 text-ink-faint">{hint}</p> : null}
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-ink-soft">
            Période du
            <input type="date" value={start} onChange={(event) => setStart(event.target.value)} disabled={!editable || pending} className="mt-1 block h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink disabled:bg-surface-subtle/60" />
          </label>
          <label className="text-xs text-ink-soft">
            au
            <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} disabled={!editable || pending} className="mt-1 block h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink disabled:bg-surface-subtle/60" />
          </label>
          {editable ? (
            <button type="button" onClick={save} disabled={pending || !dirty || !type} className="h-9 rounded-md bg-ink px-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30">
              {pending ? "Enregistrement…" : saved && !dirty ? "Enregistré" : "Confirmer"}
            </button>
          ) : null}
        </div>
        {type === "028" ? <p className="text-xs leading-5 text-ink-faint">La période est facultative pour une prime non liée à l&apos;activité.</p> : null}
        {error ? <p className="text-xs text-accent-rose">{error}</p> : null}
      </div>
    </div>
  );
}

export default function BonusDsnPanel({ periodId, rows, editable }: { periodId: string; rows: BonusDsnRow[]; editable: boolean }) {
  if (rows.length === 0) return null;
  return (
    <div className="border-t border-surface-border">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-ink">Primes non mensuelles</h3>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-faint">
          La DSN déclare ces primes à part, avec leur nature et la période de travail qu&apos;elles récompensent. RH Pilot propose une période ; confirmez-la ou corrigez-la avant de calculer le mois.
        </p>
      </div>
      <div className="border-t border-surface-border">
        {rows.map((row) => <Row key={`${row.employeeId}:${row.code}`} periodId={periodId} row={row} editable={editable} />)}
      </div>
    </div>
  );
}
