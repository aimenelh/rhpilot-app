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
  const unresolvedRows = resolvedRows.filter(({ control }) => control?.status === "UNRESOLVED");
  const resolvedControlRows = resolvedRows.filter(({ control }) => control?.status === "APPLICABLE");
  const nonCompliantCount = resolvedControlRows.filter(({ control }) => control?.compliant === false).length;
  const unresolvedCount = unresolvedRows.length;

  return (
    <section className="mt-7 overflow-hidden rounded-xl border border-surface-border bg-white">
      <div className="border-b border-surface-border px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Contrôle réglementaire</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">Salaire minimum applicable</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">
              RH Pilot vérifie le minimum applicable sans modifier automatiquement le salaire de référence.
            </p>
          </div>
          {!loading && rows.length > 0 ? (
            <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
              {nonCompliantCount > 0 && (
                <span className="rounded-full bg-accent-rose/10 px-3 py-1.5 text-accent-rose">
                  {nonCompliantCount} non conforme{nonCompliantCount > 1 ? "s" : ""}
                </span>
              )}
              {unresolvedCount > 0 && (
                <span className="rounded-full bg-accent-amber/10 px-3 py-1.5 text-accent-amber">
                  {unresolvedCount} contrôle{unresolvedCount > 1 ? "s" : ""} à compléter
                </span>
              )}
              {nonCompliantCount === 0 && unresolvedCount === 0 && (
                <span className="rounded-full bg-accent-teal/10 px-3 py-1.5 text-accent-teal">Contrôle conforme</span>
              )}
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
          <div className="space-y-4">
            {unresolvedRows.length > 0 ? (
              <div className="rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">Minimum conventionnel à compléter</p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">
                      Le contrôle ne peut pas déterminer le minimum conventionnel pour {unresolvedRows.length} salarié{unresolvedRows.length > 1 ? "s" : ""}. Le calcul n’invente pas de valeur en l’absence d’une règle conventionnelle validée.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-amber/10 px-2.5 py-1 text-xs font-semibold text-accent-amber">
                    À compléter
                  </span>
                </div>

                <details className="mt-4 border-t border-accent-amber/20 pt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                    Voir les {unresolvedRows.length} salarié{unresolvedRows.length > 1 ? "s" : ""} concernés
                  </summary>
                  <div className="mt-3 divide-y divide-surface-border rounded-lg border border-surface-border bg-white">
                    {unresolvedRows.map(({ employee, control }) => (
                      <div key={employee.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-ink">{employee.firstName} {employee.lastName}</p>
                          <p className="mt-0.5 text-xs text-ink-faint">{control?.explanation}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-accent-amber">Règle à compléter</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : null}

            {resolvedControlRows.map(({ employee, control }) => {
              if (!control) return null;
              const isCompliant = control.compliant === true;
              return (
                <div
                  key={employee.id}
                  className={`rounded-lg border p-4 ${
                    isCompliant ? "border-surface-border bg-surface-subtle/30" : "border-accent-rose/30 bg-accent-rose/5"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {isCompliant
                          ? `Salaire conforme au minimum de ${formatCents(control.appliedMonthlyMinimumCents)}.`
                          : `Salaire inférieur de ${formatCents(Math.abs(control.differenceCents ?? 0))} au minimum applicable.`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${isCompliant ? "bg-accent-teal/10 text-accent-teal" : "bg-accent-rose/10 text-accent-rose"}`}>
                      {isCompliant ? "Conforme" : "Non conforme"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-ink-faint">Minimum applicable</p>
                      <p className="mt-1 font-semibold text-ink">{formatCents(control.appliedMonthlyMinimumCents)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-faint">Écart avec le salaire de référence</p>
                      <p className={`mt-1 font-semibold ${isCompliant ? "text-accent-teal" : "text-accent-rose"}`}>
                        {formatCents(control.differenceCents)}
                      </p>
                    </div>
                  </div>

                  <details className="mt-4 border-t border-surface-border pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-ink-soft">Voir le détail du contrôle</summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div><p className="text-xs text-ink-faint">SMIC proratisé</p><p className="mt-1 text-sm font-semibold text-ink">{formatCents(control.smicMonthlyMinimumCents)}</p></div>
                      <div><p className="text-xs text-ink-faint">Minimum conventionnel</p><p className="mt-1 text-sm font-semibold text-ink">{formatCents(control.collectiveMonthlyMinimumCents ?? undefined)}</p></div>
                      <div><p className="text-xs text-ink-faint">Source retenue</p><p className="mt-1 text-sm font-semibold text-ink">{control.source === "COLLECTIVE_AGREEMENT" ? "Convention collective" : "SMIC"}</p></div>
                      <div><p className="text-xs text-ink-faint">Version SMIC</p><p className="mt-1 text-sm font-semibold text-ink">{control.smicRuleVersionId ?? "—"}</p></div>
                    </div>
                    {control.collectiveRuleVersionId ? <p className="mt-3 text-xs text-ink-faint">Version convention : {control.collectiveRuleVersionId}</p> : null}
                    <p className="mt-2 text-xs text-ink-faint">{control.explanation}</p>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
