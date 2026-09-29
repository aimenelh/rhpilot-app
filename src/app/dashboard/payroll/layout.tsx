import { redirect } from "next/navigation";
import { getPayrollMembership } from "@/lib/payrollAccess";

export const dynamic = "force-dynamic";

// Paie en accès anticipé : réservée aux organisations pilotes (voir lib/payrollAccess).
export default async function PayrollPreviewLayout({ children }: { children: React.ReactNode }) {
  const membership = await getPayrollMembership();
  if (!membership) redirect("/dashboard");

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-surface-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Accès anticipé</p>
          <p className="mt-0.5 text-sm font-medium text-ink">Vérifiez chaque bulletin avant de le remettre à vos salariés.</p>
        </div>
        <span className="w-fit rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-ink-soft">Réservé aux entreprises pilotes</span>
      </div>
      {children}
    </div>
  );
}
