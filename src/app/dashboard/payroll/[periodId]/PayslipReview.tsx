"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, X } from "lucide-react";

export type ReviewLine = {
  code: string;
  label: string;
  section: string;
  base?: number;
  quantity?: number;
  unit?: string;
  rate?: number;
  employerRate?: number;
  amount?: number;
  employerAmount?: number;
};

export type PayslipReviewRow = {
  employeeId: string;
  name: string;
  position: string;
  grossTotal: number;
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;
  netTaxable: number;
  withholdingTax: number;
  withholdingRate: number;
  withholdingMode: "PERSONALIZED" | "DEFAULT_GRID";
  netPaid: number;
  netSocial: number;
  employerCost: number;
  warnings: string[];
  payslipId: string | null;
  lines: ReviewLine[];
};

const SECTION_TITLES: Record<string, string> = {
  SANTE: "Santé",
  ACCIDENTS_TRAVAIL: "Accidents du travail",
  RETRAITE: "Retraite",
  FAMILLE: "Famille",
  CHOMAGE: "Assurance chômage",
  AUTRES_EMPLOYEUR: "Autres contributions employeur",
  CSG_CRDS: "CSG et CRDS",
  EXONERATIONS: "Exonérations et réductions",
};

const euros = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
const amount = (value: number | undefined) => (value === undefined || value === 0 ? "" : new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value));
const percent = (value: number | undefined) => (value === undefined || value === 0 ? "" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(value * 100)} %`);

function Preview({ row, periodLabel, onClose, onPrevious, onNext, position, total }: { row: PayslipReviewRow; periodLabel: string; onClose: () => void; onPrevious: () => void; onNext: () => void; position: number; total: number }) {
  const gross = row.lines.filter((line) => line.section === "GROSS");
  const netItems = row.lines.filter((line) => line.section === "NET_ITEMS");
  const sections = Object.keys(SECTION_TITLES).map((section) => ({ section, lines: row.lines.filter((line) => line.section === section) })).filter((group) => group.lines.length > 0);

  return (
    <aside role="dialog" aria-label={`Bulletin de ${row.name}`} className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[640px] flex-col border-l border-surface-border bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-faint">{periodLabel} · {position}/{total}</p>
          <h3 className="truncate text-lg font-semibold text-ink">{row.name}</h3>
          <p className="truncate text-xs text-ink-soft">{row.position || "Emploi non renseigné"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onPrevious} disabled={position <= 1} aria-label="Salarié précédent" className="rounded-md p-2 text-ink-soft hover:bg-surface-subtle disabled:opacity-30"><ChevronUp size={18} /></button>
          <button type="button" onClick={onNext} disabled={position >= total} aria-label="Salarié suivant" className="rounded-md p-2 text-ink-soft hover:bg-surface-subtle disabled:opacity-30"><ChevronDown size={18} /></button>
          {row.payslipId ? <a href={`/api/payroll/payslips/${row.payslipId}`} className="rounded-md p-2 text-ink-soft hover:bg-surface-subtle" aria-label="Télécharger le PDF"><Download size={18} /></a> : null}
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-2 text-ink-soft hover:bg-surface-subtle"><X size={18} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {row.warnings.length > 0 ? (
          <div className="mb-4 rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-3 py-2">
            {row.warnings.map((warning, index) => <p key={index} className="text-xs leading-5 text-ink-soft">{warning}</p>)}
          </div>
        ) : null}

        <table className="w-full text-xs">
          <thead><tr className="text-left text-[11px] font-semibold text-ink-faint"><th className="py-1.5">Rubrique</th><th className="py-1.5 text-right">Base</th><th className="py-1.5 text-right">Taux</th><th className="py-1.5 text-right">Salarié</th><th className="py-1.5 text-right">Employeur</th></tr></thead>
          <tbody>
            {gross.map((line, index) => (
              <tr key={`g-${index}`} className="border-t border-surface-border/60">
                <td className="py-1.5 pr-2 text-ink">{line.label}</td>
                <td className="py-1.5 text-right tabular-nums text-ink-soft">{line.quantity !== undefined ? `${amount(line.quantity)}${line.unit === "HOURS" ? " h" : line.unit === "DAYS" ? " j" : ""}` : ""}</td>
                <td className="py-1.5 text-right tabular-nums text-ink-soft">{line.rate !== undefined && line.code !== "CDD_END_ALLOWANCE" ? amount(line.rate) : ""}</td>
                <td className="py-1.5 text-right tabular-nums text-ink">{amount(line.amount)}</td>
                <td />
              </tr>
            ))}
            <tr className="border-t-2 border-ink/80 font-semibold"><td className="py-2 text-ink">Salaire brut</td><td /><td /><td className="py-2 text-right tabular-nums text-ink">{amount(row.grossTotal)}</td><td /></tr>
            {sections.map((group) => (
              <FragmentRows key={group.section} title={SECTION_TITLES[group.section]} lines={group.lines} />
            ))}
            <tr className="border-t-2 border-ink/80 font-semibold"><td className="py-2 text-ink">Total des cotisations</td><td /><td /><td className="py-2 text-right tabular-nums text-ink">{amount(-row.employeeContributions)}</td><td className="py-2 text-right tabular-nums text-ink">{amount(row.employerContributions)}</td></tr>
            {netItems.map((line, index) => (
              <tr key={`n-${index}`} className="border-t border-surface-border/60"><td className="py-1.5 pr-2 text-ink">{line.label}</td><td /><td /><td className="py-1.5 text-right tabular-nums text-ink">{amount(line.amount)}</td><td /></tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-surface-subtle/50 p-4 text-sm">
          <dt className="text-ink-soft">Net avant impôt</dt><dd className="text-right font-medium tabular-nums text-ink">{euros(row.netBeforeTax)}</dd>
          <dt className="text-ink-soft">Net imposable</dt><dd className="text-right tabular-nums text-ink">{euros(row.netTaxable)}</dd>
          <dt className="text-ink-soft">Impôt ({row.withholdingMode === "PERSONALIZED" ? "taux" : "grille"} {percent(row.withholdingRate) || "0 %"})</dt><dd className="text-right tabular-nums text-ink">{euros(-row.withholdingTax)}</dd>
          <dt className="font-semibold text-ink">Net payé</dt><dd className="text-right text-base font-semibold tabular-nums text-ink">{euros(row.netPaid)}</dd>
          <dt className="text-ink-soft">Montant net social</dt><dd className="text-right tabular-nums text-ink">{euros(row.netSocial)}</dd>
          <dt className="text-ink-soft">Coût employeur</dt><dd className="text-right tabular-nums text-ink">{euros(row.employerCost)}</dd>
        </dl>
      </div>
    </aside>
  );
}

function FragmentRows({ title, lines }: { title: string; lines: ReviewLine[] }) {
  return (
    <>
      <tr><td colSpan={5} className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{title}</td></tr>
      {lines.map((line, index) => (
        <tr key={`${line.code}-${index}`} className="border-t border-surface-border/60">
          <td className="py-1.5 pr-2 text-ink">{line.label}</td>
          <td className="py-1.5 text-right tabular-nums text-ink-soft">{amount(line.base)}</td>
          <td className="py-1.5 text-right tabular-nums text-ink-soft">{line.code === "DEDUCTION_HS_PATRONALE" ? `${amount(line.employerRate)} €/h` : [percent(line.rate), percent(line.employerRate)].filter(Boolean).join(" · ")}</td>
          <td className="py-1.5 text-right tabular-nums text-ink">{line.amount ? amount(-line.amount) : ""}</td>
          <td className="py-1.5 text-right tabular-nums text-ink">{amount(line.employerAmount)}</td>
        </tr>
      ))}
    </>
  );
}

export default function PayslipReview({ rows, periodLabel }: { rows: PayslipReviewRow[]; periodLabel: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback((delta: number) => setOpenIndex((current) => (current === null ? current : Math.min(rows.length - 1, Math.max(0, current + delta)))), [rows.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); step(1); }
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, step]);

  const totals = rows.reduce((sum, row) => ({ gross: sum.gross + row.grossTotal, net: sum.net + row.netPaid, cost: sum.cost + row.employerCost }), { gross: 0, net: 0, cost: 0 });

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs font-semibold text-ink-faint"><th className="border-b border-surface-border px-5 py-2.5">Salarié</th><th className="border-b border-surface-border px-3 py-2.5 text-right">Brut</th><th className="border-b border-surface-border px-3 py-2.5 text-right">Net à payer</th><th className="border-b border-surface-border px-3 py-2.5 text-right">Coût employeur</th><th className="border-b border-surface-border px-5 py-2.5 text-right">Remarques</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.employeeId} onClick={() => setOpenIndex(index)} className={`cursor-pointer transition hover:bg-surface-subtle/50 ${openIndex === index ? "bg-brand-primary/5" : ""}`}>
                <td className="border-b border-surface-border px-5 py-2.5"><button type="button" className="text-left" onClick={(event) => { event.stopPropagation(); setOpenIndex(index); }}><span className="block font-medium text-ink">{row.name}</span><span className="block text-xs text-ink-faint">{row.position || "Emploi non renseigné"}</span></button></td>
                <td className="border-b border-surface-border px-3 py-2.5 text-right tabular-nums text-ink">{euros(row.grossTotal)}</td>
                <td className="border-b border-surface-border px-3 py-2.5 text-right font-semibold tabular-nums text-ink">{euros(row.netPaid)}</td>
                <td className="border-b border-surface-border px-3 py-2.5 text-right tabular-nums text-ink-soft">{euros(row.employerCost)}</td>
                <td className="border-b border-surface-border px-5 py-2.5 text-right text-xs text-ink-faint">{row.warnings.length > 0 ? `${row.warnings.length} à vérifier` : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="text-sm font-semibold text-ink"><td className="bg-surface-subtle/60 px-5 py-2.5">Total</td><td className="bg-surface-subtle/60 px-3 py-2.5 text-right tabular-nums">{euros(totals.gross)}</td><td className="bg-surface-subtle/60 px-3 py-2.5 text-right tabular-nums">{euros(totals.net)}</td><td className="bg-surface-subtle/60 px-3 py-2.5 text-right tabular-nums">{euros(totals.cost)}</td><td className="bg-surface-subtle/60" /></tr></tfoot>
        </table>
      </div>
      {openIndex !== null && rows[openIndex] ? (
        <>
          <div className="fixed inset-0 z-30 bg-ink/20" onClick={close} aria-hidden />
          <Preview row={rows[openIndex]} periodLabel={periodLabel} onClose={close} onPrevious={() => step(-1)} onNext={() => step(1)} position={openIndex + 1} total={rows.length} />
        </>
      ) : null}
    </div>
  );
}
