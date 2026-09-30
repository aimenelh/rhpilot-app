import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ArrowUpRight } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const membership = await getCurrentMembership();
  if (!membership || !isOrganizationAdmin(membership)) redirect("/dashboard");
  const documents = await prisma.employee_documents.findMany({
    where: { organizationId: membership.organizationId, replacedAt: null, employees: { organizationId: membership.organizationId, deletedAt: null } },
    select: { id: true, title: true, publishedAt: true, employees: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: 100,
  });
  return <div className="max-w-5xl"><h1 className="font-serif text-3xl font-medium">Documents</h1><p className="mt-2 text-sm text-ink-soft">Les documents publiés dans les coffres de vos salariés, au même endroit.</p><div className="mt-6 overflow-hidden rounded-xl border border-surface-border bg-white">
    {documents.length ? <ul className="divide-y divide-surface-border">{documents.map(document => <li key={document.id} className="flex flex-wrap items-center gap-4 px-5 py-4"><FileText size={20} className="text-ink-faint"/><div className="min-w-0 flex-1"><a href={`/api/employee-documents/${document.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-brand-primary">{document.title}</a><p className="mt-1 text-xs text-ink-faint"><Link href={`/dashboard/employees/${document.employees.id}`} className="hover:underline">{document.employees.firstName} {document.employees.lastName}</Link> · Publié le {document.publishedAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</p></div><a href={`/api/employee-documents/${document.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand-primary" aria-label={`Ouvrir ${document.title} dans un nouvel onglet`}>Ouvrir <ArrowUpRight size={14}/></a></li>)}</ul> : <div className="px-6 py-12 text-center"><FileText size={28} className="mx-auto text-ink-faint"/><h2 className="mt-4 text-lg font-medium">Les pièces au bon endroit.</h2><p className="mt-2 text-sm text-ink-soft">Publiez un document depuis la fiche d’un salarié pour le retrouver ici.</p><Link href="/dashboard/employees" className="mt-5 inline-block text-sm text-brand-primary">Voir les salariés</Link></div>}
  </div>{documents.length === 100 ? <p className="mt-3 text-xs text-ink-faint">Les 100 documents les plus récents sont affichés. Retrouvez l’historique complet dans les fiches salariés.</p> : null}</div>;
}
