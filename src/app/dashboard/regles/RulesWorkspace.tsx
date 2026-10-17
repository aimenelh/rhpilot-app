"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAskDialog } from "@/components/ui/AskDialog";
import type { EngineAbsence, EngineEmployee } from "@/lib/hr-rules/engine";
import { hasBlockingFinding, reviewLeaveRule, type LegalContext, type LegalFinding } from "@/lib/hr-rules/legal";
import { simulateRule, type SimulationResult } from "@/lib/hr-rules/simulate";
import {
  ABSENCE_TYPE_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  CONTRACT_LABELS,
  CONTRACT_TYPES,
  GOVERNED_ABSENCE_TYPES,
  GROUP_LABELS,
  MAX_CONSTRAINTS,
  PRIORITY_CRITERIA,
  describeRule,
  describeViolation,
  emptyLeaveRuleSpec,
  parseLeaveRuleSpec,
  type ConstraintKind,
  type GroupKind,
  type LeaveRuleSpec,
  type MonthDay,
  type PriorityCriterion,
  type RuleConstraint,
} from "@/lib/hr-rules/spec";
import { activateRule, archiveRule, translateRule, type RuleActionResult } from "./actions";

type SerializedEmployee = Omit<EngineEmployee, "hireDate"> & { hireDate: string };
type SerializedAbsence = Omit<EngineAbsence, "startDate" | "endDate" | "createdAt"> & { startDate: string; endDate: string; createdAt: string };
type RuleMode = "PROPOSE" | "AUTO_APPROVE";

export type RuleListItem = {
  id: string;
  lineageId: string;
  version: number;
  title: string;
  sourceText: string | null;
  spec: LeaveRuleSpec;
  mode: RuleMode;
  status: "ACTIVE" | "ARCHIVED";
  effectiveFrom: string;
  createdAt: string;
  archivedAt: string | null;
  stats: { automatic: number; followed: number; overridden: number };
};

type Draft = {
  lineageId: string | null;
  baseVersion: number | null;
  title: string;
  sourceText: string;
  spec: LeaveRuleSpec;
  hypotheses: string[];
  unsupported: string[];
  mode: RuleMode;
  effectiveFrom: string;
};

const SERIF = "[font-family:var(--font-newsreader),Georgia,serif]";

const EXAMPLES = [
  "L'été, pas plus de deux personnes de la même équipe en congé en même temps. Priorité aux parents, puis à l'ancienneté.",
  "Les congés se demandent au moins trois semaines avant le départ.",
  "Pas de congés du 15 au 31 décembre, c'est l'inventaire.",
  "Pas plus de trois semaines de congés d'affilée, sauf l'été.",
];

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const CONSTRAINT_TEMPLATES: Record<ConstraintKind, { label: string; create: () => RuleConstraint }> = {
  MAX_CONCURRENT: { label: "Nombre d'absents en même temps", create: () => ({ kind: "MAX_CONCURRENT", max: 2, group: "TEAM" }) },
  MIN_NOTICE_DAYS: { label: "Délai pour demander", create: () => ({ kind: "MIN_NOTICE_DAYS", days: 15 }) },
  MAX_CONSECUTIVE_DAYS: { label: "Durée maximale d'affilée", create: () => ({ kind: "MAX_CONSECUTIVE_DAYS", days: 21 }) },
  BLACKOUT: { label: "Période fermée", create: () => ({ kind: "BLACKOUT", from: "12-15", to: "12-31" }) },
  MIN_SENIORITY_DAYS: { label: "Ancienneté minimale", create: () => ({ kind: "MIN_SENIORITY_DAYS", days: 90 }) },
};

const PRIORITY_NAMES: Record<PriorityCriterion, string> = {
  FAMILY_SITUATION: "Enfants à charge",
  SENIORITY: "Ancienneté",
  REQUEST_DATE: "Première demande arrivée",
};

function formatDay(iso: string) {
  const text = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return text.replace(/^1 /, "1er ");
}

