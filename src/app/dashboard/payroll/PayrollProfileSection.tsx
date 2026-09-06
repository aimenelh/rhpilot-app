"use client";

import { useActionState } from "react";

import { saveEmployeePayrollProfile, type PayrollProfileFormState } from "./employeeActions";

type AgreementOption = {
  id: string;
  idcc: string;
  name: string;
};

type PayrollProfileView = {
  baseSalaryCents: number | null;
  monthlyHours: string | null;
  collectiveAgreementId: string | null;
  classificationCode: string | null;
  classificationLabel: string | null;
  level: string | null;
  coefficient: string | null;
  seniorityDate: string | null;
  effectiveFrom: string;
};

function formatSalary(cents: number | null) {
  if (cents === null) return "Non renseigné";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function PayrollProfileSection({
  employeeId,
  firstName,
  profile,
  agreements,
  canEdit,
}: {
  employeeId: string;
  firstName: string;
  profile: PayrollProfileView | null;
  agreements: AgreementOption[];
  canEdit: boolean;
}) {
  const action = saveEmployeePayrollProfile.bind(null, employeeId);
  const [state, formAction, pending] = useActionState<PayrollProfileFormState, FormData>(action, undefined);

  const effectiveFrom = profile?.effectiveFrom ?? new Date().toISOString().slice(0, 10);

  return (
    <section className="mt-8 rounded-xl border border-surface-border bg-white">
      <div className="border-b border-surface-border px-5 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">Paie</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Profil de rémunération historisé. Les futures évolutions créent une nouvelle date d&apos;effet au lieu d&apos;écraser l&apos;historique.
            </p>
          </div>
          {profile && (
            <span className="text-xs text-ink-faint">
              Profil actuel · effet le {new Intl.DateTimeFormat("fr-FR").format(new Date(profile.effectiveFrom))}
            </span>
          )}
        </div>
      </div>

      {!canEdit ? (
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-ink-faint">Brut mensuel</p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatSalary(profile?.baseSalaryCents ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Heures mensuelles</p>
            <p className="mt-1 text-sm font-semibold text-ink">{profile?.monthlyHours ?? "Non renseigné"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Convention collective</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {agreements.find((agreement) => agreement.id === profile?.collectiveAgreementId)?.name ?? "Convention non renseignée"}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Classification</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {[profile?.classificationLabel, profile?.level, profile?.coefficient].filter(Boolean).join(" · ") || "Non renseignée"}
            </p>
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-5 px-5 py-5">
          {state?.error && (
            <div role="alert" className="rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3 py-2 text-sm text-accent-rose">
              {state.error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Salaire brut mensuel</span>
              <input
                name="salaryEuros"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={profile?.baseSalaryCents != null ? (profile.baseSalaryCents / 100).toFixed(2) : ""}
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Heures mensuelles</span>
              <input
                name="monthlyHours"
                type="number"
                min="1"
                step="0.01"
                required
                defaultValue={profile?.monthlyHours ?? "151.67"}
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Date d&apos;effet</span>
              <input
                name="effectiveFrom"
                type="date"
                required
                defaultValue={effectiveFrom.slice(0, 10)}
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Date d&apos;ancienneté</span>
              <input
                name="seniorityDate"
                type="date"
                defaultValue={profile?.seniorityDate?.slice(0, 10) ?? ""}
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-ink-soft">Convention collective</span>
              <select
                name="collectiveAgreementId"
                defaultValue={profile?.collectiveAgreementId ?? ""}
                className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="">Utiliser la convention de l&apos;organisation / non renseignée</option>
                {agreements.map((agreement) => (
                  <option key={agreement.id} value={agreement.id}>
                    {agreement.idcc} — {agreement.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Code de classification</span>
              <input name="classificationCode" defaultValue={profile?.classificationCode ?? ""} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink" />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Intitulé de classification</span>
              <input name="classificationLabel" defaultValue={profile?.classificationLabel ?? ""} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink" />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Niveau</span>
              <input name="level" defaultValue={profile?.level ?? ""} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink" />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Coefficient</span>
              <input name="coefficient" defaultValue={profile?.coefficient ?? ""} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink" />
            </label>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-brand-primary/15 bg-brand-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-ink-soft">
              Ces informations serviront de base aux contrôles de paie. Les règles légales et conventionnelles restent calculées depuis les référentiels versionnés.
            </p>
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Enregistrement…" : `Enregistrer le profil de ${firstName}`}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
