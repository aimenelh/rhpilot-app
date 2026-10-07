"use client";

import { useFormState, useFormStatus } from "react-dom";
import { savePaidLeaveOpening, savePayrollOpening, type PayrollOpeningFormState } from "./openingActions";

export type PaidLeaveOpeningView = {
  asOf: string;
  previousAcquired: number;
  previousTaken: number;
  currentAcquired: number;
  currentTaken: number;
  referenceGross: number | null;
  referenceAcquiredDays: number | null;
  currentReferenceGross: number | null;
} | null;

export type PayrollOpeningView = { year: number; throughMonth: number; cumuls: Record<string, number>; sickPayHistory: Record<string, number> | null } | null;

/** Mois du bulletin dont les compteurs ont été recopiés (la reprise s'applique au mois suivant). */
function closingMonthOf(asOf: string): string {
  const [year, month] = asOf.slice(0, 7).split("-").map(Number);
  const closing = new Date(Date.UTC(year, month - 2, 1));
  return closing.toISOString().slice(0, 7);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre"];
const FIELD = "mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink";

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">{pending ? "Enregistrement…" : label}</button>;
}

function NumberField({ name, label, value, hint }: { name: string; label: string; value?: number | null; hint?: string }) {
  return (
    <label className="block text-xs font-medium text-ink-soft">
      {label}
      <input name={name} type="number" step="0.01" min="0" inputMode="decimal" defaultValue={value ?? ""} className={FIELD} />
      {hint ? <span className="mt-1 block text-[11px] font-normal text-ink-faint">{hint}</span> : null}
    </label>
  );
}

function Feedback({ state }: { state: PayrollOpeningFormState }) {
  if (state?.error) return <p role="alert" className="rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3 py-2 text-sm text-accent-rose">{state.error}</p>;
  if (state?.saved) return <p role="status" className="rounded-lg border border-accent-teal/30 bg-accent-teal/10 px-3 py-2 text-sm text-accent-teal">Reprise enregistrée.</p>;
  return null;
}

