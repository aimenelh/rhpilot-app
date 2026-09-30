"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { DsnComplementaryAffiliation } from "@/lib/payroll/dsn-complementary-affiliations";
import { saveDsnComplementaryAffiliations } from "./dsnActions";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Enregistrement…" : "Enregistrer les affiliations"}</button>;
}
function Coverage({ coverage, initial }: { coverage: "SANTE" | "PREVOYANCE"; initial?: DsnComplementaryAffiliation }) {
  const [enabled, setEnabled] = useState(Boolean(initial));
  const fields = [
    ["organismCode", "Code organisme", true, "text"], ["contractReference", "Référence du contrat", true, "text"],
    ["delegateCode", "Code délégataire (si indiqué)", false, "text"], ["populationCode", "Code population (si indiqué)", false, "text"],
    ["optionCode", "Code option (si indiqué)", false, "text"], ["validFrom", "Début de l'affiliation", true, "date"],
    ["validUntil", "Fin de l'affiliation (si connue)", false, "date"], ["sourceReference", "Référence et version de la fiche de paramétrage", true, "text"],
  ] as const;
  return <fieldset className="rounded-xl border border-surface-border p-4">
    <label className="flex items-center gap-2 font-medium text-ink"><input type="checkbox" name={coverage + ".enabled"} value="1" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />{coverage === "SANTE" ? "Mutuelle santé" : "Prévoyance"}</label>
    {enabled && <><div className="mt-4 grid gap-4 sm:grid-cols-2">{fields.map(([name, label, required, type]) => <label key={name} className="text-sm text-ink-soft">{label}<input name={coverage + "." + name} type={type} required={required} defaultValue={initial?.[name] ?? ""} maxLength={name === "sourceReference" ? 200 : name === "organismCode" ? 9 : name === "delegateCode" ? 6 : 30} className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-ink" /></label>)}</div>
    <label className="mt-4 flex items-start gap-2 text-sm text-ink-soft"><input type="checkbox" name={coverage + ".confirmed"} value="1" required className="mt-1" />{coverage === "SANTE" ? "La fiche prévoit le composant 20 (montant forfaitaire) et un paiement mensuel." : "La fiche prévoit les composants 11 (tranche A) et 24 (tranche 2 unifiée), et un paiement mensuel."}</label></>}
  </fieldset>;
}
export default function DsnComplementaryForm({ employeeId, initial }: { employeeId: string; initial: DsnComplementaryAffiliation[] }) {
  const [state, action] = useFormState(saveDsnComplementaryAffiliations.bind(null, employeeId), undefined);
  return <form action={action} className="space-y-4 rounded-xl border border-surface-border bg-white p-6">
    <h2 className="text-lg font-semibold text-ink">Affiliations mutuelle et prévoyance</h2>
    <p className="text-sm leading-6 text-ink-soft">Recopiez les références de la fiche de paramétrage fournie par votre organisme. Elles doivent correspondre à la couverture utilisée sur le bulletin. Les paiements trimestriels, les autres composants et les changements en cours de mois restent à traiter avant export.</p>
    <Coverage coverage="SANTE" initial={initial.find((item) => item.coverage === "SANTE")} />
    <Coverage coverage="PREVOYANCE" initial={initial.find((item) => item.coverage === "PREVOYANCE")} />
    {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state?.success && <p role="status" className="text-sm text-green-700">{state.success}</p>}
    <Submit />
  </form>;
}
