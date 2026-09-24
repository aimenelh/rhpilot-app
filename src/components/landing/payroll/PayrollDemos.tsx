"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { getPayslipPrerequisites, hasBlockingPayslipPrerequisites } from "@/lib/payroll/payslip-prerequisites";
import { checkPayrollPeriodReadiness, type PayrollPreflightEmployeeInput } from "@/lib/payroll/period-preflight";
import { calculateOvertimePay } from "@/lib/payroll/working-time-pay";
import { calculatePaidLeaveAcquisition2026, calculatePaidLeaveIndemnity2026 } from "@/lib/payroll/paid-leave-2026";
import { calculateSicknessIjss2026 } from "@/lib/payroll/ijss-2026";
import { resolveMinimumSalary } from "@/lib/payroll/minimum-salary-resolver";
import s from "./PayrollDemos.module.css";

// Démonstrations des pages paie. Chacune appelle la fonction du logiciel qui
// traite le sujet, sur des salariés fictifs : rien n'est simulé à côté.

const money = (value: number) =>
  `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value).replace(/ | /g, " ")} €`;
const num = (value: number, digits = 2) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(value).replace(/ | /g, " ");
const pct = (rate: number) => `${num(rate * 100)} %`;

function Frame({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <div className={s.frame}>
      <div className={s.bar}>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <div className={s.body}>{children}</div>
    </div>
  );
}

function Range({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>
        {label} <b>{display}</b>
      </label>
      <input id={id} className={s.range} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }} />
    </div>
  );
}

