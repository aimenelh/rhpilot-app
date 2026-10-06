"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveTermination, type TerminationFormState } from "./terminationActions";
import { DSN_END_REASONS, DSN_NOTICE_TYPES } from "@/lib/payroll/dsn-termination";

export type TerminationView = {
  reason: string;
  noticeCompensation: number | null;
  severanceAmount: number | null;
  severanceLegalMinimum: number | null;
  previousYearGross: number | null;
  eligibleForFullPension: boolean;
  cddEndAllowanceMode: "AUTO" | "NONE" | "AMOUNT";
  cddEndAllowanceAmount: number | null;
  cddEndAllowanceRate: number | null;
  paidLeaveCompensationAmount: number | null;
  dsn: {
    endReasonCode: string | null; notificationDate: string | null; conventionSignatureDate: string | null; dismissalProcedureDate: string | null;
    lastWorkedPaidDate: string | null; noticeTypeCode: string | null; noticeStartDate: string | null; noticeEndDate: string | null;
    transactionPending: boolean; legalSeveranceAmount: number | null;
  };
} | null;

export type LeavingEmployee = { id: string; name: string; contractType: string | null; exitDate: string; termination: TerminationView };

const REASONS: Array<[string, string]> = [
  ["DEMISSION", "Démission"],
  ["LICENCIEMENT", "Licenciement"],
  ["RUPTURE_CONVENTIONNELLE", "Rupture conventionnelle"],
  ["FIN_CDD", "Fin de CDD"],
  ["FIN_PERIODE_ESSAI", "Rupture de la période d'essai"],
  ["MISE_A_LA_RETRAITE", "Mise à la retraite"],
  ["DEPART_RETRAITE", "Départ volontaire à la retraite"],
  ["AUTRE", "Autre motif"],
];

const FIELD = "mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink";
const SEVERANCE_REASONS = new Set(["LICENCIEMENT", "RUPTURE_CONVENTIONNELLE", "MISE_A_LA_RETRAITE", "DEPART_RETRAITE", "AUTRE"]);

function Save() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">{pending ? "Enregistrement…" : "Enregistrer la fiche de sortie"}</button>;
}

function Money({ name, label, value, hint }: { name: string; label: string; value: number | null | undefined; hint?: string }) {
  return (
    <label className="block text-xs font-medium text-ink-soft">
      {label}
      <input name={name} type="number" min="0" step="0.01" inputMode="decimal" defaultValue={value ?? ""} className={FIELD} />
      {hint ? <span className="mt-1 block text-[11px] font-normal leading-4 text-ink-faint">{hint}</span> : null}
    </label>
  );
}

function DateField({ name, label, value, hint }: { name: string; label: string; value: string | null | undefined; hint?: string }) {
  return (
    <label className="block text-xs font-medium text-ink-soft">
      {label}
      <input name={name} type="date" defaultValue={value ?? ""} className={FIELD} />
      {hint ? <span className="mt-1 block text-[11px] font-normal leading-4 text-ink-faint">{hint}</span> : null}
    </label>
  );
}

const NOTIFICATION_REASONS = new Set(["020", "034", "035", "036", "037", "058", "059", "087", "088"]);
const PROCEDURE_REASONS = new Set(["020", "087", "088", "091"]);

