import Link from "next/link";
import { requireEmployeeSession } from "@/lib/employee-space/session";
import { lastEmployeeDownloads, listVaultDocuments } from "@/lib/employee-space/vault";
import { formatLongDate, monthLabel } from "@/lib/employee-space/labels";
import { DocumentRow } from "@/components/espace/DocumentRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes bulletins" };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default async function EspacePayslipsPage({ searchParams }: { searchParams: { bienvenue?: string } }) {
  const { account } = await requireEmployeeSession();
  const [documents, downloads] = await Promise.all([
    listVaultDocuments(account.organizationId, account.employeeId),
    lastEmployeeDownloads(account.organizationId, account.employeeId),
  ]);
  const payslips = documents.filter((document) => document.kind === "PAYSLIP");
  const years = [...new Set(payslips.map((document) => document.periodYear ?? 0))].sort((a, b) => b - a);
  const otherCount = documents.length - payslips.length;

  return (
    <div className="space-y-5">
      {searchParams.bienvenue ? (
        <div className="rounded-2xl border border-accent-teal/30 bg-accent-teal/5 px-4 py-3.5 text-[15px] leading-6 text-ink">
          Bienvenue {account.firstName}. Vos bulletins arriveront ici chaque mois, et vous recevrez un e-mail à chaque nouveau document.
        </div>
      ) : null}

      <div>
        <h1 className="text-[22px] font-semibold text-ink">Mes bulletins</h1>
        <p className="mt-1 text-sm text-ink-soft">Touchez un bulletin pour l&apos;ouvrir. Vous pouvez l&apos;enregistrer sur votre téléphone ou votre ordinateur pour en garder une copie.</p>
      </div>

      {account.paperPayslipSince ? (
        <div className="rounded-2xl border border-surface-border bg-white px-4 py-3.5 text-sm leading-6 text-ink-soft">
          Vous recevez vos bulletins sur papier depuis le {formatLongDate(account.paperPayslipSince)}. Les bulletins déjà publiés restent consultables ici. <Link href="/espace/preferences" className="font-semibold text-brand-primary hover:underline">Modifier</Link>
        </div>
      ) : null}

      {payslips.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-white px-5 py-10 text-center">
          <p className="text-[15px] font-semibold text-ink">Aucun bulletin pour l&apos;instant</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-soft">Vous recevrez un e-mail dès que {account.organizationName} publiera votre prochain bulletin.</p>
        </div>
      ) : (
        years.map((year) => (
          <section key={year}>
            <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">{year}</h2>
            <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
              {payslips.filter((document) => (document.periodYear ?? 0) === year).map((document) => (
                <DocumentRow key={document.id} id={document.id} title={capitalize(monthLabel(document.periodYear ?? year, document.periodMonth ?? 1))} publishedAt={document.publishedAt} isNew={!downloads.has(document.id)} />
              ))}
            </div>
          </section>
        ))
      )}

      {otherCount > 0 ? (
        <Link href="/espace/documents" className="block rounded-2xl border border-surface-border bg-white px-4 py-3.5 text-sm font-semibold text-ink hover:bg-surface-subtle/60">
          {otherCount === 1 ? "1 autre document vous attend" : `${otherCount} autres documents vous attendent`} dans Documents
        </Link>
      ) : null}
    </div>
  );
}
