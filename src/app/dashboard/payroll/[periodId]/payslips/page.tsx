import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PayrollPayslipPrepareButton from "../../PayrollPayslipPrepareButton";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  CALCULATED: "Calculée",
  REVIEW: "À contrôler",
  VALIDATED: "Validée",
  LOCKED: "Verrouillée",
};

const PAYSLIP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PREPARED: "Préparé",
  GENERATED: "Généré",
  PUBLISHED: "Publié",
};

export default async function PayrollPayslipsPage({
  params,
}: {
  params: { periodId: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id: params.periodId,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
      year: true,
      month: true,
      status: true,
    },
  });

  if (!period) notFound();

  const employees = await prisma.employee.findMany({
    where: {
      organizationId: membership.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const payslips = await prisma.payslip.findMany({
    where: {
      organizationId: membership.organizationId,
      payrollPeriodId: period.id,
    },
    select: {
      employeeId: true,
      documentStatus: true,
      generatedAt: true,
      publishedAt: true,
    },
  });

  const payslipByEmployee = new Map(payslips.map((payslip) => [payslip.employeeId, payslip]));
  const preparedCount = employees.filter((employee) => payslipByEmployee.has(employee.id)).length;
  const isLocked = period.status === "LOCKED";
  const canPrepare =
    isLocked &&
    employees.length > 0 &&
    preparedCount === employees.length &&
    (membership.accessRole === "OWNER" || membership.accessRole === "ADMIN");

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/dashboard/payroll/${period.id}`}
        className="text-sm text-ink-soft hover:text-ink"
      >
        ← Retour à la période de paie
      </Link>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Bulletins de paie</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {MONTHS[period.month - 1]} {period.year}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Les bulletins seront générés exclusivement à partir des calculs verrouillés de la période.
          </p>
        </div>
        <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-sm font-semibold text-ink-soft">
          {STATUS_LABELS[period.status] ?? period.status}
        </span>
      </div>

      {!isLocked ? (
        <section className="mt-6 rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-amber">Période non verrouillée</p>
          <p className="mt-1 font-semibold text-ink">
            Les bulletins ne peuvent pas être préparés avant le verrouillage de la période.
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Le verrouillage garantit que le document repose sur un calcul figé et traçable.
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-accent-teal/30 bg-accent-teal/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-teal">Calcul figé</p>
          <p className="mt-1 font-semibold text-ink">
            La période est verrouillée. Les données de paie ne peuvent plus être modifiées dans ce cycle.
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Étape suivante : préparer les documents individuels à partir des calculs enregistrés.
          </p>
        </section>
      )}

      <section className="mt-7 rounded-xl border border-surface-border bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">État des bulletins</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {preparedCount}/{employees.length} salarié{employees.length > 1 ? "s" : ""} dispose{employees.length > 1 ? "nt" : ""} d’un enregistrement de bulletin.
            </p>
          </div>
          <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-ink-soft">
            {preparedCount}/{employees.length}
          </span>
        </div>

        {isLocked && !canPrepare && employees.length > 0 && preparedCount < employees.length ? (
          <PayrollPayslipPrepareButton
            periodId={period.id}
            disabled={
              !isLocked ||
              membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN" ||
              employees.length === 0 ||
              preparedCount >= employees.length
            }
          />
        ) : null}

        {isLocked && preparedCount === 0 && employees.length === 0 ? (
          <p className="mt-4 rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber">
            Aucun salarié actif n’est disponible pour cette période.
          </p>
        ) : null}

        {isLocked && preparedCount === employees.length && employees.length > 0 ? (
          <div className="mt-4 rounded-lg border border-accent-teal/30 bg-accent-teal/10 px-4 py-3 text-sm text-ink">
            Tous les bulletins sont préparés. La prochaine étape sera la génération du document PDF réglementaire.
          </div>
        ) : null}
      </section>

      <section className="mt-7 overflow-hidden rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="font-semibold text-ink">Salariés</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Aucun PDF n’est considéré comme généré tant que le document réglementaire n’est pas réellement produit et stocké.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-subtle/50 text-left text-xs font-semibold text-ink-faint">
                <th className="px-5 py-3">Salarié</th>
                <th className="px-5 py-3">Statut bulletin</th>
                <th className="px-5 py-3">Préparé le</th>
                <th className="px-5 py-3">Publié le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {employees.map((employee) => {
                const payslip = payslipByEmployee.get(employee.id);
                return (
                  <tr key={employee.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {employee.position || "Poste non renseigné"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-ink-soft">
                        {PAYSLIP_STATUS_LABELS[payslip?.documentStatus ?? "DRAFT"] ?? payslip?.documentStatus ?? "Brouillon"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-soft">
                      {payslip?.generatedAt
                        ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(payslip.generatedAt)
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-ink-soft">
                      {payslip?.publishedAt
                        ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(payslip.publishedAt)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
