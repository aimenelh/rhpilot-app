"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Field";
import { importEmployeesCsv } from "../importActions";

const EXAMPLE = `prenom,nom,civilite,poste,date_embauche,type_contrat,duree_periode_essai,unite_duree,prochaine_visite_medicale
Julie,Martin,MME,Comptable,2026-01-15,CDI,3,MONTHS,
Karim,Belhaj,M,Apprenti technicien,2026-06-01,APPRENTISSAGE,45,DAYS,`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Import en cours..." : "Importer"}
    </Button>
  );
}

export default function ImportEmployeesPage() {
  const [state, formAction] = useFormState(importEmployeesCsv, undefined);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Importer des salariés</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Collez le contenu d&apos;un fichier CSV au format RH Pilot — pratique pour démarrer
        avec plusieurs salariés d&apos;un coup plutôt que de créer chaque fiche
        individuellement.
      </p>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Format attendu</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Une première ligne d&apos;en-têtes, puis une ligne par salarié. Seuls{" "}
          <code className="rounded bg-surface-subtle px-1 py-0.5 text-xs">prenom</code>,{" "}
          <code className="rounded bg-surface-subtle px-1 py-0.5 text-xs">nom</code> et{" "}
          <code className="rounded bg-surface-subtle px-1 py-0.5 text-xs">date_embauche</code>{" "}
          (format AAAA-MM-JJ) sont obligatoires — le reste peut rester vide.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-ink px-4 py-3 text-xs text-white">
          {EXAMPLE}
        </pre>
        <p className="mt-2 text-xs text-ink-faint">
          civilite : MME, M ou AUTRE · type_contrat : CDI, CDD, APPRENTISSAGE ou
          PROFESSIONNALISATION · unite_duree : DAYS, WEEKS ou MONTHS. Une ligne mal formée est
          ignorée individuellement — le reste de l&apos;import continue normalement.
        </p>
      </Card>

      <Card className="mt-4">
        <form action={formAction} className="flex flex-col gap-4">
          {state?.error && (
            <p
              role="alert"
              className="rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose"
            >
              {state.error}
            </p>
          )}
          <div>
            <Label htmlFor="csvText">Contenu du fichier CSV</Label>
            <textarea
              id="csvText"
              name="csvText"
              rows={10}
              required
              placeholder={EXAMPLE}
              className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 font-mono text-xs text-ink focus-visible:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/employees">
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </Link>
            <SubmitButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
