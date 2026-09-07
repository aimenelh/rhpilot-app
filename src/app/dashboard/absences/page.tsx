import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  validateAbsence,
  rejectAbsence,
  uploadAbsenceJustification,
  validateAbsenceJustification,
  rejectAbsenceJustification,
} from "./actions";
import AbsenceCreateForm from "./AbsenceCreateForm";
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

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
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
          <p className="mt-1 text-xs text-ink-faint">
            Une absence validée pourra ensuite alimenter automatiquement la paie.
          </p>
          <AbsenceCreateForm employees={employees} />
        </section>

        <section className="rounded-xl border border-surface-border bg-white p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink">Suivi des absences</h2>
              <p className="mt-1 text-xs text-ink-faint">
                Le justificatif est vérifié avant que l'absence puisse être validée.
              </p>
            </div>
            <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-ink-soft">
              {absences.length} entrée{absences.length > 1 ? "s" : ""}
            </span>
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
                    <div className="min-w-0">
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

                      {absence.justificationRequired && justification?.storageKey ? (
                        <div className="mt-3 rounded-lg bg-surface-subtle p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ink">{justification.fileName ?? "Justificatif"}</p>
                              <p className="text-xs text-ink-faint">{justification.mimeType} · {formatSize(justification.sizeBytes)}</p>
                            </div>
                            <a
                              href={`/api/absences/justifications/${justification.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-xs font-semibold text-brand-primary hover:underline"
                            >
                              Ouvrir le document
                            </a>
                          </div>

                          {justification.status === "RECEIVED" || justification.status === "REJECTED" ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <form action={validateAbsenceJustification.bind(null, justification.id)}>
                                <Button type="submit">Vérifier</Button>
                              </form>
                              <form action={async (formData) => {
                                "use server";
                                const reason = String(formData.get("reason") ?? "").trim();
                                await rejectAbsenceJustification(justification.id, reason);
                              }} className="flex flex-wrap gap-2">
                                <input
                                  name="reason"
                                  className="min-w-[220px] rounded-lg border border-surface-border px-3 py-2 text-xs outline-none focus:border-brand-primary"
                                  placeholder="Motif du refus"
                                  required
                                />
                                <button type="submit" className="rounded-lg border border-accent-rose/30 px-3 py-2 text-xs font-medium text-accent-rose">
                                  Refuser
                                </button>
                              </form>
                            </div>
                          ) : null}

                          {justification.status === "VALIDATED" ? (
                            <p className="mt-2 text-xs font-medium text-accent-green">Justificatif vérifié. L'absence peut maintenant être validée.</p>
                          ) : null}
                          {justification.status === "REJECTED" && justification.rejectionReason ? (
                            <p className="mt-2 text-xs text-accent-rose">Motif : {justification.rejectionReason}</p>
                          ) : null}
                        </div>
                      ) : null}

                      {absence.status === "TO_PROVIDE_JUSTIFICATION" && absence.justificationRequired ? (
                        <form action={uploadAbsenceJustification} encType="multipart/form-data" className="mt-3 rounded-lg border border-dashed border-surface-border p-3">
                          <input type="hidden" name="absenceId" value={absence.id} />
                          <label className="block text-xs font-medium text-ink">Déposer le justificatif</label>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="block w-full text-xs text-ink-soft" />
                            <Button type="submit">Déposer</Button>
                          </div>
                          <p className="mt-2 text-[11px] text-ink-faint">PDF, JPG ou PNG · 10 Mo maximum</p>
                        </form>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {absence.status === "TO_VALIDATE" ? (
                        <form action={validateAbsence.bind(null, absence.id)}>
                          <Button type="submit">Valider l'absence</Button>
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
