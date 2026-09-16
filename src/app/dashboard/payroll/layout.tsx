import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PayrollPreviewLayout({ children }: { children: React.ReactNode }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  if (membership.accessRole !== "OWNER") redirect("/dashboard");

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-surface-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Aperçu privé</p>
          <p className="mt-0.5 text-sm font-medium text-ink">Module Paie en cours de construction</p>
        </div>
        <span className="w-fit rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-ink-soft">Visible uniquement par le propriétaire</span>
      </div>
      {children}
    </div>
  );
}
