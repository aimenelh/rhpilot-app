import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMemberships } from "@/lib/auth";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

async function createPayrollPeriod(formData: FormData) {
  "use server";
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0];
  if (!membership) throw new Error("Organisation introuvable.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) throw new Error("Seuls les administrateurs peuvent créer une période de paie.");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Année de paie invalide.");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Mois de paie invalide.");
  await prisma.$executeRaw`
    INSERT INTO "payroll_periods" ("id", "organization_id", "year", "month")
    VALUES (${crypto.randomUUID()}, ${membership.organizationId}, ${year}, ${month})
    ON CONFLICT ("organization_id", "year", "month") DO NOTHING
  `;
  revalidatePath("/dashboard/payroll");
}

async function savePayrollProfile(formData: FormData) {
  "use server";
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0];
  if (!membership) throw new Error("Organisation introuvable.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) throw new Error("Seuls les administrateurs peuvent configurer la paie.");
  const employeeId = String(formData.get("employeeId") || "");
  const salaryEuros = Number(formData.get("salaryEuros"));
  const monthlyHours = Number(formData.get("monthlyHours") || "151.67");
  if (!employeeId || !Number.isFinite(salaryEuros) || salaryEuros < 0) throw new Error("Salaire mensuel invalide.");
  if (!Number.isFinite(monthlyHours) || monthlyHours <= 0) throw new Error("Nombre d'heures mensuelles invalide.");
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null }, select: { id: true } });
  if (!employee) throw new Error("Salarié introuvable dans votre organisation.");
  const effectiveFrom = new Date();
  effectiveFrom.setHours(0, 0, 0, 0);
  await prisma.$executeRaw`
    UPDATE "payroll_profiles"
    SET "effective_until" = ${effectiveFrom}, "updated_at" = CURRENT_TIMESTAMP
    WHERE "organization_id" = ${membership.organizationId}
      AND "employee_id" = ${employee.id}
      AND "effective_until" IS NULL
      AND "effective_from" < ${effectiveFrom}
  `;
  await prisma.$executeRaw`
    INSERT INTO "payroll_profiles" ("id", "organization_id", "employee_id", "base_salary_cents", "monthly_hours", "effective_from")
    VALUES (${crypto.randomUUID()}, ${membership.organizationId}, ${employee.id}, ${Math.round(salaryEuros * 100)}, ${monthlyHours}, ${effectiveFrom})
    ON CONFLICT ("organization_id", "employee_id", "effective_from") DO UPDATE SET
      "base_salary_cents" = EXCLUDED."base_salary_cents",
      "monthly_hours" = EXCLUDED."monthly_hours",
      "updated_at" = CURRENT_TIMESTAMP
  `;
  revalidatePath("/dashboard/payroll");
}

function formatEuros(cents: number | null) {
  if (cents === null) return "Non renseigné";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function PayrollPage() {
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0];
  if (!membership) return null;
  const [periods, employees, profileRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; year: number; month: number; status: string }>>`
      SELECT "id", "year", "month", "status" FROM "payroll_periods"
      WHERE "organization_id" = ${membership.organizationId}
      ORDER BY "year" DESC, "month" DESC LIMIT 12
    `,
    prisma.employee.findMany({ where: { organizationId: membership.organizationId, deletedAt: null }, select: { id: true, firstName: true, lastName: true, position: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.$queryRaw<Array<{ employee_id: string; base_salary_cents: number | null; monthly_hours: number | null }>>`
      SELECT DISTINCT ON ("employee_id") "employee_id", "base_salary_cents", CAST("monthly_hours" AS DOUBLE PRECISION) AS "monthly_hours"
      FROM "payroll_profiles"
      WHERE "organization_id" = ${membership.organizationId}
        AND ("effective_until" IS NULL OR "effective_until" >= CURRENT_DATE)
      ORDER BY "employee_id", "effective_from" DESC
    `,
  ]);
  const profileByEmployee = new Map(profileRows.map((row) => [row.employee_id, row]));
  const configuredCount = employees.filter((employee) => profileByEmployee.has(employee.id)).length;
  const now = new Date();
  const currentPeriod = periods.find((period) => period.year === now.getFullYear() && period.month === now.getMonth() + 1);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Paie</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Préparer et sécuriser la paie</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">Le socle paie est en place. On commence par les profils salariés et les périodes, avant de brancher les règles sociales officielles et les calculs complets.</p>
        </div>
        <form action={createPayrollPeriod} className="flex items-center gap-2 rounded-xl border border-surface-border bg-white p-2 shadow-sm">
          <select name="month" defaultValue={String(now.getMonth() + 1)} className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink">{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
          <input name="year" type="number" defaultValue={now.getFullYear()} min="2000" max="2100" className="w-24 rounded-lg border border-surface-border px-3 py-2 text-sm text-ink" />
          <button type="submit" className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">Ouvrir la période</button>
        </form>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Salariés actifs</p><p className="mt-2 text-2xl font-semibold text-ink">{employees.length}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Profils paie configurés</p><p className="mt-2 text-2xl font-semibold text-ink">{configuredCount}/{employees.length}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Période en cours</p><p className="mt-2 text-2xl font-semibold text-ink">{currentPeriod ? currentPeriod.status : "À ouvrir"}</p></div>
      </div>
      <section className="mt-7 rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4"><h2 className="font-semibold text-ink">Profils de paie</h2><p className="mt-1 text-xs text-ink-faint">Le salaire est historisé par date d'effet. Une modification ne réécrit pas les périodes déjà verrouillées.</p></div>
        <div className="divide-y divide-surface-border">
          {employees.length === 0 && <p className="px-5 py-8 text-sm text-ink-soft">Ajoutez d'abord vos salariés pour commencer la configuration paie.</p>}
          {employees.map((employee) => {
            const profile = profileByEmployee.get(employee.id);
            return <div key={employee.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0"><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="text-xs text-ink-faint">{employee.position || "Poste non renseigné"}</p></div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm text-ink-soft"><span className="text-xs text-ink-faint">Salaire : </span>{formatEuros(profile?.base_salary_cents ?? null)}</div>
                <div className="text-sm text-ink-soft"><span className="text-xs text-ink-faint">Heures : </span>{profile?.monthly_hours ?? "Non renseigné"}</div>
                <form action={savePayrollProfile} className="flex items-center gap-2">
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <input name="salaryEuros" type="number" min="0" step="0.01" placeholder="Salaire brut mensuel" required className="w-44 rounded-lg border border-surface-border px-3 py-2 text-sm text-ink" />
                  <input name="monthlyHours" type="number" min="1" step="0.01" defaultValue="151.67" className="w-28 rounded-lg border border-surface-border px-3 py-2 text-sm text-ink" aria-label="Heures mensuelles" />
                  <button type="submit" className="rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle">Enregistrer</button>
                </form>
              </div>
            </div>;
          })}
        </div>
      </section>
      <section className="mt-7 rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4"><h2 className="font-semibold text-ink">Périodes de paie</h2><p className="mt-1 text-xs text-ink-faint">Cycle prévu : brouillon → calculée → contrôle → validée → verrouillée.</p></div>
        <div className="divide-y divide-surface-border">
          {periods.length === 0 && <p className="px-5 py-8 text-sm text-ink-soft">Aucune période ouverte pour le moment.</p>}
          {periods.map((period) => <div key={period.id} className="flex items-center justify-between px-5 py-4"><p className="font-medium text-ink">{MONTHS[period.month - 1]} {period.year}</p><span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-ink-soft">{period.status}</span></div>)}
        </div>
      </section>
    </div>
  );
}
