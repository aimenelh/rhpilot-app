import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  FileText,
  FlaskConical,
  Settings2,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentMemberships } from "@/lib/auth";
import PayrollReopenInlineButton from "./PayrollReopenInlineButton";
import { prepareDemoPayrollData } from "./demoPayrollActions";
import { DemoPayrollSetupButton } from "./DemoPayrollSetupButton";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const PAYROLL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "À préparer",
  CALCULATED: "Calculée",
  REVIEW: "À contrôler",
  VALIDATED: "À clôturer",
  LOCKED: "Clôturée",
};

async function createPayrollPeriod(formData: FormData) {
  "use server";
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0];
  if (!membership) throw new Error("Organisation introuvable.");
  if (membership.accessRole !== "OWNER") throw new Error("Le module Paie est actuellement réservé à l'aperçu propriétaire.");

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Année de paie invalide.");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Mois de paie invalide.");

  await prisma.payrollPeriod.upsert({
    where: { organizationId_year_month: { organizationId: membership.organizationId, year, month } },
    create: { id: crypto.randomUUID(), organizationId: membership.organizationId, year, month, status: "DRAFT" },
    update: {},
  });

  revalidatePath("/dashboard/payroll");
}

async function savePayrollProfile(formData: FormData) {
  "use server";
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0];
  if (!membership) throw new Error("Organisation introuvable.");
  if (membership.accessRole !== "OWNER") throw new Error("Le module Paie est actuellement réservé à l'aperçu propriétaire.");

  const employeeId = String(formData.get("employeeId") || "");
  const salaryEuros = Number(formData.get("salaryEuros"));
  const monthlyHours = Number(formData.get("monthlyHours") || "151.67");
  if (!employeeId || !Number.isFinite(salaryEuros) || salaryEuros < 0) throw new Error("Salaire mensuel invalide.");
  if (!Number.isFinite(monthlyHours) || monthlyHours <= 0) throw new Error("Nombre d'heures mensuelles invalide.");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) throw new Error("Salarié introuvable dans votre organisation.");

  const effectiveFrom = new Date();
  effectiveFrom.setHours(0, 0, 0, 0);
  await prisma.payrollProfile.updateMany({
    where: { organizationId: membership.organizationId, employeeId: employee.id, effectiveUntil: null, effectiveFrom: { lt: effectiveFrom } },
    data: { effectiveUntil: effectiveFrom, updatedAt: new Date() },
  });
  await prisma.payrollProfile.upsert({
    where: { organizationId_employeeId_effectiveFrom: { organizationId: membership.organizationId, employeeId: employee.id, effectiveFrom } },
    create: { id: crypto.randomUUID(), organizationId: membership.organizationId, employeeId: employee.id, payFrequency: "MONTHLY", currency: "EUR", baseSalaryCents: Math.round(salaryEuros * 100), monthlyHours, effectiveFrom },
    update: { baseSalaryCents: Math.round(salaryEuros * 100), monthlyHours, updatedAt: new Date() },
  });
  revalidatePath("/dashboard/payroll");
}

function formatEuros(cents: number | null) {
  if (cents === null) return "Non renseigné";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}

function statusClasses(status: string) {
  if (status === "LOCKED") return "bg-accent-teal/10 text-accent-teal";
  if (status === "VALIDATED" || status === "REVIEW") return "bg-accent-amber/10 text-accent-amber";
  if (status === "CALCULATED") return "bg-blue-50 text-blue-700";
  return "bg-surface-subtle text-ink-soft";
}

