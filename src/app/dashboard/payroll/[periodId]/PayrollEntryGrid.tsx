"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ClipboardPaste, Download, FileUp, History, Plus, X } from "lucide-react";
import {
  cellDisabledReason,
  cellKey,
  formatCellValue,
  optionalColumns,
  parseCellInput,
  parseDelimitedTable,
  parsePastedBlock,
  planImport,
  spreadPaste,
  tabCodes,
  visibleColumns,
  type EntryColumn,
  type EntryTab,
  type ImportPlan,
} from "@/lib/payroll/entry-grid";
import { copyPreviousMonthEntries, saveEntryCells, setEntryReviewed } from "../entryActions";

export type GridEmployee = { id: string; name: string; hint: string; partTime: boolean; reviewed: boolean };

type CellState = "saving" | "saved" | "error";

const STORAGE_KEY = (tab: EntryTab) => `rhpilot.payroll.entry-columns.${tab}`;

function readChosenColumns(tab: EntryTab): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(tab));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeChosenColumns(tab: EntryTab, codes: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY(tab), JSON.stringify(codes));
  } catch {
    // Préférence d'affichage seulement : sans stockage, la colonne reste visible jusqu'au rechargement.
  }
}

export default function PayrollEntryGrid({
  periodId,
  tab,
  employees,
  values,
  editable,
  focusCell,
}: {
  periodId: string;
  tab: EntryTab;
  employees: GridEmployee[];
  values: Record<string, number>;
  editable: boolean;
  focusCell?: string | null;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  useEffect(() => { setChosen(readChosenColumns(tab)); }, [tab]);

  const usedCodes = useMemo(() => Object.keys(values).map((key) => key.split(":")[1]), [values]);
  const columns = useMemo(() => visibleColumns(tab, {
    usedCodes,
    chosenCodes: chosen,
    hasPartTime: employees.some((employee) => employee.partTime),
    hasFullTime: employees.some((employee) => !employee.partTime),
  }), [tab, usedCodes, chosen, employees]);
  const addable = useMemo(() => optionalColumns(tab, columns), [tab, columns]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, CellState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>(() => Object.fromEntries(employees.map((employee) => [employee.id, employee.reviewed])));
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const inputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => { setReviewed(Object.fromEntries(employees.map((employee) => [employee.id, employee.reviewed]))); }, [employees]);

  useEffect(() => {
    if (!focusCell) return;
    const element = inputs.current.get(focusCell);
    if (element) { element.focus(); element.scrollIntoView({ block: "center", inline: "nearest" }); }
  }, [focusCell, columns]);

  const displayed = (employeeId: string, code: string) => {
    const key = cellKey(employeeId, code);
    return drafts[key] ?? formatCellValue(values[key]);
  };

  const persist = (cells: Array<{ employeeId: string; code: string; raw: string }>) => {
    if (cells.length === 0) return;
    const keys = cells.map((cell) => cellKey(cell.employeeId, cell.code));
    setStates((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, "saving" as const])) }));
    startTransition(async () => {
      const result = await saveEntryCells(periodId, cells);
      const cellErrors = "cellErrors" in result ? result.cellErrors ?? {} : {};
      setStates((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, cellErrors[key] || ("error" in result && !result.cellErrors) ? "error" as const : "saved" as const])) }));
      setErrors((current) => {
        const next = { ...current };
        for (const key of keys) {
          if (cellErrors[key]) next[key] = cellErrors[key];
          else delete next[key];
        }
        return next;
      });
      if ("error" in result) setBanner({ tone: "error", text: result.error });
      else setBanner(null);
      // Les brouillons restent affichés jusqu'à ce que les valeurs enregistrées reviennent du serveur.
    });
  };

  useEffect(() => {
    setDrafts((current) => {
      let changed = false;
      const next = { ...current };
      for (const [key, draft] of Object.entries(current)) {
        const code = key.split(":")[1];
        const unit = columns.find((entry) => entry.code === code)?.unit ?? "EUR";
        const parsed = parseCellInput(draft, unit);
        if (!("error" in parsed) && (parsed.value ?? null) === (values[key] ?? null) && states[key] !== "saving") {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [values, columns, states]);

  const commit = (employeeId: string, code: string) => {
    const key = cellKey(employeeId, code);
    const draft = drafts[key];
    if (draft === undefined) return;
    const unit = columns.find((entry) => entry.code === code)?.unit ?? "EUR";
    const parsed = parseCellInput(draft, unit);
    if ("error" in parsed) {
      setErrors((current) => ({ ...current, [key]: parsed.error }));
      setStates((current) => ({ ...current, [key]: "error" }));
      return;
    }
    if ((parsed.value ?? null) === (values[key] ?? null)) {
      setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
      setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
      return;
    }
    persist([{ employeeId, code, raw: draft }]);
  };

  const move = (row: number, col: number) => {
    const employee = employees[row];
    const target = columns[col];
    if (!employee || !target) return;
    inputs.current.get(cellKey(employee.id, target.code))?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const input = event.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length;
    if (event.key === "Enter") { event.preventDefault(); input.blur(); move(event.shiftKey ? row - 1 : row + 1, col); }
    else if (event.key === "ArrowDown") { event.preventDefault(); move(row + 1, col); }
    else if (event.key === "ArrowUp") { event.preventDefault(); move(row - 1, col); }
    else if (event.key === "ArrowLeft" && atStart) { event.preventDefault(); move(row, col - 1); }
    else if (event.key === "ArrowRight" && atEnd) { event.preventDefault(); move(row, col + 1); }
    else if (event.key === "Escape") {
      const key = cellKey(employees[row].id, columns[col].code);
      setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
      setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = event.clipboardData.getData("text/plain");
    if (!/[\t\n]/.test(text.trim())) return;
    event.preventDefault();
    const cells = spreadPaste(parsePastedBlock(text), { row, col }, employees.map((employee) => employee.id), columns)
      .filter((cell) => {
        const employee = employees.find((candidate) => candidate.id === cell.employeeId);
        const target = columns.find((entry) => entry.code === cell.code);
        return employee && target && !cellDisabledReason(target, employee.partTime);
      });
    setDrafts((current) => ({ ...current, ...Object.fromEntries(cells.map((cell) => [cellKey(cell.employeeId, cell.code), cell.raw.trim()])) }));
    persist(cells);
    setBanner({ tone: "info", text: `${cells.length} cellule${cells.length > 1 ? "s" : ""} collée${cells.length > 1 ? "s" : ""} depuis le presse-papiers.` });
  };

  const toggleReviewed = (employeeId: string) => {
    const next = !reviewed[employeeId];
    setReviewed((current) => ({ ...current, [employeeId]: next }));
    startTransition(async () => {
      const result = await setEntryReviewed(periodId, employeeId, next);
      if ("error" in result) {
        setReviewed((current) => ({ ...current, [employeeId]: !next }));
        setBanner({ tone: "error", text: result.error });
      }
    });
  };

  const copyPrevious = () => {
    startTransition(async () => {
      const result = await copyPreviousMonthEntries(periodId);
      if ("error" in result) setBanner({ tone: "error", text: result.error });
      else setBanner({ tone: "info", text: result.count ? `${result.count} élément${result.count > 1 ? "s" : ""} repris du mois précédent, dans les cases qui étaient vides.` : "Rien à reprendre : le mois précédent n'a pas d'élément récurrent pour les cases vides." });
    });
  };

  const addColumn = (code: string) => {
    const next = [...new Set([...chosen, code])];
    setChosen(next);
    writeChosenColumns(tab, next);
    setMenuOpen(false);
  };

  const runImport = (plan: ImportPlan) => {
    const shown = new Set(columns.map((entry) => entry.code));
    const own = new Set(tabCodes(tab));
    setDrafts((current) => ({ ...current, ...Object.fromEntries(plan.cells.filter((cell) => shown.has(cell.code)).map((cell) => [cellKey(cell.employeeId, cell.code), cell.raw])) }));
    persist(plan.cells);
    setImportOpen(false);
    const elsewhere = plan.cells.filter((cell) => !own.has(cell.code)).length;
    setBanner({ tone: "info", text: `${plan.cells.length} valeur${plan.cells.length > 1 ? "s" : ""} importée${plan.cells.length > 1 ? "s" : ""} pour ${plan.employeeCount} salarié${plan.employeeCount > 1 ? "s" : ""}${elsewhere > 0 ? `, dont ${elsewhere} dans l'autre onglet de saisie` : ""}.` });
  };

  const totals = columns.map((entry) => employees.reduce((total, employee) => total + (values[cellKey(employee.id, entry.code)] ?? 0), 0));
  const reviewedCount = employees.filter((employee) => reviewed[employee.id]).length;

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-surface-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-ink-faint">
          {editable ? "Tapez directement dans les cases : chaque valeur s'enregistre en quittant la case. Entrée ou flèches pour changer de case, Échap pour annuler. Vous pouvez coller un bloc copié depuis Excel." : "La saisie est fermée pour ce mois."}
        </p>
        {editable ? (
          <div className="flex shrink-0 items-center gap-2">
            {tab === "variables" ? (
              <button type="button" onClick={copyPrevious} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50">
                <History size={14} /> Reprendre le mois dernier
              </button>
            ) : null}
            <button type="button" onClick={() => { setImportOpen((open) => !open); setMenuOpen(false); }} aria-expanded={importOpen} className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">
              <FileUp size={14} /> Importer
            </button>
            <div className="relative">
              <button type="button" onClick={() => { setMenuOpen((open) => !open); setImportOpen(false); }} disabled={addable.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-40">
                <Plus size={14} /> Ajouter une colonne
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-surface-border bg-white py-1 shadow-lg">
                  {addable.map((entry) => (
                    <button key={entry.code} type="button" onClick={() => addColumn(entry.code)} className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-subtle">{entry.header}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {importOpen && editable ? <ImportPanel tab={tab} employees={employees} columns={columns} values={values} onCancel={() => setImportOpen(false)} onImport={runImport} /> : null}

      {banner ? <div className={`border-b px-5 py-2.5 text-sm ${banner.tone === "error" ? "border-accent-rose/20 bg-accent-rose/5 text-accent-rose" : "border-surface-border bg-surface-subtle/50 text-ink-soft"}`}>{banner.tone === "info" ? <ClipboardPaste size={14} className="mr-1.5 inline" /> : null}{banner.text}</div> : null}

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-ink-faint">
              <th className="sticky left-0 z-10 min-w-[200px] border-b border-surface-border bg-white px-4 py-2.5">Salarié</th>
              {columns.map((entry) => <th key={entry.code} title={entry.label} className="w-36 min-w-[9rem] border-b border-surface-border px-3.5 py-2.5 text-right leading-4">{entry.header}</th>)}
              <th className="w-20 border-b border-surface-border px-4 py-2.5 text-center">Vérifié</th>
              <th aria-hidden className="w-full border-b border-surface-border" />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, row) => (
              <tr key={employee.id} className="group">
                <td className="sticky left-0 z-10 border-b border-surface-border bg-white px-4 py-1.5 group-hover:bg-surface-subtle/40">
                  <p className="whitespace-nowrap font-medium text-ink">{employee.name}</p>
                  <p className="whitespace-nowrap text-[11px] text-ink-faint">{employee.hint}</p>
                </td>
                {columns.map((entry, col) => {
                  const key = cellKey(employee.id, entry.code);
                  const disabledReason = cellDisabledReason(entry, employee.partTime);
                  const state = states[key];
                  const error = errors[key];
                  return (
                    <td key={entry.code} className="border-b border-surface-border px-1.5 py-1 group-hover:bg-surface-subtle/40">
                      <input
                        ref={(element) => { if (element) inputs.current.set(key, element); else inputs.current.delete(key); }}
                        value={disabledReason ? "" : displayed(employee.id, entry.code)}
                        onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                        onBlur={() => commit(employee.id, entry.code)}
                        onKeyDown={(event) => onKeyDown(event, row, col)}
                        onPaste={(event) => onPaste(event, row, col)}
                        onFocus={(event) => event.currentTarget.select()}
                        disabled={!editable || Boolean(disabledReason)}
                        title={disabledReason ?? error ?? entry.label}
                        inputMode="decimal"
                        aria-label={`${entry.label}, ${employee.name}`}
                        aria-invalid={Boolean(error)}
                        className={`h-9 w-full rounded-md border bg-white px-2 text-right text-sm tabular-nums text-ink outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-subtle/60 ${error ? "border-accent-rose" : state === "saving" ? "border-accent-amber/60" : state === "saved" ? "border-accent-teal/50" : "border-surface-border"}`}
                      />
                    </td>
                  );
                })}
                <td className="border-b border-surface-border px-4 py-1 text-center group-hover:bg-surface-subtle/40">
                  <button type="button" title={reviewed[employee.id] ? "Saisie vérifiée" : "Marquer la saisie comme vérifiée"} onClick={() => toggleReviewed(employee.id)} disabled={!editable} aria-pressed={reviewed[employee.id]} aria-label={`Saisie vérifiée pour ${employee.name}`} className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-60 ${reviewed[employee.id] ? "border-accent-teal bg-accent-teal text-white" : "border-surface-border bg-white text-transparent hover:border-ink-faint"}`}>
                    <Check size={15} />
                  </button>
                </td>
                <td aria-hidden className="border-b border-surface-border group-hover:bg-surface-subtle/40" />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-xs font-semibold text-ink-soft">
              <td className="sticky left-0 z-10 bg-surface-subtle/60 px-4 py-2.5">Total · {reviewedCount}/{employees.length} vérifiés</td>
              {totals.map((total, index) => <td key={columns[index].code} className="bg-surface-subtle/60 px-3.5 py-2.5 text-right tabular-nums">{total ? formatCellValue(Math.round(total * 100) / 100) : ""}</td>)}
              <td className="bg-surface-subtle/60" />
              <td className="bg-surface-subtle/60" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function downloadTemplate(tab: EntryTab, employees: GridEmployee[], columns: EntryColumn[], values: Record<string, number>) {
  const escape = (text: string) => (/[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  const lines = [
    ["Salarié", ...columns.map((entry) => entry.header)],
    ...employees.map((employee) => [employee.name, ...columns.map((entry) => formatCellValue(values[cellKey(employee.id, entry.code)]))]),
  ].map((line) => line.map(escape).join(";"));
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `saisie-paie-${tab}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ImportPanel({ tab, employees, columns, values, onCancel, onImport }: {
  tab: EntryTab;
  employees: GridEmployee[];
  columns: EntryColumn[];
  values: Record<string, number>;
  onCancel: () => void;
  onImport: (plan: ImportPlan) => void;
}) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const plan = useMemo(() => (text.trim() ? planImport(parseDelimitedTable(text), employees) : null), [text, employees]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) { setFileName(null); setText(""); return; }
    const buffer = await file.arrayBuffer();
    let content = new TextDecoder("utf-8").decode(buffer);
    // Excel enregistre souvent ses CSV en Windows-1252 : on relit le fichier si l'UTF-8 échoue.
    if (content.includes("\uFFFD")) content = new TextDecoder("windows-1252").decode(buffer);
    setFileName(file.name);
    setText(content);
  };

  return (
    <div className="border-b border-surface-border bg-surface-subtle/40 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Importer depuis Excel ou un fichier CSV</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-faint">
            Première ligne : les en-têtes, avec une colonne Salarié (ou Prénom et Nom) puis les éléments, par exemple « Heures sup. 25 % » ou « Prime (€) ». Les salariés sont reconnus par leur nom, les cases vides ne changent rien.
          </p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Fermer l'import" className="rounded-md p-1 text-ink-faint hover:bg-white hover:text-ink"><X size={16} /></button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">
          <FileUp size={14} /> Choisir un fichier CSV
          <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
        <button type="button" onClick={() => downloadTemplate(tab, employees, columns, values)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-brand-primary hover:underline">
          <Download size={14} /> Télécharger le modèle de ce tableau
        </button>
        {fileName ? <span className="text-xs text-ink-soft">{fileName}</span> : null}
      </div>

      <textarea
        value={text}
        onChange={(event) => { setText(event.target.value); setFileName(null); }}
        rows={5}
        spellCheck={false}
        placeholder={"Ou collez ici le tableau copié depuis Excel, en-têtes compris.\nSalarié\tHeures sup. 25 %\tPrime (€)\nLéa Martin\t4\t150"}
        className="mt-3 w-full rounded-lg border border-surface-border bg-white px-3 py-2 font-mono text-xs leading-5 text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
      />

      {plan ? (
        <div className="mt-3 space-y-1.5 text-xs leading-5">
          {plan.error ? <p className="text-accent-rose">{plan.error}</p> : (
            <p className="text-ink">
              <span className="font-semibold">{plan.cells.length} valeur{plan.cells.length > 1 ? "s" : ""}</span> pour {plan.employeeCount} salarié{plan.employeeCount > 1 ? "s" : ""}
              {plan.columns.length > 0 ? <> dans {plan.columns.map((entry) => entry.header).join(", ")}</> : null}.
            </p>
          )}
          {plan.unknownRows.length > 0 ? <p className="text-accent-amber">Non reconnus (nom introuvable ou porté par deux salariés) : {plan.unknownRows.slice(0, 6).join(", ")}{plan.unknownRows.length > 6 ? ` et ${plan.unknownRows.length - 6} autres` : ""}.</p> : null}
          {plan.unknownHeaders.length > 0 ? <p className="text-ink-faint">Colonnes ignorées : {plan.unknownHeaders.join(", ")}.</p> : null}
          {plan.skipped > 0 ? <p className="text-ink-faint">{plan.skipped} valeur{plan.skipped > 1 ? "s" : ""} ignorée{plan.skipped > 1 ? "s" : ""} : heures supplémentaires d&apos;un temps partiel ou complémentaires d&apos;un temps plein.</p> : null}
        </div>
      ) : null}

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-white">Annuler</button>
        <button type="button" disabled={!plan || Boolean(plan.error) || plan.cells.length === 0} onClick={() => plan && onImport(plan)} className="rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {plan && !plan.error && plan.cells.length > 0 ? `Importer ${plan.cells.length} valeur${plan.cells.length > 1 ? "s" : ""}` : "Importer"}
        </button>
      </div>
    </div>
  );
}
