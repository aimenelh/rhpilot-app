import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAbsence, validateAbsence, rejectAbsence } from "./actions";
import { Button } from "@/components/ui/Button";

const TYPE_LABELS: Record<string, string> = {
  PAID_LEAVE: "Congés payés",
  RTT: "RTT",
  SICK_LEAVE: "Maladie",
  WORK_ACCIDENT: "Accident du travail",
  UNPAID_LEAVE: "Absence sans solde",
  FAMILY_EVENT: "Événement familial",
  OTHER: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  TO_VALIDATE: "À valider",
  TO_PROVIDE_JUSTIFICATION: "Justificatif à fournir",
  TO_REVIEW_JUSTIFICATION: "Justificatif à vérifier",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};

const JUSTIFICATION_LABELS: Record<string, string> = {
  TO_PROVIDE: "À fournir",
  RECEIVED: "Reçu",
  VALIDATED: "Vérifié",
  REJECTED: "Refusé",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export const dynamic = "force-dynamic";

export default async function AbsencesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const [employees, absences] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.absence.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        justifications: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { startDate: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-6xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Gestion RH</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Absences</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Enregistrez les absences, suivez les justificatifs et validez ce qui doit ensuite être transmis à la paie.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-xl border border-surface-border bg-white p-5">
          <h2 className="font-semibold text-ink">Nouvelle absence</h2>
          <p className="mt-1 text-xs text-ink-faint">Aucune règle de paie n'est calculée ici : l'absence sera traitée par la paie après validation.</p>

          <form action={createAbsence} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-soft">Salarié</label>
              <select name="employeeId" required className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink">
                <option value="">Sélectionner…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-soft">Type</label>
              <select name="type" required className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink">
                <option value="">Sélectionner…</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-ink-soft">Du</label>
                <input name="startDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-soft">Au</label>
                <input name="endDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" />
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-surface-border bg-surface-subtle/40 p-3">
              <input name="justificationRequired" type="checkbox" className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-ink">Justificatif demandé</span>
                <span className="mt-0.5 block text-xs text-ink-faint">À cocher lorsque l'entreprise doit recevoir et vérifier un document.</span>
              </span>
            </label>

            <div>
              <label className="text-xs font-medium text-ink-soft">Note interne (optionnel)</label>
              <textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" placeholder="Informations utiles pour le suivi RH…" />
            </div>

            <Button type="submit">Enregistrer l'absence</Button>
          </form>
        </section>

        <section className="rounded-xl border border-surface-border bg-white p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink">Suivi des absences</h2>
              <p className="mt-1 text-xs text-ink-faint">Une absence validée pourra ensuite alimenter automatiquement les données de paie.</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-ink-soft">{absences.length} entrée{absences.length > 1 ? "s" : ""}</span>
          </div>

          <div className="mt-5 space-y-3">
            {absences.length === 0 ? (
              <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-ink-faint">
                Aucune absence enregistrée.
              </div>
            ) : absences.map((absence) => {
              const justification = absence.justifications[0];
              return (
                <div key={absence.id} className="rounded-lg border border-surface-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-ink">{absence.employee.firstName} {absence.employee.lastName}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {TYPE_LABELS[absence.type] ?? absence.type} · {formatDate(absence.startDate)} → {formatDate(absence.endDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-surface-subtle px-2.5 py-1 font-medium text-ink-soft">{STATUS_LABELS[absence.status] ?? absence.status}</span>
                        <span className="rounded-full bg-surface-subtle px-2.5 py-1 font-medium text-ink-soft">
                          Justificatif : {absence.justificationRequired ? (justification ? JUSTIFICATION_LABELS[justification.status] : "À fournir") : "Non demandé"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {absence.justificationRequired && justification?.status === "RECEIVED" ? (
                        <form action={async () => { "use server"; }}>
                          <button type="button" disabled className="rounded-lg border border-surface-border px-3 py-2 text-xs font-medium text-ink-faint">Justificatif reçu</button>
                        </form>
                      ) : null}
                      {absence.status === "TO_VALIDATE" ? (
                        <form action={validateAbsence.bind(null, absence.id)}>
                          <Button type="submit">Valider</Button>
                        </form>
                      ) : null}
                      {absence.status === "TO_PROVIDE_JUSTIFICATION" ? (
                        <span className="rounded-lg bg-accent-amber/10 px-3 py-2 text-xs font-medium text-accent-amber">Justificatif à fournir</span>
                      ) : null}
                      {absence.status === "TO_REVIEW_JUSTIFICATION" ? (
                        <span className="rounded-lg bg-accent-amber/10 px-3 py-2 text-xs font-medium text-accent-amber">Justificatif à vérifier</span>
                      ) : null}
                      {absence.status !== "VALIDATED" && absence.status !== "REJECTED" ? (
                        <form action={async () => { "use server"; await rejectAbsence(absence.id, "Absence refusée après vérification RH."); }}>
                          <button type="submit" className="rounded-lg border border-accent-rose/30 px-3 py-2 text-xs font-medium text-accent-rose">Refuser</button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