function clampInt(value: string, min: number, max: number, fallback: number) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export default function RulesWorkspace({ rules, employees, absences, legalContext, translationEnabled, today }: {
  rules: RuleListItem[];
  employees: SerializedEmployee[];
  absences: SerializedAbsence[];
  legalContext: LegalContext;
  translationEnabled: boolean;
  today: string;
}) {
  const router = useRouter();
  const { ask, dialog } = useAskDialog();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const history = useMemo(() => ({
    employees: employees.map((employee) => ({ ...employee, hireDate: new Date(employee.hireDate) })),
    absences: absences.map((absence) => ({ ...absence, startDate: new Date(absence.startDate), endDate: new Date(absence.endDate), createdAt: new Date(absence.createdAt) })),
  }), [employees, absences]);

  const active = rules.filter((rule) => rule.status === "ACTIVE");
  const archived = rules.filter((rule) => rule.status === "ARCHIVED");

  function startDraft(next: Omit<Draft, "mode" | "effectiveFrom"> & Partial<Pick<Draft, "mode" | "effectiveFrom">>) {
    setDraft({ mode: "PROPOSE", effectiveFrom: today, ...next });
    setNotice(null);
  }

  function translate() {
    const source = text.trim();
    if (!source) return;
    startTransition(async () => {
      const result = await translateRule(source).catch(() => ({ ok: false as const, error: "La traduction n'a pas abouti. Réessayez." }));
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      startDraft({ lineageId: draft?.lineageId ?? null, baseVersion: draft?.baseVersion ?? null, title: result.title, sourceText: source, spec: result.spec, hypotheses: result.hypotheses, unsupported: result.unsupported });
    });
  }

  function buildByHand() {
    startDraft({ lineageId: null, baseVersion: null, title: "", sourceText: text.trim(), spec: emptyLeaveRuleSpec(), hypotheses: [], unsupported: [] });
  }

  function edit(rule: RuleListItem) {
    setText(rule.sourceText ?? "");
    startDraft({ lineageId: rule.lineageId, baseVersion: rule.version, title: rule.title, sourceText: rule.sourceText ?? "", spec: rule.spec, hypotheses: [], unsupported: [], mode: rule.mode });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function run(action: () => Promise<RuleActionResult>, after?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) setNotice({ tone: "error", text: result.error });
        else {
          setNotice({ tone: "success", text: result?.success ?? "Enregistré." });
          after?.();
          router.refresh();
        }
      } catch {
        setNotice({ tone: "error", text: "L'action n'a pas pu être réalisée. Réessayez." });
      }
    });
  }

  function activate(current: Draft) {
    run(() => activateRule({ lineageId: current.lineageId, title: current.title, sourceText: current.sourceText, spec: current.spec, mode: current.mode, effectiveFrom: current.effectiveFrom }), () => {
      setDraft(null);
      setText("");
    });
  }

  function archive(rule: RuleListItem) {
    void ask({
      title: `Désactiver « ${rule.title} » ?`,
      description: "Les demandes à venir ne suivront plus cette règle. Les décisions déjà prises restent rattachées à elle.",
      confirmLabel: "Désactiver",
      danger: true,
    }).then((answer) => {
      if (answer !== null) run(() => archiveRule(rule.id));
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {dialog}
      {notice && (
        <div role={notice.tone === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${notice.tone === "success" ? "border-accent-teal/30 bg-accent-teal/10 text-accent-teal" : "border-accent-rose/30 bg-accent-rose/5 text-accent-rose"}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer le message" className="shrink-0 rounded p-0.5 hover:bg-black/5"><X size={15} /></button>
        </div>
      )}

      <section className="rounded-xl border border-surface-border bg-white shadow-card">
        <div className="px-5 pb-5 pt-5 sm:px-6">
          <label htmlFor="rule-text" className="text-sm font-semibold text-ink">{draft?.lineageId ? `Modifier « ${draft.title} »` : "Écrire une règle"}</label>
          <p className="mt-1 text-sm text-ink-soft">Une règle par texte, en une ou deux phrases. RH Pilot la traduit, vous relisez avant qu’elle s’applique.</p>
          <textarea
            id="rule-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={1200}
            placeholder="L'été, pas plus de deux personnes de la même équipe en congé en même temps…"
            className={`${SERIF} mt-4 block w-full resize-y rounded-lg border border-surface-border bg-surface-subtle/40 px-4 py-3 text-[19px] leading-7 text-ink outline-none placeholder:text-ink-faint/70 focus:border-ink/40 focus:bg-white focus:ring-4 focus:ring-ink/5`}
          />
          {!text && !draft && (
            <div className="mt-3">
              <p className="text-xs text-ink-faint">Pour commencer, reprenez un exemple :</p>
              <ul className="mt-1.5 space-y-1">
                {EXAMPLES.map((example) => (
                  <li key={example}>
                    <button type="button" onClick={() => setText(example)} className="text-left text-sm text-ink-soft underline decoration-surface-border underline-offset-4 hover:text-ink hover:decoration-ink/40">{example}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {translationEnabled && (
              <Button type="button" onClick={translate} disabled={isPending || text.trim().length < 10}>
                {isPending && <Loader2 size={15} className="animate-spin" />}Traduire en règle
              </Button>
            )}
            {!draft && <Button type="button" variant={translationEnabled ? "ghost" : "primary"} onClick={buildByHand} disabled={isPending}>Construire la règle moi-même</Button>}
            {draft && <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={isPending}>Abandonner</Button>}
          </div>
        </div>

        {draft && (
          <DraftPanel
            draft={draft}
            onChange={setDraft}
            onActivate={activate}
            isPending={isPending}
            legalContext={legalContext}
            history={history}
            today={today}
          />
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">Règles en vigueur</h2>
          {archived.length > 0 && (
            <button type="button" onClick={() => setShowHistory((value) => !value)} className="text-sm text-ink-soft underline decoration-surface-border underline-offset-4 hover:text-ink">
              {showHistory ? "Masquer l’historique" : `Historique (${archived.length})`}
            </button>
          )}
        </div>
        {active.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-surface-border bg-white px-5 py-6 text-sm leading-6 text-ink-soft">
            Aucune règle pour l’instant. Les demandes de congés arrivent comme aujourd’hui, et vous décidez au cas par cas. Commencez par la règle que vous répétez le plus souvent à l’oral.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-surface-border overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
            {active.map((rule) => <RuleEntry key={rule.id} rule={rule} onEdit={() => edit(rule)} onArchive={() => archive(rule)} disabled={isPending} />)}
          </div>
        )}
        {showHistory && archived.length > 0 && (
          <div className="mt-4 divide-y divide-surface-border overflow-hidden rounded-xl border border-surface-border bg-surface-subtle/50">
            {archived.map((rule) => <RuleEntry key={rule.id} rule={rule} />)}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Une règle de la liste ---------- */

function statsLine(stats: RuleListItem["stats"]) {
  const parts: string[] = [];
  if (stats.automatic) parts.push(`${stats.automatic} demande${stats.automatic > 1 ? "s" : ""} accordée${stats.automatic > 1 ? "s" : ""} automatiquement`);
  if (stats.followed) parts.push(`${stats.followed} décision${stats.followed > 1 ? "s" : ""} conforme${stats.followed > 1 ? "s" : ""} à la règle`);
  if (stats.overridden) parts.push(`${stats.overridden} décision${stats.overridden > 1 ? "s" : ""} contraire${stats.overridden > 1 ? "s" : ""}`);
  return parts.length ? `${parts.join(", ")}.` : "Aucune demande traitée avec cette règle pour l’instant.";
}

function RuleEntry({ rule, onEdit, onArchive, disabled = false }: { rule: RuleListItem; onEdit?: () => void; onArchive?: () => void; disabled?: boolean }) {
  const startsLater = rule.status === "ACTIVE" && rule.effectiveFrom > new Date().toISOString().slice(0, 10);
  const meta = rule.status === "ACTIVE"
    ? `Version ${rule.version}, ${startsLater ? `en vigueur à partir du ${formatDay(rule.effectiveFrom)}` : `en vigueur depuis le ${formatDay(rule.effectiveFrom)}`}. ${rule.mode === "AUTO_APPROVE" ? "Les demandes conformes sont validées sans vous." : "Chaque décision vous est proposée."}`
    : `Version ${rule.version}, remplacée ou désactivée le ${formatDay(rule.archivedAt ?? rule.createdAt)}.`;
  return (
    <article className="px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className={`${SERIF} text-[22px] leading-7 text-ink`}>{rule.title}</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">{meta}</p>
        </div>
        {onEdit && onArchive && (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="secondary" className="min-h-9 px-3 py-1.5 text-xs" onClick={onEdit} disabled={disabled}>Modifier</Button>
            <Button type="button" variant="ghost" className="min-h-9 px-3 py-1.5 text-xs text-accent-rose" onClick={onArchive} disabled={disabled}>Désactiver</Button>
          </div>
        )}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm leading-6 text-ink-soft">
        {describeRule(rule.spec).map((line) => <li key={line}>{line}</li>)}
      </ul>
      {rule.status === "ACTIVE" && <p className="mt-3 text-xs text-ink-faint">{statsLine(rule.stats)}</p>}
    </article>
  );
}

/* ---------- Brouillon : éditeur et vérifications ---------- */

function DraftPanel({ draft, onChange, onActivate, isPending, legalContext, history, today }: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onActivate: (draft: Draft) => void;
  isPending: boolean;
  legalContext: LegalContext;
  history: { employees: EngineEmployee[]; absences: EngineAbsence[] };
  today: string;
}) {
  const parsed = useMemo(() => parseLeaveRuleSpec(draft.spec), [draft.spec]);
  const findings = useMemo(() => (parsed.ok ? reviewLeaveRule(parsed.spec, legalContext) : []), [parsed, legalContext]);
  // Le test sur le passé ne dépend que de la règle elle-même, pas de son titre.
  const simulation = useMemo(() => (parsed.ok ? simulateRule({ id: "brouillon", title: "Règle", version: 1, spec: parsed.spec }, { ...history, now: new Date() }) : null), [parsed, history]);
  const blocking = hasBlockingFinding(findings);
  const setSpec = (spec: LeaveRuleSpec) => onChange({ ...draft, spec });
  const errors = parsed.ok ? [] : parsed.errors;
  const canActivate = parsed.ok && !blocking && draft.title.trim().length > 0 && !isPending;

  return (
    <div className="border-t border-surface-border">
      {(draft.hypotheses.length > 0 || draft.unsupported.length > 0) && (
        <div className="space-y-2 border-b border-surface-border bg-surface-subtle/50 px-5 py-4 text-sm sm:px-6">
          {draft.hypotheses.length > 0 && (
            <div>
              <p className="font-medium text-ink">Ce que RH Pilot a dû interpréter</p>
              <ul className="mt-1 space-y-0.5 text-ink-soft">{draft.hypotheses.map((line) => <li key={line}>{line}</li>)}</ul>
            </div>
          )}
          {draft.unsupported.length > 0 && (
            <div>
              <p className="font-medium text-accent-amber">Ce qui ne sera pas appliqué</p>
              <ul className="mt-1 space-y-0.5 text-ink-soft">{draft.unsupported.map((line) => <li key={line}>{line}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6 px-5 py-5 sm:px-6 lg:border-r lg:border-surface-border">
          <div>
            <h3 className="text-sm font-semibold text-ink">Ce que RH Pilot appliquera</h3>
            <p className="mt-1 text-xs leading-5 text-ink-faint">Corrigez ici tout ce qui ne correspond pas à votre intention : c’est cette version qui fait foi.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink">Titre</span>
            <input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value.slice(0, 80) })} placeholder="Congés d'été" className="h-11 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary" />
          </label>
          <ScopeEditor spec={draft.spec} onChange={setSpec} />
          <ConstraintsEditor spec={draft.spec} onChange={setSpec} />
          <PriorityEditor spec={draft.spec} onChange={setSpec} />
          <fieldset className="min-w-0">
            <legend className="text-xs font-medium text-ink">Quand une demande ne respecte pas la règle</legend>
            <div className="mt-2 space-y-2">
              <Choice name="onViolation" checked={draft.spec.onViolation === "REFUSE"} onChange={() => setSpec({ ...draft.spec, onViolation: "REFUSE" })} title="Me proposer un refus" detail="Avec le motif et les premières dates possibles. Vous confirmez toujours." />
              <Choice name="onViolation" checked={draft.spec.onViolation === "REVIEW"} onChange={() => setSpec({ ...draft.spec, onViolation: "REVIEW" })} title="Me laisser arbitrer" detail="La demande vous arrive avec ce qui coince, sans proposition." />
            </div>
          </fieldset>
        </div>

        <div className="space-y-6 bg-surface-subtle/30 px-5 py-5 sm:px-6">
          <div>
            <h3 className="text-sm font-semibold text-ink">Telle que vos salariés la liront</h3>
            {parsed.ok ? (
              <div className="mt-3 rounded-lg border border-surface-border bg-white px-4 py-4">
                <p className={`${SERIF} text-[21px] leading-7 text-ink`}>{draft.title || "Sans titre"}</p>
                <ul className={`${SERIF} mt-2 space-y-1.5 text-[17px] leading-7 text-ink-soft`}>
                  {describeRule(parsed.spec).map((line) => <li key={line}>{line}</li>)}
                </ul>
                <p className="mt-3 border-t border-surface-border pt-3 text-xs leading-5 text-ink-faint">Pour vous seulement : {describeViolation(parsed.spec).charAt(0).toLowerCase() + describeViolation(parsed.spec).slice(1)}</p>
              </div>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-accent-rose">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            )}
          </div>
          <LegalReview findings={findings} ready={parsed.ok} />
          {simulation && <PastTest result={simulation} />}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-surface-border px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <fieldset className="min-w-0 flex-1">
          <legend className="text-xs font-medium text-ink">Une fois activée</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Choice name="mode" checked={draft.mode === "PROPOSE"} onChange={() => onChange({ ...draft, mode: "PROPOSE" })} title="Me proposer chaque décision" detail="Le verdict de la règle s’affiche dans le dossier, vous validez." />
            <Choice name="mode" checked={draft.mode === "AUTO_APPROVE"} onChange={() => onChange({ ...draft, mode: "AUTO_APPROVE" })} title="Valider seul les demandes conformes" detail="Un refus n’est jamais envoyé sans vous." />
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          {!draft.lineageId && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink">En vigueur à partir du</span>
              <input type="date" min={today} value={draft.effectiveFrom} onChange={(event) => onChange({ ...draft, effectiveFrom: event.target.value })} className="h-11 rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-primary" />
            </label>
          )}
          <Button type="button" disabled={!canActivate} onClick={() => onActivate(draft)}>
            {isPending && <Loader2 size={15} className="animate-spin" />}{draft.lineageId ? `Activer la version ${(draft.baseVersion ?? 0) + 1}` : "Activer la règle"}
          </Button>
        </div>
      </div>
      {blocking ? (
        <p className="-mt-2 px-5 pb-5 text-xs text-accent-rose sm:px-6">Activation impossible tant que le point bloquant du contrôle juridique n’est pas corrigé.</p>
      ) : parsed.ok && !draft.title.trim() ? (
        <p className="-mt-2 px-5 pb-5 text-xs text-ink-faint sm:px-6">Donnez un titre à la règle pour l’activer : c’est sous ce nom que vos salariés la verront.</p>
      ) : null}
    </div>
  );
}

function Choice({ name, checked, onChange, title, detail }: { name: string; checked: boolean; onChange: () => void; title: string; detail: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${checked ? "border-ink/40 bg-white" : "border-surface-border bg-white/60 hover:border-ink/20"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 h-4 w-4 accent-[#14151A]" />
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-ink-faint">{detail}</span>
      </span>
    </label>
  );
}

function MonthDayInput({ value, onChange, label }: { value: MonthDay; onChange: (value: MonthDay) => void; label: string }) {
  const month = Number(value.slice(0, 2)) || 1;
  const day = Number(value.slice(3, 5)) || 1;
  const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  const set = (nextDay: number, nextMonth: number) => {
    const limit = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][nextMonth - 1];
    onChange(`${String(nextMonth).padStart(2, "0")}-${String(Math.min(nextDay, limit)).padStart(2, "0")}`);
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <select aria-label={`${label} : jour`} value={day} onChange={(event) => set(Number(event.target.value), month)} className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink">
        {Array.from({ length: maxDay }, (_, index) => <option key={index + 1} value={index + 1}>{index === 0 ? "1er" : index + 1}</option>)}
      </select>
      <select aria-label={`${label} : mois`} value={month} onChange={(event) => set(day, Number(event.target.value))} className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink">
        {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
      </select>
    </span>
  );
}

function NumberInput({ value, onChange, min, max, label, width = "w-16" }: { value: number; onChange: (value: number) => void; min: number; max: number; label: string; width?: string }) {
  return <input type="number" inputMode="numeric" aria-label={label} min={min} max={max} value={value} onChange={(event) => onChange(clampInt(event.target.value, min, max, value))} className={`${width} h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink`} />;
}

function ScopeEditor({ spec, onChange }: { spec: LeaveRuleSpec; onChange: (spec: LeaveRuleSpec) => void }) {
  const [restricting, setRestricting] = useState(spec.employees.contractTypes.length > 0 || spec.employees.categories.length > 0);
  const toggle = <T extends string>(list: T[], value: T) => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);
  return (
    <div className="space-y-4">
      <fieldset className="min-w-0">
        <legend className="text-xs font-medium text-ink">Absences concernées</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {GOVERNED_ABSENCE_TYPES.map((type) => (
            <label key={type} className="inline-flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={spec.absenceTypes.includes(type)} onChange={() => onChange({ ...spec, absenceTypes: toggle(spec.absenceTypes, type) })} className="h-4 w-4 rounded border-surface-border accent-[#14151A]" />
              {ABSENCE_TYPE_LABELS[type].charAt(0).toUpperCase() + ABSENCE_TYPE_LABELS[type].slice(1)}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-ink-faint">Arrêts maladie, accidents du travail, maternité, paternité et événements familiaux ne sont jamais concernés : ce sont des droits.</p>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="text-xs font-medium text-ink">Quand</legend>
        <div className="mt-2 space-y-2 text-sm text-ink">
          <label className="flex items-center gap-2"><input type="radio" name="period" checked={spec.period.kind === "ALWAYS"} onChange={() => onChange({ ...spec, period: { kind: "ALWAYS" } })} className="h-4 w-4 accent-[#14151A]" />Toute l’année</label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2"><input type="radio" name="period" checked={spec.period.kind === "YEARLY"} onChange={() => onChange({ ...spec, period: { kind: "YEARLY", from: "06-01", to: "08-31" } })} className="h-4 w-4 accent-[#14151A]" />Chaque année, du</label>
            {spec.period.kind === "YEARLY" ? (
              <>
                <MonthDayInput label="Début de période" value={spec.period.from} onChange={(from) => spec.period.kind === "YEARLY" && onChange({ ...spec, period: { ...spec.period, from } })} />
                <span>au</span>
                <MonthDayInput label="Fin de période" value={spec.period.to} onChange={(to) => spec.period.kind === "YEARLY" && onChange({ ...spec, period: { ...spec.period, to } })} />
              </>
            ) : <span className="text-ink-faint">… au …</span>}
          </div>
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="text-xs font-medium text-ink">Salariés concernés</legend>
        {!restricting ? (
          <p className="mt-2 text-sm text-ink">Tous les salariés. <button type="button" onClick={() => setRestricting(true)} className="text-ink-soft underline decoration-surface-border underline-offset-4 hover:text-ink">Ne viser que certains</button></p>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {CONTRACT_TYPES.map((type) => (
                <label key={type} className="inline-flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={spec.employees.contractTypes.includes(type)} onChange={() => onChange({ ...spec, employees: { ...spec.employees, contractTypes: toggle(spec.employees.contractTypes, type) } })} className="h-4 w-4 accent-[#14151A]" />
                  {CONTRACT_LABELS[type].charAt(0).toUpperCase() + CONTRACT_LABELS[type].slice(1)}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {CATEGORIES.map((category) => (
                <label key={category} className="inline-flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={spec.employees.categories.includes(category)} onChange={() => onChange({ ...spec, employees: { ...spec.employees, categories: toggle(spec.employees.categories, category) } })} className="h-4 w-4 accent-[#14151A]" />
                  {CATEGORY_LABELS[category].charAt(0).toUpperCase() + CATEGORY_LABELS[category].slice(1)}
                </label>
              ))}
            </div>
            <p className="text-xs text-ink-faint">Rien de coché dans une ligne : tous. <button type="button" onClick={() => { setRestricting(false); onChange({ ...spec, employees: { contractTypes: [], categories: [] } }); }} className="underline underline-offset-4">Revenir à tous les salariés</button></p>
          </div>
        )}
      </fieldset>
    </div>
  );
}

function ConstraintsEditor({ spec, onChange }: { spec: LeaveRuleSpec; onChange: (spec: LeaveRuleSpec) => void }) {
  const update = (index: number, next: RuleConstraint) => onChange({ ...spec, constraints: spec.constraints.map((entry, position) => (position === index ? next : entry)) });
  const remove = (index: number) => onChange({ ...spec, constraints: spec.constraints.filter((_, position) => position !== index) });
  return (
    <fieldset className="min-w-0">
      <legend className="text-xs font-medium text-ink">Ce que la règle impose</legend>
      <div className="mt-2 space-y-2">
        {spec.constraints.map((constraint, index) => (
          <div key={index} className="flex items-start justify-between gap-3 rounded-lg border border-surface-border bg-white px-3 py-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink">{constraintFields(constraint, (next) => update(index, next))}</div>
            <button type="button" onClick={() => remove(index)} aria-label="Retirer cette contrainte" className="mt-1 shrink-0 rounded p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink"><X size={15} /></button>
          </div>
        ))}
      </div>
      {spec.constraints.length < MAX_CONSTRAINTS && (
        <label className="mt-2 flex max-w-full items-center gap-2 text-sm text-ink-soft">
          <Plus size={15} className="shrink-0" />
          <select value="" onChange={(event) => { const kind = event.target.value as ConstraintKind; if (kind) onChange({ ...spec, constraints: [...spec.constraints, CONSTRAINT_TEMPLATES[kind].create()] }); }} className="h-9 min-w-0 max-w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink">
            <option value="">Ajouter une contrainte…</option>
            {(Object.keys(CONSTRAINT_TEMPLATES) as ConstraintKind[]).map((kind) => <option key={kind} value={kind}>{CONSTRAINT_TEMPLATES[kind].label}</option>)}
          </select>
        </label>
      )}
    </fieldset>
  );
}

function constraintFields(constraint: RuleConstraint, set: (next: RuleConstraint) => void): ReactNode {
  switch (constraint.kind) {
    case "MAX_CONCURRENT":
      return (
        <>
          <span>Pas plus de</span>
          <NumberInput label="Nombre maximal d'absents" value={constraint.max} min={1} max={500} onChange={(max) => set({ ...constraint, max })} />
          <span>absent{constraint.max > 1 ? "s" : ""} en même temps dans</span>
          <select aria-label="Groupe" value={constraint.group} onChange={(event) => set({ ...constraint, group: event.target.value as GroupKind })} className="h-9 max-w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink">
            {(Object.keys(GROUP_LABELS) as GroupKind[]).map((group) => <option key={group} value={group}>{GROUP_LABELS[group]}</option>)}
          </select>
        </>
      );
    case "MIN_NOTICE_DAYS":
      return (<><span>Demander au moins</span><NumberInput label="Délai en jours" value={constraint.days} min={1} max={730} onChange={(days) => set({ ...constraint, days })} /><span>jours avant le départ</span></>);
    case "MAX_CONSECUTIVE_DAYS":
      return (<><span>Pas plus de</span><NumberInput label="Durée maximale en jours" value={constraint.days} min={1} max={730} onChange={(days) => set({ ...constraint, days })} /><span>jours d’affilée, week-ends compris</span></>);
    case "MIN_SENIORITY_DAYS":
      return (<><span>Ouvert après</span><NumberInput label="Ancienneté en jours" value={constraint.days} min={1} max={730} onChange={(days) => set({ ...constraint, days })} /><span>jours dans l’entreprise</span></>);
    case "BLACKOUT":
      return (
        <>
          <span>Pas d’absence du</span>
          <MonthDayInput label="Début de la période fermée" value={constraint.from} onChange={(from) => set({ ...constraint, from })} />
          <span>au</span>
          <MonthDayInput label="Fin de la période fermée" value={constraint.to} onChange={(to) => set({ ...constraint, to })} />
          <input aria-label="Motif" value={constraint.label ?? ""} placeholder="motif (facultatif)" maxLength={80} onChange={(event) => set({ ...constraint, label: event.target.value || undefined })} className="h-9 w-40 rounded-md border border-surface-border bg-white px-2 text-sm text-ink" />
        </>
      );
  }
}

function PriorityEditor({ spec, onChange }: { spec: LeaveRuleSpec; onChange: (spec: LeaveRuleSpec) => void }) {
  const order: PriorityCriterion[] = [...spec.priority, ...PRIORITY_CRITERIA.filter((criterion) => !spec.priority.includes(criterion))];
  const toggle = (criterion: PriorityCriterion) => onChange({ ...spec, priority: spec.priority.includes(criterion) ? spec.priority.filter((entry) => entry !== criterion) : [...spec.priority, criterion] });
  const move = (criterion: PriorityCriterion, direction: -1 | 1) => {
    const list = [...spec.priority];
    const index = list.indexOf(criterion);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    onChange({ ...spec, priority: list });
  };
  return (
    <fieldset className="min-w-0">
      <legend className="text-xs font-medium text-ink">Pour départager des demandes sur les mêmes dates</legend>
      <div className="mt-2 divide-y divide-surface-border rounded-lg border border-surface-border bg-white">
        {order.map((criterion) => {
          const included = spec.priority.includes(criterion);
          const index = spec.priority.indexOf(criterion);
          return (
            <div key={criterion} className="flex items-center justify-between gap-3 px-3 py-2">
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={included} onChange={() => toggle(criterion)} className="h-4 w-4 accent-[#14151A]" />
                {included ? <span className="text-ink-faint">{index === 0 ? "D’abord" : "Puis"}</span> : null}
                {PRIORITY_NAMES[criterion]}
              </label>
              {included && spec.priority.length > 1 && (
                <span className="flex gap-1">
                  <button type="button" aria-label={`Monter ${PRIORITY_NAMES[criterion]}`} disabled={index === 0} onClick={() => move(criterion, -1)} className="rounded p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`Descendre ${PRIORITY_NAMES[criterion]}`} disabled={index === spec.priority.length - 1} onClick={() => move(criterion, 1)} className="rounded p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink disabled:opacity-30"><ArrowDown size={14} /></button>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-ink-faint">À égalité, la première demande arrivée passe devant.</p>
    </fieldset>
  );
}

const LEVEL_STYLE: Record<LegalFinding["level"], { border: string; label: string; tone: string }> = {
  BLOCKING: { border: "border-l-accent-rose", label: "Bloquant", tone: "text-accent-rose" },
  WARNING: { border: "border-l-accent-amber", label: "À vérifier", tone: "text-accent-amber" },
  INFO: { border: "border-l-surface-border", label: "À savoir", tone: "text-ink-faint" },
};

function LegalReview({ findings, ready }: { findings: LegalFinding[]; ready: boolean }) {
  if (!ready) return null;
  const order = { BLOCKING: 0, WARNING: 1, INFO: 2 } as const;
  const sorted = [...findings].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Contrôle juridique</h3>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-ink-soft">Rien à signaler au regard du Code du travail. Un accord d’entreprise ou votre convention collective peut prévoir d’autres règles.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sorted.map((finding) => finding.level === "INFO" ? (
            <li key={finding.code} className={`rounded-r-lg border border-l-[3px] border-surface-border bg-white ${LEVEL_STYLE.INFO.border}`}>
              <details className="group px-3.5 py-2.5">
                <summary className="cursor-pointer list-none text-sm text-ink marker:hidden"><span className="font-semibold text-ink-faint">À savoir.</span> {finding.title}</summary>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{finding.detail}</p>
                <a href={finding.source.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs text-ink-faint underline decoration-surface-border underline-offset-4 hover:text-ink">{finding.source.label}</a>
              </details>
            </li>
          ) : (
            <li key={finding.code} className={`rounded-r-lg border border-l-[3px] border-surface-border bg-white px-3.5 py-3 ${LEVEL_STYLE[finding.level].border}`}>
              <p className="text-sm font-medium text-ink"><span className={`${LEVEL_STYLE[finding.level].tone} font-semibold`}>{LEVEL_STYLE[finding.level].label}.</span> {finding.title}</p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">{finding.detail}</p>
              <a href={finding.source.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs text-ink-faint underline decoration-surface-border underline-offset-4 hover:text-ink">{finding.source.label}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PastTest({ result }: { result: SimulationResult }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Sur vos décisions de l’année</h3>
      {result.considered === 0 ? (
        <p className="mt-2 text-sm leading-6 text-ink-soft">Aucune demande déjà tranchée ne tombe sous cette règle. Le test portera sur les prochaines.</p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Rejouée sur {result.considered} demande{result.considered > 1 ? "s" : ""} déjà tranchée{result.considered > 1 ? "s" : ""}, la règle aurait décidé comme vous {result.same} fois sur {result.considered}.
          </p>
          <PastList title="Vous les avez accordées, la règle ne l’aurait pas fait" items={result.wouldBlock} />
          <PastList title="Vous les avez refusées, la règle les aurait accordées" items={result.wouldAllow} />
        </>
      )}
    </div>
  );
}

function PastList({ title, items }: { title: string; items: SimulationResult["wouldBlock"] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-ink">{title} ({items.length})</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.slice(0, 6).map((item) => (
          <li key={item.absenceId} className="rounded-lg border border-surface-border bg-white px-3 py-2 text-xs leading-5 text-ink-soft">
            <span className="font-medium text-ink">{item.employeeName}</span>, {item.dates}. {item.reason}
          </li>
        ))}
      </ul>
      {items.length > 6 && <p className="mt-1 text-xs text-ink-faint">Et {items.length - 6} autre{items.length - 6 > 1 ? "s" : ""}.</p>}
    </div>
  );
}
