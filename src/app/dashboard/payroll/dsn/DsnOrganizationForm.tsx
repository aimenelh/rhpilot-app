"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveDsnOrganizationSettings, type DsnFormState } from "./dsnActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? "Enregistrement…" : "Enregistrer la configuration DSN"}
    </button>
  );
}

export default function DsnOrganizationForm({ initial }: { initial: { contactName: string; contactEmail: string; contactPhone: string; declaredContactType: string; enterpriseApenCode: string } }) {
  const [state, action] = useFormState<DsnFormState, FormData>(saveDsnOrganizationSettings, undefined);
  return (
    <form action={action} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm text-ink-soft">Nom du contact DSN<input name="contactName" required defaultValue={initial.contactName} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" /></label>
      <label className="text-sm text-ink-soft">Email du contact<input name="contactEmail" type="email" required defaultValue={initial.contactEmail} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" /></label>
      <label className="text-sm text-ink-soft">Téléphone du contact<input name="contactPhone" required defaultValue={initial.contactPhone} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" /></label>
      <label className="text-sm text-ink-soft">Type de contact chez le déclaré — S20.G00.07.004
        <select name="declaredContactType" required defaultValue={initial.declaredContactType} className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink">
          <option value="">Sélectionner</option><option value="04">04 — Recouvrement Sécurité sociale / chômage / AGS</option><option value="05">05 — Recouvrement retraite complémentaire et autres</option><option value="08">08 — Contact général hors typologies 01 à 07 et 09</option><option value="01">01 — Indemnités journalières</option><option value="02">02 — Fins de contrat France Travail</option><option value="06">06 — Identification des salariés (NIR)</option><option value="07">07 — Identification établissement (SIRET)</option><option value="15">15 — Congés payés</option><option value="16">16 — Formation professionnelle</option>
        </select>
        <span className="mt-1 block text-xs leading-5 text-ink-faint">Pour un contact paie/charges sociales classique, le type 04 est généralement le plus proche. Le choix reste sous votre responsabilité déclarative.</span>
      </label>
      <label className="text-sm text-ink-soft">Code APEN de l'entreprise — S21.G00.06.003<input name="enterpriseApenCode" required defaultValue={initial.enterpriseApenCode} placeholder="6201Z" maxLength={5} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm uppercase text-ink" /><span className="mt-1 block text-xs leading-5 text-ink-faint">Code NAF de l'entreprise, distinct de l'APET de l'établissement si nécessaire.</span></label>
      <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-3"><SubmitButton /><p className="text-xs text-ink-faint">Le mode réel reste désactivé : l'export est réservé au pré-contrôle.</p></div>
      {state?.error ? <p className="md:col-span-2 lg:col-span-3 rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="md:col-span-2 lg:col-span-3 rounded-lg bg-surface-subtle px-3 py-2 text-sm text-ink-soft" role="status">{state.success}</p> : null}
    </form>
  );
}
