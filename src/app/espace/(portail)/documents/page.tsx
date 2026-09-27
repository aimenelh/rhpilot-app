import { requireEmployeeSession } from "@/lib/employee-space/session";
import { lastEmployeeDownloads, listVaultDocuments } from "@/lib/employee-space/vault";
import { DOCUMENT_KIND_LABELS, EXIT_DOCUMENT_KINDS } from "@/lib/employee-space/labels";
import { DocumentRow } from "@/components/espace/DocumentRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes documents" };

export default async function EspaceDocumentsPage() {
  const { account } = await requireEmployeeSession();
  const [documents, downloads] = await Promise.all([
    listVaultDocuments(account.organizationId, account.employeeId),
    lastEmployeeDownloads(account.organizationId, account.employeeId),
  ]);
  const exitDocuments = documents.filter((document) => EXIT_DOCUMENT_KINDS.includes(document.kind));
  const others = documents.filter((document) => document.kind === "OTHER");
  const contractEnded = Boolean(account.contractEndDate);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Mes documents</h1>
        <p className="mt-1 text-sm text-ink-soft">Les documents que {account.organizationName} met à votre disposition. Vos bulletins sont dans l&apos;onglet Bulletins.</p>
      </div>

      {exitDocuments.length > 0 || contractEnded ? (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">Fin de contrat</h2>
          {exitDocuments.length > 0 ? (
            <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
              {exitDocuments.map((document) => (
                <DocumentRow key={document.id} id={document.id} title={document.title} subtitle={document.title === DOCUMENT_KIND_LABELS[document.kind] ? undefined : DOCUMENT_KIND_LABELS[document.kind]} publishedAt={document.publishedAt} isNew={!downloads.has(document.id)} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-surface-border bg-white px-5 py-6 text-sm leading-6 text-ink-soft">Votre certificat de travail, votre reçu pour solde de tout compte et votre attestation France Travail apparaîtront ici dès que {account.organizationName} les aura publiés.</p>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">Autres documents</h2>
        {others.length > 0 ? (
          <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
            {others.map((document) => <DocumentRow key={document.id} id={document.id} title={document.title} publishedAt={document.publishedAt} isNew={!downloads.has(document.id)} />)}
          </div>
        ) : (
          <p className="rounded-2xl border border-surface-border bg-white px-5 py-6 text-center text-sm text-ink-soft">Aucun document pour l&apos;instant.</p>
        )}
      </section>

      {exitDocuments.some((document) => document.kind === "FINAL_SETTLEMENT") ? (
        <p className="px-1 text-xs leading-5 text-ink-faint">Le reçu pour solde de tout compte se signe en deux exemplaires, dont un vous est remis. Vous pouvez le dénoncer dans les six mois qui suivent sa signature (article L1234-20 du Code du travail).</p>
      ) : null}
    </div>
  );
}
