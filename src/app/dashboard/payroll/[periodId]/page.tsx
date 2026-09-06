import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function formatEuros(cents: number | null) {
  if (cents === null) return "Non renseigné";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDecimal(value: unknown) {
  if (value === null || value === undefined) return "Non renseigné";
  return String(value);
}

export default async function PayrollPeriodPage({
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
  });

  if (!period) notFound();

  const [employees, profiles, calculations] = await Promise.all([
    prisma.employee.findMany({
      where: {
        organizationId: membership.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        contractType: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.payrollProfile.findMany({
      where: {
        organizationId: membership.organizationId,
        effectiveFrom: { lte: new Date(period.year, period.month, 0) },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: new Date(period.year, period.month - 1, 1) } },
        ],
      },
      select: {
        employeeId: true,
        baseSalaryCents: true,
        monthlyHours: true,
        effectiveFrom: true,
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.payrollCalculation.findMany({
      where: {
        organizationId: membership.organizationId,
        payrollPeriodId: period.id,
      },
      select: {
        employeeId: true,
        grossAmount: true,
        employeeContributions: true,
        employerContributions: true,
        netBeforeTax: true,
        withholdingTax: true,
        netPaid: true,
      },
    }),
  ]);

  const profileByEmployee = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) {
    if (!profileByEmployee.has(profile.employeeId)) profileByEmployee.set(profile.employeeId, profile);
  }

  const calculationByEmployee = new Map<string, (typeof calculations)[number]>();
  for (const calculation of calculations) {
    calculationByEmployee.set(calculation.employeeId, calculation);
  }

  const configuredCount = employees.filter((employee) => profileByEmployee.has(employee.id)).length;
  const calculatedCount = employees.filter((employee) => calculationByEmployee.has(employee.id)).length;
  const missingProfileCount = employees.length - configuredCount;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/payroll" className="text-sm text-ink-soft hover:text-ink">
        ← Retour à la paie
      </Link>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Période de paie</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {MONTHS[period.month - 1]} {period.year}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Cycle : brouillon → calculée → contrôle → validée → verrouillée.
          </p>
        </div>
        <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-sm font-semibold text-ink-soft">
          {STATUS_LABELS[period.status] ?? period.status}
        </span>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <p className="text-xs text-ink-faint">Salariés actifs</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{employees.length}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <p className="text-xs text-ink-faint">Profils paie disponibles</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{configuredCount}/{employees.length}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <p className="text-xs text-ink-faint">Calculs enregistrés</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{calculatedCount}/{employees.length}</p>
        </div>
      </div>

      {missingProfileCount > 0 && (
        <div className="mt-6 rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-3 text-sm text-ink">
          <p className="font-semibold">{missingProfileCount} salarié{missingProfileCount > 1 ? "s" : ""} sans profil de paie</p>
          <p className="mt-1 text-ink-soft">
            Complétez le profil paie de chaque salarié avant de lancer un calcul. RH Pilot ne doit pas estimer une donnée absente.
          </p>
        </div>
      )}

      <section className="mt-7 overflow-hidden rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="font-semibold text-ink">Salariés de la période</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Cette vue prépare le contrôle de paie. Aucun calcul n&apos;est inventé lorsqu&apos;une donnée réglementaire ou salarié manque.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-subtle/50 text-left text-xs font-semibold text-ink-faint">
                <th className="px-5 py-3">Salarié</th>
                <th className="px-5 py-3">Contrat</th>
                <th className="px-5 py-3">Brut de référence</th>
                <th className="px-5 py-3">Heures</th>
                <th className="px-5 py-3">Calcul</th>
                <th className="px-5 py-3">Net avant impôt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {employees.map((employee) => {
                const profile = profileByEmployee.get(employee.id);
                const calculation = calculationByEmployee.get(employee.id);
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
                    <td className="px-5 py-4 text-ink-soft">{employee.contractType ?? "Non renseigné"}</td>
                    <td className="px-5 py-4 text-ink-soft">{formatEuros(profile?.baseSalaryCents ?? null)}</td>
                    <td className="px-5 py-4 text-ink-soft">{formatDecimal(profile?.monthlyHours)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          calculation
                            ? "bg-accent-teal/10 text-accent-teal"
                            : "bg-surface-subtle text-ink-faint"
                        }`}
                      >
                        {calculation ? "Disponible" : "À calculer"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-ink">
                      {calculation?.netBeforeTax ? String(calculation.netBeforeTax) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Contrôles</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-surface-border bg-surface-subtle/40 p-4">
            <p className="text-xs text-ink-faint">Profils manquants</p>
            <p className="mt-1 text-lg font-semibold text-ink">{missingProfileCount}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-subtle/40 p-4">
            <p className="text-xs text-ink-faint">Calculs manquants</p>
            <p className="mt-1 text-lg font-semibold text-ink">{employees.length - calculatedCount}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-subtle/40 p-4">
            <p className="text-xs text-ink-faint">Étape suivante</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {missingProfileCount > 0 ? "Compléter les profils" : "Préparer les variables"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