/** Partie déclarative : ce que la DSN du mois doit dire de la rupture (blocs fin de contrat et préavis). */
function DsnTerminationFields({ reason, t, severanceShown }: { reason: string; t: TerminationView; severanceShown: boolean }) {
  const dsn = t?.dsn;
  const options = DSN_END_REASONS.filter((item) => (item.reasons as readonly string[]).includes(reason));
  const [endReason, setEndReason] = useState(dsn?.endReasonCode ?? (options.length === 1 ? options[0].code : ""));
  const [noticeType, setNoticeType] = useState(dsn?.noticeTypeCode ?? (endReason === "043" ? "90" : ""));
  const current = options.some((item) => item.code === endReason) ? endReason : "";
  const noticeOptions = current === "034" || current === "035" ? DSN_NOTICE_TYPES.filter((item) => item.code === "60" || item.code === "90")
    : current === "043" ? DSN_NOTICE_TYPES.filter((item) => item.code === "90") : DSN_NOTICE_TYPES;
  if (!reason) return null;
  return (
    <div className="grid gap-4 border-t border-surface-border pt-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-xs font-semibold text-ink">Pour la DSN</p>
        <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">Ces informations déclarent la fin du contrat à France Travail et aux organismes. Reprenez les dates des courriers et de la convention.</p>
      </div>
      <label className="block text-xs font-medium text-ink-soft">Motif déclaré
        <select name="dsnEndReasonCode" required value={current} onChange={(event) => setEndReason(event.target.value)} className={FIELD}>
          <option value="">Sélectionner…</option>
          {options.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      {NOTIFICATION_REASONS.has(current) ? <DateField name="notificationDate" label="Notification de la rupture" value={dsn?.notificationDate} hint="Remise ou première présentation de la lettre, ou réception de la démission." /> : null}
      {current === "043" ? <DateField name="conventionSignatureDate" label="Signature de la convention" value={dsn?.conventionSignatureDate} /> : null}
      {PROCEDURE_REASONS.has(current) ? <DateField name="dismissalProcedureDate" label="Engagement de la procédure" value={dsn?.dismissalProcedureDate} hint="Date de la convocation à l'entretien préalable." /> : null}
      <label className="block text-xs font-medium text-ink-soft">Préavis
        <select name="noticeTypeCode" required value={noticeOptions.some((item) => item.code === noticeType) ? noticeType : ""} onChange={(event) => setNoticeType(event.target.value)} className={FIELD}>
          <option value="">Sélectionner…</option>
          {noticeOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      {noticeType && noticeType !== "90" ? (
        <>
          <DateField name="noticeStartDate" label="Début du préavis" value={dsn?.noticeStartDate} />
          <DateField name="noticeEndDate" label="Fin du préavis" value={dsn?.noticeEndDate} hint="Dernier jour du contrat, préavis effectué ou non." />
        </>
      ) : null}
      <DateField name="lastWorkedPaidDate" label="Dernier jour travaillé et payé (facultatif)" value={dsn?.lastWorkedPaidDate} hint="À renseigner si le salarié a cessé de travailler avant la fin du contrat." />
      {severanceShown && current && current !== "043" ? <Money name="legalSeveranceAmount" label="Dont indemnité légale" value={dsn?.legalSeveranceAmount} hint="Le surplus conventionnel ou contractuel est déclaré à part." /> : null}
      <label className="flex items-start gap-2 text-xs text-ink-soft sm:col-span-2 lg:col-span-3"><input type="checkbox" name="transactionPending" defaultChecked={dsn?.transactionPending ?? false} className="mt-0.5" /> Une transaction est en cours avec le salarié.</label>
    </div>
  );
}

function TerminationForm({ periodId, employee, readOnly }: { periodId: string; employee: LeavingEmployee; readOnly: boolean }) {
  const [state, action] = useFormState<TerminationFormState, FormData>(saveTermination.bind(null, periodId, employee.id), undefined);
  const t = employee.termination;
  const [reason, setReason] = useState(t?.reason ?? (employee.contractType === "CDD" ? "FIN_CDD" : ""));
  const [cddMode, setCddMode] = useState(t?.cddEndAllowanceMode ?? "AUTO");
  const isCdd = employee.contractType === "CDD";

  return (
    <form action={action} className="rounded-xl border border-surface-border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-ink">{employee.name}</p>
        <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${t ? "bg-accent-teal/10 text-accent-teal" : "bg-accent-amber/10 text-accent-amber"}`}>{t ? "Fiche renseignée" : "Fiche à renseigner"} · sortie le {employee.exitDate.split("-").reverse().join("/")}</span>
      </div>
      <fieldset disabled={readOnly} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-medium text-ink-soft">Motif de la rupture
          <select name="reason" required value={reason} onChange={(event) => setReason(event.target.value)} className={FIELD}>
            <option value="">Sélectionner…</option>
            {REASONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <Money name="noticeCompensation" label="Indemnité compensatrice de préavis" value={t?.noticeCompensation} hint="Préavis non effectué à la demande de l'employeur." />
        <Money name="paidLeaveCompensationAmount" label="Indemnité compensatrice de congés payés" value={t?.paidLeaveCompensationAmount} hint="Laissez vide : calculée sur les soldes, au plus favorable du maintien et du dixième." />
        {SEVERANCE_REASONS.has(reason) ? (
          <>
            <Money name="severanceAmount" label="Indemnité de rupture versée" value={t?.severanceAmount} />
            <Money name="severanceLegalMinimum" label="Indemnité légale ou conventionnelle" value={t?.severanceLegalMinimum} hint="Montant minimum dû pour ce motif : il reste exonéré de CSG." />
            <Money name="previousYearGross" label="Brut annuel de l'année précédente" value={t?.previousYearGross} hint="Sert au plafond d'exonération de deux fois la rémunération." />
            {reason === "RUPTURE_CONVENTIONNELLE" ? (
              <label className="flex items-start gap-2 text-xs text-ink-soft sm:col-span-2 lg:col-span-3"><input type="checkbox" name="eligibleForFullPension" defaultChecked={t?.eligibleForFullPension ?? false} className="mt-0.5" /> Le salarié peut liquider une retraite à taux plein : l&apos;indemnité est alors entièrement soumise.</label>
            ) : null}
          </>
        ) : null}
        {isCdd ? (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
            <label className="block text-xs font-medium text-ink-soft">Indemnité de fin de contrat
              <select name="cddEndAllowanceMode" value={cddMode} onChange={(event) => setCddMode(event.target.value as "AUTO" | "NONE" | "AMOUNT")} className={FIELD}>
                <option value="AUTO">Calculée (10 % du brut du contrat, sauf démission ou période d&apos;essai)</option>
                <option value="AMOUNT">Montant saisi</option>
                <option value="NONE">Non due (cas d&apos;exclusion)</option>
              </select>
            </label>
            {cddMode === "AMOUNT" ? <Money name="cddEndAllowanceAmount" label="Montant de l'indemnité" value={t?.cddEndAllowanceAmount} /> : null}
            {cddMode === "AUTO" ? (
              <label className="block text-xs font-medium text-ink-soft">Taux (%)
                <input name="cddEndAllowanceRate" type="number" min="6" max="50" step="0.01" defaultValue={t?.cddEndAllowanceRate != null ? String(t.cddEndAllowanceRate * 100) : ""} placeholder="10" className={FIELD} />
              </label>
            ) : null}
          </div>
        ) : null}
        <DsnTerminationFields key={reason} reason={reason} t={t} severanceShown={SEVERANCE_REASONS.has(reason)} />
      </fieldset>
      {state?.error ? <p role="alert" className="mt-3 rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3 py-2 text-sm text-accent-rose">{state.error}</p> : null}
      {state?.saved ? <p role="status" className="mt-3 rounded-lg border border-accent-teal/30 bg-accent-teal/10 px-3 py-2 text-sm text-accent-teal">Fiche enregistrée : elle sera prise en compte au prochain calcul.</p> : null}
      {!readOnly ? <div className="mt-4 flex justify-end"><Save /></div> : null}
    </form>
  );
}

export default function PayrollTerminationSection({ periodId, employees, readOnly, embedded = false }: { periodId: string; employees: LeavingEmployee[]; readOnly: boolean; embedded?: boolean }) {
  if (employees.length === 0) return null;
  if (embedded) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-ink">Départs</h3>
        <p className="mt-1 text-sm text-ink-soft">Le solde de tout compte est calculé avec le dernier bulletin : indemnités de congés, de préavis, de fin de contrat et de rupture, avec leur régime social et fiscal.</p>
        <div className="mt-3 space-y-4">
          {employees.map((employee) => <TerminationForm key={employee.id} periodId={periodId} employee={employee} readOnly={readOnly} />)}
        </div>
      </div>
    );
  }
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-surface-border bg-white">
      <div className="border-b border-surface-border px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">Sorties du mois</h2>
        <p className="mt-1 text-sm text-ink-soft">Le solde de tout compte est calculé avec le dernier bulletin : indemnités de congés, de préavis, de fin de contrat et de rupture, avec leur régime social et fiscal.</p>
      </div>
      <div className="space-y-4 p-5">
        {employees.map((employee) => <TerminationForm key={employee.id} periodId={periodId} employee={employee} readOnly={readOnly} />)}
      </div>
    </section>
  );
}