export default async function PayrollPage() {
  const { memberships } = await getCurrentMemberships();
  const membership = memberships[0];
  if (!membership) return null;

  const [periods, employees, profileRows] = await Promise.all([
    prisma.payrollPeriod.findMany({ where: { organizationId: membership.organizationId }, select: { id: true, year: true, month: true, status: true }, orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 }),
    prisma.employee.findMany({ where: { organizationId: membership.organizationId, deletedAt: null }, select: { id: true, firstName: true, lastName: true, position: true, isDemoData: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.payrollProfile.findMany({ where: { organizationId: membership.organizationId, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }] }, select: { employeeId: true, baseSalaryCents: true, monthlyHours: true, effectiveFrom: true }, orderBy: [{ employeeId: "asc" }, { effectiveFrom: "desc" }] }),
  ]);

  const profileByEmployee = new Map<string, (typeof profileRows)[number]>();
  for (const profile of profileRows) if (!profileByEmployee.has(profile.employeeId)) profileByEmployee.set(profile.employeeId, profile);
  const configuredCount = employees.filter((employee) => profileByEmployee.has(employee.id)).length;
  const demoOnly = employees.length > 0 && employees.every((employee) => employee.isDemoData);
  const now = new Date();
  const activePeriod = periods.find((period) => period.status !== "LOCKED") ?? periods[0] ?? null;
  const closedCount = periods.filter((period) => period.status === "LOCKED").length;
  const configurationRate = employees.length === 0 ? 0 : Math.round((configuredCount / employees.length) * 100);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"><WalletCards size={17} /></span>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Centre de paie</p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Piloter la paie sans se perdre dans les écrans</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">Une période, une prochaine action claire et des contrôles regroupés. Le moteur reste en construction : cet espace sert à tester le parcours avant ouverture aux autres utilisateurs.</p>
        </div>
        <Link href="/dashboard/payroll/dsn" className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-surface-subtle">
          <FlaskConical size={16} /> Laboratoire DSN
        </Link>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <div className="flex items-center justify-between"><span className="text-xs text-ink-faint">Salariés actifs</span><Users size={16} className="text-ink-faint" /></div>
          <p className="mt-2 text-2xl font-semibold text-ink">{employees.length}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <div className="flex items-center justify-between"><span className="text-xs text-ink-faint">Profils configurés</span><Settings2 size={16} className="text-ink-faint" /></div>
          <p className="mt-2 text-2xl font-semibold text-ink">{configuredCount}/{employees.length}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${configurationRate}%` }} /></div>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <div className="flex items-center justify-between"><span className="text-xs text-ink-faint">Périodes clôturées</span><CheckCircle2 size={16} className="text-ink-faint" /></div>
          <p className="mt-2 text-2xl font-semibold text-ink">{closedCount}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <div className="flex items-center justify-between"><span className="text-xs text-ink-faint">Période à traiter</span><ShieldCheck size={16} className="text-ink-faint" /></div>
          <p className="mt-2 truncate text-lg font-semibold text-ink">{activePeriod ? `${MONTHS[activePeriod.month - 1]} ${activePeriod.year}` : "Aucune"}</p>
          <p className="mt-1 text-xs text-ink-faint">{activePeriod ? PAYROLL_STATUS_LABELS[activePeriod.status] ?? activePeriod.status : "Ouvrez une période pour commencer"}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <div className="rounded-2xl border border-surface-border bg-white p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Prochaine action</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">{activePeriod ? `Continuer ${MONTHS[activePeriod.month - 1]} ${activePeriod.year}` : "Créer la première période"}</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-ink-soft">{activePeriod ? "Reprenez exactement là où le cycle s'est arrêté. Les données de préparation, variables, contrôles et résultats restent regroupés dans la période." : "Ouvrez un mois de paie pour démarrer le parcours de test."}</p>
            </div>
            {activePeriod ? (
              <Link href={`/dashboard/payroll/${activePeriod.id}`} className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
                Ouvrir la période <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>
          {activePeriod ? (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-surface-border pt-4">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(activePeriod.status)}`}>{PAYROLL_STATUS_LABELS[activePeriod.status] ?? activePeriod.status}</span>
              <span className="text-xs text-ink-faint">Le statut sert uniquement à guider le parcours ; les contrôles métier restent ceux du moteur.</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 md:p-6">
          <div className="flex items-center gap-2"><CalendarPlus size={17} className="text-brand-primary" /><h2 className="font-semibold text-ink">Ouvrir une période</h2></div>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Crée le dossier du mois sans lancer aucun calcul automatiquement.</p>
          <form action={createPayrollPeriod} className="mt-4 grid grid-cols-[1fr_100px] gap-2">
            <select name="month" defaultValue={String(now.getMonth() + 1)} className="rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10">{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
            <input name="year" type="number" defaultValue={now.getFullYear()} min="2000" max="2100" className="rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10" />
            <button type="submit" className="col-span-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90">Créer le dossier de paie</button>
          </form>
        </div>
      </section>

      {demoOnly ? (
        <section className="mt-5 flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-subtle/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-medium text-ink">Données de démonstration détectées</p><p className="mt-1 text-xs text-ink-faint">Préparez les profils et une période de test sans calcul automatique.</p></div>
          <form action={prepareDemoPayrollData}><DemoPayrollSetupButton /></form>
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-surface-border bg-white">
        <div className="flex flex-col gap-2 border-b border-surface-border px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Historique</p><h2 className="mt-1 text-lg font-semibold text-ink">Périodes de paie</h2><p className="mt-1 text-sm text-ink-soft">Une liste compacte pour retrouver un mois, son état et l'action disponible.</p></div>
          <span className="text-xs font-medium text-ink-faint">{periods.length} période{periods.length > 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-surface-border">
          {periods.length === 0 ? <div className="px-5 py-10 text-center"><FileText className="mx-auto text-ink-faint" size={22} /><p className="mt-2 text-sm font-medium text-ink">Aucune période créée</p><p className="mt-1 text-xs text-ink-faint">Utilisez le panneau « Ouvrir une période » pour démarrer.</p></div> : null}
          {periods.map((period) => (
            <div key={period.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-surface-subtle/35 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/dashboard/payroll/${period.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-sm font-semibold text-ink">{String(period.month).padStart(2, "0")}</span>
                <div className="min-w-0"><p className="truncate font-medium text-ink">{MONTHS[period.month - 1]} {period.year}</p><p className="mt-0.5 text-xs text-ink-faint">Ouvrir le dossier de la période</p></div>
                <ChevronRight size={16} className="ml-1 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(period.status)}`}>{PAYROLL_STATUS_LABELS[period.status] ?? period.status}</span>
                {period.status === "LOCKED" ? <PayrollReopenInlineButton periodId={period.id} /> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <details className="group mt-6 overflow-hidden rounded-2xl border border-surface-border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 marker:hidden">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Configuration</p><h2 className="mt-1 text-lg font-semibold text-ink">Profils de paie</h2><p className="mt-1 text-sm text-ink-soft">Masqué par défaut pour garder l'écran centré sur les périodes. Ouvrez uniquement quand un salaire ou un horaire doit être configuré.</p></div>
          <div className="flex items-center gap-3"><span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-ink-soft">{configuredCount}/{employees.length}</span><ChevronRight size={18} className="text-ink-faint transition group-open:rotate-90" /></div>
        </summary>
        <div className="border-t border-surface-border">
          {employees.length === 0 ? <p className="px-5 py-8 text-sm text-ink-soft">Ajoutez d'abord vos salariés pour commencer la configuration paie.</p> : null}
          <div className="divide-y divide-surface-border">
            {employees.map((employee) => {
              const profile = profileByEmployee.get(employee.id);
              return (
                <div key={employee.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(220px,1fr)_auto] xl:items-center">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{employee.position || "Poste non renseigné"} · {formatEuros(profile?.baseSalaryCents ?? null)} · {profile?.monthlyHours?.toString() ?? "Heures non renseignées"} h</p>
                  </div>
                  <form action={savePayrollProfile} className="grid gap-2 sm:grid-cols-[180px_120px_auto]">
                    <input type="hidden" name="employeeId" value={employee.id} />
                    <input name="salaryEuros" type="number" min="0" step="0.01" placeholder="Salaire brut mensuel" required className="rounded-lg border border-surface-border px-3 py-2 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10" />
                    <input name="monthlyHours" type="number" min="1" step="0.01" defaultValue="151.67" className="rounded-lg border border-surface-border px-3 py-2 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10" aria-label="Heures mensuelles" />
                    <button type="submit" className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle">Enregistrer</button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
