"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Field";
import { importEmployeesCsv } from "../importActions";

const EXAMPLE = `prenom,nom,civilite,poste,categorie_professionnelle,date_embauche,type_contrat,date_fin_contrat,heures_hebdomadaires,lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche,salaire_brut_mensuel,duree_periode_essai,unite_duree,prochaine_visite_medicale
Julie,Martin,MME,Comptable,EMPLOYE,2026-01-15,CDI,,35,7,7,7,7,7,0,0,2300,2,MONTHS,
Karim,Belhaj,M,Apprenti technicien,EMPLOYE,2026-06-01,APPRENTISSAGE,2028-05-31,35,7,7,7,7,7,0,0,1850,45,DAYS,`;

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
        Collez le contenu d’un fichier CSV au format RH Pilot pour créer plusieurs fiches
        salariés en une seule fois.
      </p>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Format attendu</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Une première ligne d&apos;en-têtes, puis une ligne par salarié. Seuls{" "}
          <code className="rounded bg-surface-subtle px-1 py-0.5 text-xs">prenom</code>,{" "}
          <code className="rounded bg-surface-subtle px-1 py-0.5 text-xs">nom</code> et{" "}
          <code className="rounded bg-surface-subtle px-1 py-0.5 text-xs">date_embauche</code>{" "}
          (format AAAA-MM-JJ) restent obligatoires pour conserver la compatibilité avec les anciens fichiers. Pour un démarrage complet, ajoutez le contrat, la catégorie et le temps de travail.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-ink px-4 py-3 text-xs text-white">
          {EXAMPLE}
        </pre>
        <p className="mt-2 text-xs text-ink-faint">
          civilite : MME, M ou AUTRE · categorie_professionnelle : CADRE, AGENT_DE_MAITRISE,
          EMPLOYE, OUVRIER ou AUTRE · type_contrat : CDI, CDD, APPRENTISSAGE ou
          PROFESSIONNALISATION · heures_hebdomadaires : ex. 35, 39 ou 24 · lundi à dimanche :
          heures prévues chaque jour · salaire_brut_mensuel : facultatif · unite_duree : DAYS,
          WEEKS ou MONTHS. Si le temps de travail manque, le salarié est importé et signalé comme à
          compléter. Aucune durée de 35 h n’est appliquée par défaut.
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
