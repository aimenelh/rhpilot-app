"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { publishPayslipsAction, type PublishPayslipsResult } from "../publishPayslipsAction";

export type PublishPanelData = {
  periodId: string;
  generated: number;
  toPublish: number;
  published: number;
  withSpace: number;
  withoutSpace: Array<{ id: string; name: string; invited: boolean }>;
  paper: Array<{ id: string; name: string }>;
  /** Pas encore informés du bulletin électronique, ou depuis moins d'un mois (C. trav. art. D3243-7). */
  notInformed: Array<{ id: string; name: string; availableFrom: string | null }>;
  bundleUrl: string;
};

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const dayLabel = (iso: string) => DAY.format(new Date(`${iso}T00:00:00Z`));

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

function resultText(result: Extract<PublishPayslipsResult, { ok: true }>): string {
  const parts: string[] = [];
  if (result.published > 0) parts.push(`${plural(result.published, "bulletin publié", "bulletins publiés")}`);
  if (result.replaced > 0) parts.push(`${plural(result.replaced, "bulletin corrigé", "bulletins corrigés")}`);
  if (result.unchanged > 0 && parts.length === 0) parts.push("Tous les bulletins étaient déjà à jour");
  const notes: string[] = [];
  if (result.notified > 0) notes.push(`${plural(result.notified, "salarié prévenu", "salariés prévenus")} par e-mail`);
  if (result.withoutSpace > 0) notes.push(`${plural(result.withoutSpace, "salarié n'a", "salariés n'ont")} pas encore activé ${result.withoutSpace > 1 ? "leur" : "son"} espace`);
  if (result.failedEmails > 0) notes.push(`${plural(result.failedEmails, "e-mail n'est pas parti", "e-mails ne sont pas partis")}`);
  if (result.notInformed > 0) notes.push(`${plural(result.notInformed, "salarié attend", "salariés attendent")} encore la note d'information : bulletin à remettre sur papier`);
  if (result.failed > 0) notes.push(`${plural(result.failed, "bulletin n'a pas pu être publié", "bulletins n'ont pas pu être publiés")} : régénérez les PDF puis relancez la mise à disposition`);
  return `${parts.join(", ")}.${notes.length > 0 ? ` ${notes.join(", ")}.` : ""}`;
}

/** Mise à disposition des bulletins dans l'espace salarié, après leur production. */
export default function PublishPayslipsPanel({ data }: { data: PublishPanelData }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PublishPayslipsResult | null>(null);
  const done = data.toPublish === 0 && data.published > 0;

  const publish = () => startTransition(async () => { setResult(await publishPayslipsAction(data.periodId)); });

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <h3 className="font-semibold text-ink">Mettre à disposition des salariés</h3>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {done
              ? `Les bulletins du mois sont dans l'espace des salariés.`
              : `Chaque bulletin est déposé dans l'espace du salarié, qui reçoit un e-mail sans pièce jointe. La mise à disposition et chaque ouverture sont journalisées.`}
          </p>
        </div>
        <button type="button" onClick={publish} disabled={pending || data.toPublish === 0} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {pending ? "Publication…" : data.toPublish > 0 ? `Mettre à disposition (${data.toPublish})` : done ? "Déjà publiés" : "Rien à publier"}
        </button>
      </div>

      <ul className="mt-4 space-y-2 border-t border-surface-border pt-4 text-sm text-ink-soft">
        <li>{plural(data.withSpace, "salarié a", "salariés ont")} un espace activé et {data.withSpace > 1 ? "seront prévenus" : "sera prévenu"} par e-mail.</li>
        {data.withoutSpace.length > 0 ? (
          <li>
            Sans espace activé : {data.withoutSpace.map((employee, index) => (
              <span key={employee.id}>{index > 0 ? ", " : ""}<Link href={`/dashboard/employees/${employee.id}?onglet=espace`} className="font-medium text-ink hover:underline">{employee.name}</Link>{employee.invited ? " (invité)" : ""}</span>
            ))}. Leurs bulletins les attendront dans leur espace ; d&apos;ici là, remettez-les autrement.
          </li>
        ) : null}
        {data.notInformed.length > 0 ? (
          <li>
            Note d&apos;information pas encore remise, ou remise il y a moins d&apos;un mois : {data.notInformed.map((employee, index) => (
              <span key={employee.id}>{index > 0 ? ", " : ""}<Link href={`/dashboard/employees/${employee.id}?onglet=espace`} className="font-medium text-ink hover:underline">{employee.name}</Link>{employee.availableFrom ? ` (en ligne à partir du ${dayLabel(employee.availableFrom)})` : ""}</span>
            ))}. Le premier bulletin électronique suit d&apos;un mois la remise de la note (C. trav. art. D3243-7) : ce mois-ci, <a href={data.bundleUrl} className="font-semibold text-brand-primary hover:underline">remettez-le sur papier</a>.
          </li>
        ) : null}
        {data.paper.length > 0 ? (
          <li>
            Bulletin papier : {data.paper.map((employee) => employee.name).join(", ")}. Leurs bulletins ne sont pas publiés en ligne : <a href={data.bundleUrl} className="font-semibold text-brand-primary hover:underline">téléchargez le PDF du mois</a> pour les imprimer.
          </li>
        ) : null}
      </ul>

      {result ? (
        <p role="status" className={`mt-4 rounded-lg px-3 py-2 text-sm ${"error" in result ? "bg-accent-rose/5 text-accent-rose" : "bg-accent-teal/5 text-ink"}`}>
          {"error" in result ? result.error : resultText(result)}
        </p>
      ) : null}
    </div>
  );
}
