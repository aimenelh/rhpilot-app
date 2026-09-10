"use client";

import { useEffect, useState } from "react";

const EURO_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type MinimumSalaryControl = {
  status: "APPLICABLE" | "UNRESOLVED";
  source?: "SMIC" | "COLLECTIVE_AGREEMENT";
  appliedMonthlyMinimumCents?: number;
  smicMonthlyMinimumCents?: number;
  collectiveMonthlyMinimumCents?: number | null;
  compliant?: boolean;
  differenceCents?: number;
  smicRuleCode?: string;
  smicRuleVersionId?: string;
  collectiveRuleVersionId?: string;
  explanation: string;
  code?: string;
};

type Row = {
  employeeId: string;
  minimumSalaryControl: MinimumSalaryControl | null;
};

function formatCents(value: number | undefined) {
  return value === undefined ? "—" : EURO_FORMATTER.format(value / 100);
}

export default function MinimumSalaryControlSection({
  periodId,
  employees,
}: {
  periodId: string;
  employees: Array<{ id: string; firstName: string; lastName: string }>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/payroll/periods/${encodeURIComponent(periodId)}/minimum-salary`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger le contrôle du salaire minimum.");
        return (await response.json()) as Row[];
      })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Impossible de charger le contrôle du salaire minimum.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [periodId]);

  const rowByEmployee = new Map(rows.map((row) => [row.employeeId, row.minimumSalaryControl]));
  const resolvedRows = employees
    .map((employee) => ({ employee, control: rowByEmployee.get(employee.id) ?? null }))
    .filter(({ control }) => control !== null);
  const nonCompliantCount = resolvedRows.filter(({ control }) => control?.status === "APPLICABLE" && control.compliant === false).length;
  const unresolvedCount = resolvedRows.filter(({ control }) => control?.status === "UNRESOLVED").length;

  return (
    <section className="mt-7 rounded-xl border border-surface-border bg-white">
      <div className="border-b border-surface-border px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Contrôle réglementaire</p>
            <h2 className="mt-1 font-semibold text-ink">Salaire minimum applicable</h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-soft">
              RH Pilot compare le salaire brut de référence au SMIC proratisé et, lorsqu’il est résolu, au minimum conventionnel. Ce contrôle n’ajuste jamais le salaire automatiquement.
            </p>
          </div>
          {!loading && rows.length > 0 ? (
            <div className="flex shrink-0 gap-2 text-xs font-semibold">
              {nonCompliantCount > 0 && <span className="rounded-full bg-accent-rose/10 px-3 py-1.5 text-accent-rose">{nonCompliantCount} non conforme{nonCompliantCount > 1 ? "s" : ""}</span>}
              {unresolvedCount > 0 && <span className="rounded-full bg-accent-amber/10 px-3 py-1.5 text-accent-amber">{unresolvedCount} non déterminé{unresolvedCount > 1 ? "s" : ""}</span>}
              {nonCompliantCount === 0 && unresolvedCount === 0 && <span className="rounded-full bg-accent-teal/10 px-3 py-1.5 text-accent-teal">Contrôle conforme</span>}
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-sm text-ink-faint">Chargement du contrôle…</p>
        ) : error ? (
          <p className="rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber">{error}</p>
        ) : resolvedRows.length === 0 ? (
          <p className="text-sm text-ink-faint">Aucun contrôle de salaire minimum n’est disponible. Calculez d’abord la période.</p>
        ) : (
          <div className="space-y-3">
            {resolvedRows.map(({ employee, control }) => {
              if (!control) return null;
              const isUnresolved = control.status === "UNRESOLVED";
              const isCompliant = control.compliant === true;
              return (
                <div
                  key={employee.id}
                  className={`rounded-lg border p-4 ${
                    isUnresolved
                      ? "border-accent-amber/30 bg-accent-amber/5"
                      : isCompliant
                        ? "border-surface-border bg-surface-subtle/30"
                        : "border-accent-rose/30 bg-accent-rose/5"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p>
                      <p className="mt-1 text-sm text-ink-soft">{control.explanation}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${isUnresolved ? "bg-accent-amber/10 text-accent-amber" : isCompliant ? "bg-accent-teal/10 text-accent-teal" : "bg-accent-rose/10 text-accent-rose"}`}>
                      {isUnresolved ? "Non déterminé" : isCompliant ? "Conforme" : "Non conforme"}
                    </span>
                  </div>

                  {!isUnresolved ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-ink-faint">Minimum appliqué</p>
                        <p className="mt-1 font-semibold text-ink">{formatCents(control.appliedMonthlyMinimumCents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-faint">SMIC proratisé</p>
                        <p className="mt-1 font-semibold text-ink">{formatCents(control.smicMonthlyMinimumCents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-faint">Minimum conventionnel</p>
                        <p className="mt-1 font-semibold text-ink">{formatCents(control.collectiveMonthlyMinimumCents ?? undefined)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-faint">Écart</p>
                        <p className={`mt-1 font-semibold ${isCompliant ? "text-accent-teal" : "text-accent-rose"}`}>
                          {formatCents(control.differenceCents)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-faint">Code : {control.code ?? "NON_RESOLU"}</p>
                  )}

                  {!isUnresolved ? (
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-surface-border pt-3 text-xs text-ink-faint">
                      <span>Source : {control.source === "COLLECTIVE_AGREEMENT" ? "Convention collective" : "SMIC"}</span>
                      <span>Version SMIC : {control.smicRuleVersionId ?? "—"}</span>
                      {control.collectiveRuleVersionId ? <span>Version convention : {control.collectiveRuleVersionId}</span> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