export function PayrollOpeningSection({ employeeId, paidLeave, cumuls }: { employeeId: string; paidLeave: PaidLeaveOpeningView; cumuls: PayrollOpeningView }) {
  const [leaveState, leaveAction] = useFormState<PayrollOpeningFormState, FormData>(savePaidLeaveOpening.bind(null, employeeId), undefined);
  const [cumulState, cumulAction] = useFormState<PayrollOpeningFormState, FormData>(savePayrollOpening.bind(null, employeeId), undefined);
  const c = cumuls?.cumuls ?? {};

  return (
    <details className="group mt-5 rounded-lg border border-surface-border bg-surface-muted/40 px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:hidden">
        <span className="flex items-center justify-between gap-3">
          Reprise des compteurs et des cumuls
          <span className="text-xs font-normal text-ink-faint group-open:hidden">{paidLeave || cumuls ? "Renseignée" : "À renseigner si le salarié était payé ailleurs"}</span>
          <span className="hidden text-xs font-normal text-ink-faint group-open:inline">Masquer</span>
        </span>
      </summary>
      <p className="mt-3 text-xs leading-5 text-ink-faint">Recopiez les compteurs du dernier bulletin établi avant RH Pilot. Ensuite, chaque bulletin validé met à jour les soldes et les cumuls automatiquement.</p>

      <form action={leaveAction} className="mt-4 space-y-3 rounded-lg border border-surface-border bg-white p-4">
        <p className="text-sm font-semibold text-ink">Congés payés</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-xs font-medium text-ink-soft sm:col-span-4">Compteurs figurant sur le bulletin de
            <input name="closingMonth" type="month" required defaultValue={paidLeave ? closingMonthOf(paidLeave.asOf) : ""} className={`${FIELD} sm:w-56`} />
            <span className="mt-1 block text-[11px] font-normal text-ink-faint">Ils s&apos;appliquent à partir du mois suivant, bascule du 1er juin comprise.</span>
          </label>
          <NumberField name="previousAcquired" label="N-1 acquis" value={paidLeave?.previousAcquired} />
          <NumberField name="previousTaken" label="N-1 pris" value={paidLeave?.previousTaken} />
          <NumberField name="currentAcquired" label="N acquis" value={paidLeave?.currentAcquired} />
          <NumberField name="currentTaken" label="N pris" value={paidLeave?.currentTaken} />
          <NumberField name="referenceGross" label="Brut de la période N-1" value={paidLeave?.referenceGross} hint="Pour la règle du dixième" />
          <NumberField name="referenceAcquiredDays" label="Jours acquis sur N-1" value={paidLeave?.referenceAcquiredDays} />
          <NumberField name="currentReferenceGross" label="Brut depuis le 1er juin" value={paidLeave?.currentReferenceGross} />
        </div>
        <Feedback state={leaveState} />
        <div className="flex justify-end"><Save label="Enregistrer les soldes" /></div>
      </form>

      <form action={cumulAction} className="mt-4 space-y-3 rounded-lg border border-surface-border bg-white p-4">
        <p className="text-sm font-semibold text-ink">Cumuls de l&apos;année</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-xs font-medium text-ink-soft">Année
            <input name="year" type="number" min="2026" step="1" required defaultValue={cumuls?.year ?? 2026} className={FIELD} />
          </label>
          <label className="block text-xs font-medium text-ink-soft">Arrêtés à fin
            <select name="throughMonth" required defaultValue={cumuls?.throughMonth ?? 1} className={`${FIELD} bg-white`}>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
          </label>
          <NumberField name="grossSubject" label="Brut soumis" value={c.grossSubject} />
          <NumberField name="ceiling" label="Plafond SS" value={c.ceiling} />
          <NumberField name="baseT1" label="Base tranche 1" value={c.baseT1} hint="Calculée si vide" />
          <NumberField name="baseT2" label="Base tranche 2" value={c.baseT2} hint="Calculée si vide" />
          <NumberField name="netTaxable" label="Net imposable" value={c.netTaxable} />
          <NumberField name="apprenticeFiscalIncome" label="Apprenti : cumul net fiscal avant exonération" value={c.apprenticeFiscalIncome} hint="Obligatoire pour un apprenti. Salaires de l'année avant exonération annuelle, sans IJSS subrogées." />
          <NumberField name="withholdingTax" label="Impôt prélevé" value={c.withholdingTax} />
          <NumberField name="netPaid" label="Net payé" value={c.netPaid} />
          <NumberField name="netSocial" label="Montant net social" value={c.netSocial} />
          <NumberField name="rgduSmic" label="RGDU : Smic cumulé" value={c.rgduSmic} />
          <NumberField name="rgduRemuneration" label="RGDU : rémunération cumulée" value={c.rgduRemuneration} />
          <NumberField name="rgduAmount" label="RGDU : réduction cumulée" value={c.rgduAmount} />
          <NumberField name="rgduUrssafAmount" label="RGDU : part Urssaf déclarée" value={c.rgduUrssafAmount} hint="Cumul des CTP 668/669 de vos DSN de l'année, hors retraite complémentaire. Nécessaire à la première DSN." />
          <NumberField name="overtimeTaxExemptGross" label="Heures sup. défiscalisées" value={c.overtimeTaxExemptGross} />
          <NumberField name="hoursPaid" label="Heures payées" value={c.hoursPaid} />
          <NumberField name="employerCost" label="Coût employeur" value={c.employerCost} />
          <NumberField name="sickFullRateDays" label="Jours de maintien à 90 %" value={cumuls?.sickPayHistory?.fullRateDaysUsed} hint="Sur les 12 derniers mois" />
          <NumberField name="sickReducedRateDays" label="Jours de maintien à 66,66 %" value={cumuls?.sickPayHistory?.reducedRateDaysUsed} />
        </div>
        <Feedback state={cumulState} />
        <div className="flex justify-end"><Save label="Enregistrer les cumuls" /></div>
      </form>
    </details>
  );
}
