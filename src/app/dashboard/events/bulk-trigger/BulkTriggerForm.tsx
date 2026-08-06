"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { bulkTriggerEvents, type BulkTriggerState } from "../bulkActions";

const EXAMPLE = `Julie,Martin,2026-09-15\nKarim,Belhaj,2026-09-20`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Génération en cours..." : "Lancer la génération"}
    </Button>
  );
}

export function BulkTriggerForm({
  eventTemplates,
}: {
  eventTemplates: { key: string; label: string }[];
}) {
  const [state, formAction] = useFormState<BulkTriggerState, FormData>(bulkTriggerEvents, undefined);

  return (
    <>
      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Format attendu</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Une ligne par salarié : <code className="rounded bg-surface-subtle px-1 py-0.5 text-xs">Prénom,Nom,AAAA-MM-JJ</code>{" "}
          — le prénom et le nom doivent correspondre exactement à une fiche déjà existante.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-ink px-4 py-3 text-xs text-white">{EXAMPLE}</pre>
        <p className="mt-2 text-xs text-ink-faint">
          Si plusieurs salariés de votre organisation portent exactement le même prénom et nom,
          la ligne correspondante est ignorée et signalée comme ambiguë — jamais un choix fait au
          hasard entre deux personnes. 500 lignes maximum par envoi.
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
            <Label htmlFor="eventTemplateKey">Type d&apos;événement à déclencher</Label>
            <Select id="eventTemplateKey" name="eventTemplateKey" defaultValue="" required>
              <option value="" disabled>
                Choisir...
              </option>
              {eventTemplates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="bulkText">Salariés concernés</Label>
            <textarea
              id="bulkText"
              name="bulkText"
              rows={10}
              required
              placeholder={EXAMPLE}
              className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 font-mono text-xs text-ink focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/dashboard/events">
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </Link>
            <SubmitButton />
          </div>
        </form>
      </Card>

      {state?.successCount !== undefined && (
        <Card className="mt-4">
          <div className="flex items-center gap-2">
            <CircleCheck size={18} className="text-accent-teal" />
            <p className="text-sm font-medium text-ink">
              {state.successCount} parcours généré{state.successCount > 1 ? "s" : ""} avec succès.
            </p>
          </div>

          {state.failures.length > 0 && (
            <>
              <div className="mt-4 flex items-center gap-2">
                <TriangleAlert size={16} className="text-accent-amber" />
                <p className="text-sm font-medium text-ink">
                  {state.failures.length} ligne{state.failures.length > 1 ? "s" : ""} ignorée
                  {state.failures.length > 1 ? "s" : ""}
                </p>
              </div>
              <ul className="mt-2 flex flex-col divide-y divide-surface-border">
                {state.failures.map((f) => (
                  <li key={f.line} className="py-2 text-xs">
                    <span className="font-mono text-ink-faint">Ligne {f.line} :</span>{" "}
                    <span className="text-ink-soft">{f.input}</span>
                    <p className="mt-0.5 text-accent-rose">{f.message}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </>
  );
}