function Result({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={s.result} data-strong={strong}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

/* Bulletin de paie : les sept prérequis de getPayslipPrerequisites. */
export function PrerequisitesDemo({ net }: { net: number }) {
  const [locked, setLocked] = useState(false);
  const [siret, setSiret] = useState(false);
  const [position, setPosition] = useState(true);
  const [calculated, setCalculated] = useState(true);
  const [generated, setGenerated] = useState(false);
  const items = getPayslipPrerequisites({
    periodLocked: locked,
    hasEmployees: true,
    calculationsComplete: calculated,
    snapshotsComplete: calculated,
    organizationSiret: siret ? "123 456 789 00012" : "",
    employeePosition: position ? "Assistante commerciale" : "",
    employeeClassification: "",
    collectiveAgreementName: "",
  });
  const blocked = hasBlockingPayslipPrerequisites(items);
  const toggles: Record<string, { on: boolean; set: (value: boolean) => void; fix: string; undo: string }> = {
    PERIOD_LOCKED: { on: locked, set: setLocked, fix: "Verrouiller", undo: "Déverrouiller" },
    EMPLOYER_ID: { on: siret, set: setSiret, fix: "Saisir le SIRET", undo: "Effacer" },
    EMPLOYEE_CONTEXT: { on: position, set: setPosition, fix: "Saisir le poste", undo: "Effacer" },
    CALCULATIONS: { on: calculated, set: setCalculated, fix: "Recalculer", undo: "Annuler le calcul" },
  };
  return (
    <Frame title="Bulletins d’octobre 2026" meta="Entreprise de démonstration, 3 salariés">
      <ul className={s.checks}>
        {items.map((item) => {
          const toggle = toggles[item.code];
          return (
            <li key={item.code} data-ready={item.ready}>
              <span className={s.mark} aria-hidden="true">
                {item.ready ? "✓" : "✗"}
              </span>
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
              {toggle ? (
                <button
                  type="button"
                  onClick={() => {
                    toggle.set(!toggle.on);
                    setGenerated(false);
                  }}
                >
                  {toggle.on ? toggle.undo : toggle.fix}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className={s.actions}>
        <button type="button" className={s.primary} disabled={blocked} onClick={() => setGenerated(true)}>
          Générer les bulletins
        </button>
        <p aria-live="polite">
          {generated
            ? `3 bulletins générés. Celui de Léa Martin affiche un net à payer avant impôt de ${money(net)}.`
            : blocked
              ? `${items.filter((item) => !item.ready).length} prérequis manquant${items.filter((item) => !item.ready).length > 1 ? "s" : ""} : la génération reste bloquée.`
              : "Tout est prêt."}
        </p>
      </div>
    </Frame>
  );
}

/* Production : le contrôle de période de checkPayrollPeriodReadiness. */
const TEAM: PayrollPreflightEmployeeInput[] = [
  { employeeId: "lea", firstName: "Léa", lastName: "Martin", baseSalaryCents: 250000, monthlyHours: 151.67, hireDate: new Date(Date.UTC(2024, 2, 1)), profileCount: 1 },
  { employeeId: "karim", firstName: "Karim", lastName: "Belhaj", baseSalaryCents: 230000, monthlyHours: null, hireDate: new Date(Date.UTC(2025, 8, 1)), profileCount: 1 },
  { employeeId: "sofia", firstName: "Sofia", lastName: "Durand", baseSalaryCents: 210000, monthlyHours: 151.67, hireDate: new Date(Date.UTC(2026, 9, 12)), profileCount: 1, hasIncompleteMonthAdjustment: false },
];
const FIXES: Record<string, { label: string; patch: Partial<PayrollPreflightEmployeeInput> }> = {
  MISSING_MONTHLY_HOURS: { label: "Saisir 151,67 h", patch: { monthlyHours: 151.67 } },
  PARTIAL_MONTH_ENTRY: { label: "Saisir le prorata d’entrée", patch: { hasIncompleteMonthAdjustment: true } },
};

export function PreflightDemo() {
  const [team, setTeam] = useState(TEAM);
  const [launched, setLaunched] = useState(false);
  const result = checkPayrollPeriodReadiness(team, { year: 2026, month: 10 });
  return (
    <Frame title="Période d’octobre 2026" meta="Contrôle avant calcul">
      <table className={s.team}>
        <thead>
          <tr>
            <th scope="col">Salarié</th>
            <th scope="col">Salaire de base</th>
            <th scope="col">Horaire mensuel</th>
            <th scope="col">Entrée</th>
          </tr>
        </thead>
        <tbody>
          {team.map((employee) => (
            <tr key={employee.employeeId} data-issue={result.issues.some((issue) => issue.employeeId === employee.employeeId)}>
              <th scope="row">
                {employee.firstName} {employee.lastName}
              </th>
              <td>{employee.baseSalaryCents != null ? money(employee.baseSalaryCents / 100) : "manquant"}</td>
              <td>{employee.monthlyHours != null ? `${num(employee.monthlyHours)} h` : "manquant"}</td>
              <td>{employee.hireDate?.toLocaleDateString("fr-FR", { timeZone: "UTC" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.issues.length ? (
        <ul className={s.issues}>
          {result.issues.map((issue) => {
            const fix = FIXES[issue.code];
            return (
              <li key={`${issue.code}-${issue.employeeId}`}>
                <span className={s.tag}>Bloquant</span>
                <p>{issue.message}</p>
                {fix ? (
                  <button type="button" onClick={() => setTeam((list) => list.map((employee) => (employee.employeeId === issue.employeeId ? { ...employee, ...fix.patch } : employee)))}>
                    {fix.label}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={s.ok}>Aucun blocage : la période peut être calculée.</p>
      )}
      <div className={s.actions}>
        <button type="button" className={s.primary} disabled={!result.ready} onClick={() => setLaunched(true)}>
          Calculer la période
        </button>
        <button
          type="button"
          className={s.link}
          onClick={() => {
            setTeam(TEAM);
            setLaunched(false);
          }}
        >
          Recommencer
        </button>
        <p aria-live="polite">{launched ? "Dans le logiciel, le calcul des trois salariés démarre ici." : result.ready ? "Prête." : `${result.issues.length} point${result.issues.length > 1 ? "s" : ""} à régler avant le calcul.`}</p>
      </div>
    </Frame>
  );
}

/* Variables : heures supplémentaires avec calculateOvertimePay. */
export function OvertimeDemo() {
  const [base, setBase] = useState(2500);
  const [week1, setWeek1] = useState(4);
  const [week2, setWeek2] = useState(10);
  const result = calculateOvertimePay({
    baseSalaryAmount: base,
    monthlyHours: 151.67,
    weeks: [
      { weekLabel: "semaine 41", overtimeHours: week1 },
      { weekLabel: "semaine 42", overtimeHours: week2 },
    ],
  });
  const hourly = result.lines[0]?.baseHourlyRate ?? Math.round((base / 151.67) * 100) / 100;
  return (
    <Frame title="Variables d’octobre 2026" meta="Léa Martin, 35 h par semaine">
      <div className={s.split}>
        <div>
          <Range label="Salaire de base" value={base} display={money(base)} min={1830} max={4500} step={10} onChange={setBase} />
          <Range label="Heures sup semaine 41" value={week1} display={`${week1} h`} min={0} max={15} step={1} onChange={setWeek1} />
          <Range label="Heures sup semaine 42" value={week2} display={`${week2} h`} min={0} max={15} step={1} onChange={setWeek2} />
        </div>
        <div>
          <p className={s.line}>
            Taux horaire : {money(base)} ÷ 151,67 h = <b>{money(hourly)}</b>
          </p>
          <ul className={s.lines}>
            {result.lines.map((line) => (
              <li key={line.label}>
                <span>
                  {line.label.includes("semaine 41") ? "Semaine 41" : "Semaine 42"}, {line.label.endsWith("1") ? `${num(line.hours)} premières heures` : `${num(line.hours)} heures suivantes`} majorées de {pct(line.premiumRate)}
                </span>
                <b>{money(line.amount)}</b>
              </li>
            ))}
            {!result.lines.length ? <li>Aucune heure supplémentaire ce mois-ci.</li> : null}
          </ul>
          <Result label="Heures supplémentaires" value={money(result.totalAmount)} />
          <Result strong label="Brut du mois" value={money(base + result.totalAmount)} />
          <p className={s.note}>Majorations légales par défaut (25 % puis 50 % au-delà de 8 heures par semaine), remplacées par celles de la convention quand elle en prévoit d’autres.</p>
        </div>
      </div>
    </Frame>
  );
}

/* Congés : dixième ou maintien de salaire, calculatePaidLeaveIndemnity2026. */
export function PaidLeaveDemo() {
  const [salary, setSalary] = useState(2500);
  const [bonus, setBonus] = useState(1500);
  const [weeks, setWeeks] = useState(1);
  const result = useMemo(
    () =>
      calculatePaidLeaveIndemnity2026({
        referencePeriodGrossAmount: salary * 12 + bonus,
        leaveDays: weeks * 6,
        leaveDayDenominator: 30,
        monthlySalaryAmount: salary,
        actualHoursInMonth: 154,
        leaveHoursInMonth: weeks * 35,
        leaveStartDate: new Date(Date.UTC(2026, 9, 12)),
        leaveEndDate: new Date(Date.UTC(2026, 9, 12 + weeks * 7 - 1)),
      }),
    [salary, bonus, weeks],
  );
  const acquisition = calculatePaidLeaveAcquisition2026({ workingMonthsEquivalent: 1 });
  const tenthWins = result.selectedMethod === "TENTH";
  return (
    <Frame title="Congés payés d’octobre 2026" meta="Léa Martin, 22 jours ouvrés dans le mois">
      <div className={s.split}>
        <div>
          <Range label="Salaire mensuel" value={salary} display={money(salary)} min={1830} max={4500} step={10} onChange={setSalary} />
          <Range label="Primes sur la période de référence" value={bonus} display={money(bonus)} min={0} max={6000} step={100} onChange={setBonus} />
          <Range label="Congés pris en octobre" value={weeks} display={`${weeks} semaine${weeks > 1 ? "s" : ""}`} min={1} max={2} step={1} onChange={setWeeks} />
        </div>
        <div>
          <div className={s.compare}>
            <div data-win={tenthWins}>
              <span>Règle du dixième</span>
              <b>{money(result.tenthMethodAmount)}</b>
              <small>
                {money(salary * 12 + bonus)} ÷ 10 × {weeks * 6} jours sur 30
              </small>
            </div>
            <div data-win={!tenthWins}>
              <span>Maintien de salaire</span>
              <b>{money(result.salaryMaintenanceAmount)}</b>
              <small>
                {money(salary)} × {weeks * 35} h sur 154 h
              </small>
            </div>
          </div>
          <p className={s.verdict}>
            RH Pilot retient la méthode la plus favorable à Léa : <b>{tenthWins ? "la règle du dixième" : "le maintien de salaire"}</b>, soit {money(result.selectedAmount)}.
          </p>
          <p className={s.note}>Chaque mois travaillé ajoute {num(acquisition.acquiredWorkingDays, 1)} jours ouvrables à son compteur, dans la limite de 30 par an.</p>
        </div>
      </div>
    </Frame>
  );
}

/* Arrêts : indemnités journalières maladie, calculateSicknessIjss2026. */
export function IjssDemo() {
  const [salary, setSalary] = useState(2500);
  const [days, setDays] = useState(10);
  const result = calculateSicknessIjss2026({ previousGrossSalaries: [salary, salary, salary], prescribedCalendarDays: days, startDate: new Date(Date.UTC(2026, 9, 5)) });
  const capped = salary > 2613.83;
  return (
    <Frame title="Arrêt maladie de Tom Girard" meta="À partir du lundi 5 octobre 2026">
      <div className={s.split}>
        <div>
          <Range label="Salaire des trois derniers mois" value={salary} display={money(salary)} min={1830} max={5000} step={10} onChange={setSalary} />
          <Range label="Durée de l’arrêt" value={days} display={`${days} jours`} min={1} max={30} step={1} onChange={setDays} />
        </div>
        <div>
          <p className={s.line}>
            Salaire journalier de base : 3 × {money(Math.min(salary, 2613.83))} ÷ 91,25 = <b>{money(result.dailyReferenceSalary)}</b>
          </p>
          {capped ? <p className={s.note}>Salaires retenus dans la limite de 1,4 Smic, soit 2 613,83 € par mois.</p> : null}
          <Result label="Indemnité journalière (50 %, plafond 42,97 €)" value={money(result.dailyBenefit)} />
          <Result label="Jours de carence" value={`${result.waitingDays}`} />
          <Result label="Jours indemnisés" value={`${result.compensatedDays}`} />
          <Result strong label="Versé par l’Assurance maladie" value={money(result.grossBenefitTotal)} />
          <p className={s.note}>Avec la subrogation, ces indemnités passent par le bulletin de paie.</p>
        </div>
      </div>
    </Frame>
  );
}

/* Convention collective : minimum conventionnel comparé au Smic, resolveMinimumSalary. */
const GRID = [
  { code: "E1", label: "Employé, niveau 1", cents: 185000 },
  { code: "E2", label: "Employé, niveau 2", cents: 196000 },
  { code: "AM", label: "Agent de maîtrise", cents: 224000 },
];
const SMIC_JUNE_2026 = { hourlyGrossCents: 1231, monthlyGrossCentsAt35Hours: 186702, monthlyHoursAt35Hours: 151.67, ruleCode: "SMIC_GROSS", ruleVersionId: "smic-2026-06" };

export function MinimumDemo() {
  const [level, setLevel] = useState(GRID[0].code);
  const [gross, setGross] = useState(1860);
  const row = GRID.find((item) => item.code === level) ?? GRID[0];
  const result = resolveMinimumSalary({
    smic: SMIC_JUNE_2026,
    collectiveMinimum: { status: "APPLICABLE", classificationCode: row.code, monthlyMinimumCents: row.cents, differenceCents: gross * 100 - row.cents, compliant: gross * 100 >= row.cents },
    monthlyHours: 151.67,
    monthlyGrossCents: Math.round(gross * 100),
    collectiveRuleVersionId: "demo-2026",
  });
  return (
    <Frame title="Contrôle du salaire minimum" meta="Convention de démonstration (fictive), 35 h">
      <div className={s.split}>
        <div>
          <div className={s.field} role="group" aria-label="Classification">
            <span className={s.fieldLabel}>Classification</span>
            <div className={s.choices}>
              {GRID.map((item) => (
                <button key={item.code} type="button" aria-pressed={item.code === level} onClick={() => setLevel(item.code)}>
                  {item.label}
                  <small>{money(item.cents / 100)}</small>
                </button>
              ))}
            </div>
          </div>
          <Range label="Salaire brut" value={gross} display={money(gross)} min={1800} max={2600} step={5} onChange={setGross} />
        </div>
        <div>
          {result.status === "APPLICABLE" ? (
            <>
              <Result label="Minimum de la convention" value={money(row.cents / 100)} />
              <Result label="Smic (12,31 € × 151,67 h)" value={money(result.smicMonthlyMinimumCents / 100)} />
              <Result strong label={result.source === "SMIC" ? "Minimum retenu : le Smic" : "Minimum retenu : la convention"} value={money(result.appliedMonthlyMinimumCents / 100)} />
              <p className={s.verdict} data-ok={result.compliant}>
                {result.compliant ? `Salaire conforme, ${money(result.differenceCents / 100)} au-dessus du minimum.` : `Salaire trop bas de ${money(-result.differenceCents / 100)} : RH Pilot le signale avant le calcul.`}
              </p>
              {result.source === "SMIC" ? <p className={s.note}>Ce minimum conventionnel est passé sous le Smic depuis la revalorisation du 1er juin : c’est le Smic qui s’applique.</p> : null}
            </>
          ) : (
            <p className={s.note}>{result.message}</p>
          )}
        </div>
      </div>
    </Frame>
  );
}
