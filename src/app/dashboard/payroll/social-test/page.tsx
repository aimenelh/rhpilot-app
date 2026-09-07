import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrganizationLegalCategory } from "@/lib/payroll/social-organization-context";
import { calculateSocialPayroll } from "@/lib/payroll/social-engine";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  employee?: string;
  gross?: string;
  employeeContributions?: string;
  employerContributions?: string;
  netBeforeTax?: string;
  employerCost?: string;
  error?: string;
};

async function testSocialPayroll() {
  "use server";

  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    redirect("/dashboard/payroll/social-test?status=error&error=Accès%20réservé%20aux%20administrateurs.");
  }

  let redirectUrl: string | null = null;
  try {
    const now = new Date();
    const period = await prisma.payrollPeriod.findFirst({
      where: { organizationId: membership.organizationId, year: now.getFullYear(), month: now.getMonth() + 1 },
      select: { id: true, year: true, month: true },
    });
    if (!period) throw new Error("Aucune période de paie n'est ouverte pour le mois en cours.");

    const employee = await prisma.employee.findFirst({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, contractType: true, hireDate: true, professionalCategory: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    if (!employee) throw new Error("Aucun salarié actif n'est disponible pour le test.");
    if (!employee.contractType) throw new Error("Le type de contrat est manquant pour le salarié de test.");
    if (!employee.hireDate) throw new Error("La date d'embauche est manquante pour le salarié de test.");
    if (!employee.professionalCategory) throw new Error("La catégorie professionnelle est manquante pour le salarié de test.");

    const profile = await prisma.payrollProfile.findFirst({
      where: {
        organizationId: membership.organizationId,
        employeeId: employee.id,
        effectiveFrom: { lte: new Date(period.year, period.month, 0, 23, 59, 59, 999) },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date(period.year, period.month - 1, 1) } }],
      },
      select: { baseSalaryCents: true },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!profile || profile.baseSalaryCents === null) throw new Error("Le salaire brut du profil paie est manquant.");

    const socialContext = await resolveOrganizationLegalCategory(membership.organizationId);
    const calculationDate = new Date(period.year, period.month - 1, 1, 12, 0, 0, 0);
    const result = calculateSocialPayroll({
      grossAmount: profile.baseSalaryCents / 100,
      legalCategory: socialContext.legalCategory,
      calculationDate,
      contractType: employee.contractType,
      hireDate: employee.hireDate,
      executiveStatus: employee.professionalCategory === "CADRE",
      healthPlanMonthlyAmount: socialContext.healthPlanMonthlyAmount,
      healthPlanEmployerRate: socialContext.healthPlanEmployerRate,
      situation: {
        "établissement . taux ATMP": `${socialContext.atmpRate}%`,
        "entreprise . date de création": socialContext.companyCreationDate,
        "établissement . commune": {
          nom: socialContext.payrollCity,
          département: socialContext.payrollDepartment,
        },
        "salarié . rémunération . avantages en nature": "non",
        "salarié . régimes spécifiques . taux réduits": "non",
        "situation personnelle . domiciliation fiscale à l'étranger": "non",
      },
    });

    const params = new URLSearchParams({
      status: "success",
      employee: `${employee.firstName} ${employee.lastName}`,
      gross: result.grossAmount.toFixed(2),
      employeeContributions: result.employeeContributions.toFixed(2),
      employerContributions: result.employerContributions.toFixed(2),
      netBeforeTax: result.netBeforeTax.toFixed(2),
      employerCost: result.employerCost.toFixed(2),
    });
    redirectUrl = `/dashboard/payroll/social-test?${params.toString()}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Le test du moteur social a échoué.";
    redirectUrl = `/dashboard/payroll/social-test?status=error&error=${encodeURIComponent(message)}`;
  }

  redirect(redirectUrl!);
}

function formatEuro(value?: string) {
  if (!value) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export default async function SocialPayrollTestPage({ searchParams }: { searchParams?: SearchParams }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const success = searchParams?.status === "success";
  const error = searchParams?.status === "error" ? searchParams.error : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/payroll" className="text-sm text-ink-soft hover:text-ink">← Retour à la paie</Link>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Test technique</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Moteur social</h1>
        <p className="mt-1 text-sm text-ink-soft">Ce test vérifie le passage des données de l'organisation et du salarié vers le modèle social, sans enregistrer de calcul de paie.</p>
      </div>
      <section className="mt-7 rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Test du salarié de référence</h2>
        <p className="mt-1 text-sm text-ink-soft">Le test utilise le premier salarié actif et son profil paie applicable à la période en cours.</p>
        <form action={testSocialPayroll} className="mt-5"><button type="submit" className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Tester le moteur social</button></form>
      </section>
      {success ? (
        <section className="mt-5 rounded-xl border border-accent-teal/30 bg-accent-teal/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-teal">Test réussi</p>
          <p className="mt-1 font-semibold text-ink">Le moteur social a accepté le contexte complet.</p>
          <p className="mt-1 text-sm text-ink-soft">{searchParams?.employee} · modèle social 11.1.0</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-surface-border bg-white p-4"><p className="text-xs text-ink-faint">Brut</p><p className="mt-1 text-lg font-semibold text-ink">{formatEuro(searchParams?.gross)}</p></div>
            <div className="rounded-lg border border-surface-border bg-white p-4"><p className="text-xs text-ink-faint">Cotisations salariales</p><p className="mt-1 text-lg font-semibold text-ink">{formatEuro(searchParams?.employeeContributions)}</p></div>
            <div className="rounded-lg border border-surface-border bg-white p-4"><p className="text-xs text-ink-faint">Cotisations employeur</p><p className="mt-1 text-lg font-semibold text-ink">{formatEuro(searchParams?.employerContributions)}</p></div>
            <div className="rounded-lg border border-surface-border bg-white p-4"><p className="text-xs text-ink-faint">Net avant impôt</p><p className="mt-1 text-lg font-semibold text-ink">{formatEuro(searchParams?.netBeforeTax)}</p></div>
            <div className="rounded-lg border border-surface-border bg-white p-4 sm:col-span-2"><p className="text-xs text-ink-faint">Coût employeur</p><p className="mt-1 text-lg font-semibold text-ink">{formatEuro(searchParams?.employerCost)}</p></div>
          </div>
          <p className="mt-4 text-xs text-ink-faint">Ces montants sont un résultat de vérification technique. Ils ne sont pas enregistrés comme calcul de paie.</p>
        </section>
      ) : null}
      {error ? (
        <section className="mt-5 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-5" role="alert">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-amber">Test bloqué</p>
          <p className="mt-1 font-semibold text-ink">Le moteur social a refusé le contexte fourni.</p>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
        </section>
      ) : null}
    </div>
  );
}
