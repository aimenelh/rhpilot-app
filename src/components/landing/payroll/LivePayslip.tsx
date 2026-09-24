"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { DEMO_LIMITS, type DemoInput, type DemoResult, type DemoRow } from "./payslipDemoShared";
import { createPayslipWorker } from "./createPayslipWorker";
import s from "./LivePayslip.module.css";

// Un bulletin qui se recalcule sous les yeux du visiteur, avec le moteur du
// logiciel exécuté dans son navigateur. Le premier rendu est calculé côté
// serveur : la page affiche de vrais chiffres avant même le chargement du moteur.

export type PayslipFocus = "contributions" | "netSocial" | "traceability" | "health" | "employer" | "profile";

const OPEN_BY_FOCUS: Partial<Record<PayslipFocus, string>> = { traceability: "rgdu", health: "sante", employer: "atmp" };

const money = (value: number) =>
  `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value).replace(/ | /g, " ")} €`;
const signed = (value: number) => (value < 0 ? `−${money(-value)}` : money(value));
const wholeEuros = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value).replace(/\u202f|\u00a0/g, "\u00a0");
const percent = (rate: number) =>
  `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(rate * 100)} %`;

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      from.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    let t0 = 0;
    const step = (time: number) => {
      if (!t0) t0 = time;
      const p = Math.min(1, (time - t0) / 380);
      const eased = 1 - (1 - p) ** 3;
      const next = start + (target - start) * eased;
      from.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(step);
      else from.current = target;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function Figure({ label, value, big, note }: { label: string; value: number; big?: boolean; note?: string }) {
  const shown = useAnimatedNumber(value);
  return (
    <div className={s.figure} data-big={big}>
      <span>{label}</span>
      <strong>{money(Math.round(shown * 100) / 100)}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function Explanation({ row, input }: { row: DemoRow; input: DemoInput }) {
  const formulas = (
    [
      ["Part salarié", row.employee],
      ["Part employeur", row.employer],
    ] as const
  ).flatMap(([who, side]) => {
    if (!side) return [];
    if (row.base !== null && side.rate !== null)
      return [`${who} : ${money(row.base)} × ${percent(side.rate)} = ${signed(side.amount)}`];
    return [`${who} : ${signed(side.amount)}, montant calculé directement par le modèle social`];
  });
  return (
    <div className={s.explain}>
      {row.key === "rgdu" ? (
        <p>
          Réduction générale dégressive unique : le coefficient baisse à mesure que le salaire s’éloigne du Smic et
          s’annule à 3 Smic. Pour 2026, RH Pilot le calcule avec le Smic gelé à 12,02 € de l’heure (décret n° 2026-509
          du 12 juin 2026).
        </p>
      ) : null}
      {row.key === "sante" ? (
        <p>
          Contrat de {money(input.healthMonthly)} par mois, dont {input.healthEmployerRate} % payés par l’employeur. La part
          employeur s’ajoute au net imposable du salarié.
        </p>
      ) : null}
      <ul>
        {formulas.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className={s.rule}>
        Règle du moteur : <code>{row.sourceRule}</code>
      </p>
      {row.references.length ? (
        <p className={s.refs}>
          Sources :{" "}
          {row.references.map((ref, index) => (
            <Fragment key={ref.href}>
              {index ? " · " : null}
              <a href={ref.href} target="_blank" rel="noreferrer">
                {ref.title}
              </a>
            </Fragment>
          ))}
        </p>
      ) : null}
    </div>
  );
}

export function LivePayslip({ initial, focus = "contributions" }: { initial: DemoResult; focus?: PayslipFocus }) {
  const [input, setInput] = useState<DemoInput>(initial.input);
  const [result, setResult] = useState<DemoResult>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(OPEN_BY_FOCUS[focus] ?? null);
  const [grossText, setGrossText] = useState(wholeEuros(initial.input.gross));
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  // Un seul calcul à la fois ; pendant un glissement, seule la dernière valeur
  // attend son tour. Le bulletin suit le curseur au rythme du moteur (~30 ms).
  const inFlight = useRef(false);
  const queued = useRef<DemoInput | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef<DemoResult>(initial);
  const uid = useId();

  const ensureWorker = useCallback(() => {
    if (worker.current || typeof Worker === "undefined") return worker.current;
    const created = createPayslipWorker();
    created.onmessage = (event: MessageEvent<{ id: number; result?: DemoResult; error?: string }>) => {
      if (event.data.id !== request.current) return;
      inFlight.current = false;
      const waiting = queued.current;
      if (waiting) {
        queued.current = null;
        inFlight.current = true;
        request.current += 1;
        created.postMessage({ id: request.current, input: waiting });
      } else setPending(false);
      if (event.data.error || !event.data.result) {
        setError("Ce cas sort de la simulation. Essayez un autre salaire.");
        return;
      }
      setError(null);
      const next = event.data.result;
      const diff = new Set<string>();
      const before = new Map(previous.current.groups.flatMap((group) => group.rows).map((row) => [row.key, row]));
      for (const row of next.groups.flatMap((group) => group.rows)) {
        const old = before.get(row.key);
        if (!old || old.employee?.amount !== row.employee?.amount || old.employer?.amount !== row.employer?.amount) diff.add(row.key);
      }
      previous.current = next;
      setChanged(diff);
      setResult(next);
    };
    worker.current = created;
    return created;
  }, []);

  // Le moteur (environ 150 Ko compressés) ne se charge qu'à l'approche du bulletin.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ensureWorker();
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      worker.current?.terminate();
      worker.current = null;
      inFlight.current = false;
      queued.current = null;
    };
  }, [ensureWorker]);

  useEffect(() => {
    if (!changed.size) return;
    const timer = window.setTimeout(() => setChanged(new Set()), 1100);
    return () => window.clearTimeout(timer);
  }, [changed]);

  const update = (patch: Partial<DemoInput>) => {
    const next = { ...input, ...patch };
    setInput(next);
    if (patch.gross !== undefined) setGrossText(wholeEuros(next.gross));
    const w = ensureWorker();
    if (!w) return;
    setPending(true);
    if (inFlight.current) {
      queued.current = next;
      return;
    }
    inFlight.current = true;
    request.current += 1;
    w.postMessage({ id: request.current, input: next });
  };

  const commitGross = () => {
    const value = Number(grossText.replace(/\s| /g, "").replace(",", "."));
    if (!Number.isFinite(value) || !grossText.trim()) {
      setGrossText(wholeEuros(input.gross));
      return;
    }
    const clamped = Math.min(DEMO_LIMITS.grossMax, Math.max(DEMO_LIMITS.grossMin, Math.round(value)));
    update({ gross: clamped });
  };

  const rows = result.groups.flatMap((group) => group.rows);
  const bigFigure = focus === "netSocial" ? "netSocial" : "netBeforeTax";

  return (
    <div ref={root} className={s.live} data-focus={focus}>
      <div className={s.controls}>
        <label className={s.grossLabel} htmlFor={`${uid}-gross`}>
          Salaire brut mensuel
        </label>
        <div className={s.grossField}>
          <input
            id={`${uid}-gross`}
            inputMode="decimal"
            value={grossText}
            onChange={(event) => setGrossText(event.target.value)}
            onBlur={commitGross}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitGross();
            }}
            aria-describedby={`${uid}-gross-hint`}
          />
          <span aria-hidden="true">€</span>
        </div>
        <input
          className={s.range}
          type="range"
          min={DEMO_LIMITS.grossMin}
          max={DEMO_LIMITS.grossMax}
          step={1}
          value={input.gross}
          onChange={(event) => {
            // Au doigt, des paliers de 10 € ; le minimum reste le Smic exact.
            const value = Number(event.target.value);
            update({ gross: value <= DEMO_LIMITS.grossMin + 5 ? DEMO_LIMITS.grossMin : Math.round(value / 10) * 10 });
          }}
          aria-label="Salaire brut mensuel"
          style={{ ["--p" as string]: `${((input.gross - DEMO_LIMITS.grossMin) / (DEMO_LIMITS.grossMax - DEMO_LIMITS.grossMin)) * 100}%` }}
        />
        <p id={`${uid}-gross-hint`} className={s.hint}>
          Du Smic (1 823 €) à 6 000 €.
        </p>

        <div className={s.switch} role="group" aria-label="Statut du salarié">
          <button type="button" aria-pressed={!input.cadre} onClick={() => update({ cadre: false })}>
            Non cadre
          </button>
          <button type="button" aria-pressed={input.cadre} onClick={() => update({ cadre: true })}>
            Cadre
          </button>
        </div>

        {focus === "health" ? (
          <div className={s.extra}>
            <label htmlFor={`${uid}-health`}>
              Complémentaire santé <b>{money(input.healthMonthly)}</b> par mois
            </label>
            <input id={`${uid}-health`} className={s.range} type="range" min={20} max={150} step={5} value={input.healthMonthly} onChange={(event) => update({ healthMonthly: Number(event.target.value) })} style={{ ["--p" as string]: `${((input.healthMonthly - 20) / 130) * 100}%` }} />
            <label htmlFor={`${uid}-share`}>
              Part payée par l’employeur <b>{input.healthEmployerRate} %</b>
            </label>
            <input id={`${uid}-share`} className={s.range} type="range" min={50} max={100} step={5} value={input.healthEmployerRate} onChange={(event) => update({ healthEmployerRate: Number(event.target.value) })} style={{ ["--p" as string]: `${((input.healthEmployerRate - 50) / 50) * 100}%` }} />
          </div>
        ) : null}
        {focus === "employer" ? (
          <div className={s.extra}>
            <label htmlFor={`${uid}-atmp`}>
              Taux accidents du travail de l’établissement <b>{percent(input.atmpRate / 100)}</b>
            </label>
            <input id={`${uid}-atmp`} className={s.range} type="range" min={DEMO_LIMITS.atmpMin} max={DEMO_LIMITS.atmpMax} step={0.01} value={input.atmpRate} onChange={(event) => update({ atmpRate: Number(event.target.value) })} style={{ ["--p" as string]: `${((input.atmpRate - DEMO_LIMITS.atmpMin) / (DEMO_LIMITS.atmpMax - DEMO_LIMITS.atmpMin)) * 100}%` }} />
          </div>
        ) : null}

        <div className={s.figures}>
          <Figure big label={bigFigure === "netSocial" ? "Montant net social" : "Net à payer avant impôt"} value={bigFigure === "netSocial" ? result.netSocial : result.netBeforeTax} />
          {bigFigure === "netSocial" ? <Figure label="Net à payer avant impôt" value={result.netBeforeTax} /> : <Figure label="Montant net social" value={result.netSocial} />}
          <Figure label="Net imposable" value={result.netTaxable} />
          <Figure label="Coût total employeur" value={result.employerCost} />
        </div>
      </div>

      <div className={s.paper}>
        <div className={s.paperHead}>
          <div>
            <strong>Bulletin de simulation · octobre 2026</strong>
            <span>Salarié fictif, CDI, entreprise de moins de 11 salariés</span>
          </div>
          <span className={s.status} data-pending={pending}>
            {pending ? "Calcul…" : "À jour"}
          </span>
        </div>

        <table className={s.table}>
          <caption className={s.srOnly}>Cotisations et contributions du bulletin de simulation</caption>
          <thead>
            <tr>
              <th scope="col">Cotisation</th>
              <th scope="col" className={s.wide}>Base</th>
              <th scope="col" className={s.wide}>Taux sal.</th>
              <th scope="col">
                <span className={s.wide}>Part </span>salarié
              </th>
              <th scope="col" className={s.wide}>Taux pat.</th>
              <th scope="col">
                <span className={s.wide}>Part </span>employeur
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={s.grossRow}>
              <th scope="row">Salaire de base</th>
              <td className={s.wide} />
              <td className={s.wide} />
              <td>{money(result.gross)}</td>
              <td className={s.wide} />
              <td />
            </tr>
            {result.groups.map((group) => (
              <Fragment key={group.title}>
                {!(group.rows.length === 1 && group.rows[0].label.toLowerCase() === group.title.toLowerCase()) ? (
                  <tr className={s.groupRow}>
                    <th scope="rowgroup" colSpan={6}>
                      {group.title}
                    </th>
                  </tr>
                ) : null}
                {group.rows.map((row) => {
                  const isOpen = open === row.key;
                  // Une rubrique d'une seule ligne (accidents du travail, chômage…) s'affiche comme sa propre rubrique.
                  const solo = group.rows.length === 1 && row.label.toLowerCase() === group.title.toLowerCase();
                  return (
                    <Fragment key={row.key}>
                      <tr className={s.row} data-solo={solo} data-open={isOpen} data-changed={changed.has(row.key)} data-reduction={row.key === "rgdu"}>
                        <th scope="row">
                          <button type="button" aria-expanded={isOpen} aria-controls={`${uid}-${row.key}`} onClick={() => setOpen(isOpen ? null : row.key)}>
                            {row.label}
                          </button>
                        </th>
                        <td className={s.wide}>{row.base !== null ? money(row.base) : ""}</td>
                        <td className={s.wide}>{row.employee?.rate != null ? percent(row.employee.rate) : ""}</td>
                        <td>{row.employee ? signed(row.employee.amount) : ""}</td>
                        <td className={s.wide}>{row.employer?.rate != null ? percent(row.employer.rate) : ""}</td>
                        <td>{row.employer ? signed(row.employer.amount) : ""}</td>
                      </tr>
                      {isOpen ? (
                        <tr className={s.explainRow} id={`${uid}-${row.key}`}>
                          <td colSpan={6}>
                            <Explanation row={row} input={result.input} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className={s.totalRow}>
              <th scope="row">Total des cotisations</th>
              <td className={s.wide} />
              <td className={s.wide} />
              <td>{money(result.employeeContributions)}</td>
              <td className={s.wide} />
              <td>{money(result.employerContributions)}</td>
            </tr>
            <tr className={s.netRow}>
              <th scope="row" colSpan={3}>
                Net à payer avant impôt
              </th>
              <td colSpan={3}>{money(result.netBeforeTax)}</td>
            </tr>
          </tfoot>
        </table>
        {error ? <p className={s.error}>{error}</p> : <p className={s.tip}>Ouvrez une ligne pour voir son calcul et sa source.</p>}
        <p className={s.fine}>
          Calcul réel, par le même moteur que le logiciel : modèle social de l’URSSAF (version {result.modelVersion}) et
          règles RH Pilot. Tout se calcule dans votre navigateur, rien n’est envoyé. Simulation hors convention
          collective, sans heures supplémentaires ni absences.
        </p>
      </div>
      <p className={s.srOnly} aria-live="polite">
        {rows.length} lignes de cotisation. Net à payer avant impôt {money(result.netBeforeTax)}.
      </p>
    </div>
  );
}
