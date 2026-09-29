"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Copy, FileUp } from "lucide-react";
import { NOTICE_METHODS, noticeMethodLabel, type ElectronicReadiness } from "@/lib/employee-space/notice-rules";
import {
  generateExitDocument,
  inviteToEmployeeSpace,
  recordElectronicNotice,
  revokeEmployeeSpace,
  saveEmployeeSpaceSettings,
  uploadEmployeeDocument,
  type EmployeeSpaceActionState,
} from "./employeeSpaceActions";

export type EmployeeAccountStatus = "NONE" | "INVITED" | "EXPIRED" | "ACTIVE" | "REVOKED";

export type EmployeeSpaceSummary = {
  employeeId: string;
  firstName: string;
  isDemo: boolean;
  personalEmail: string | null;
  paperSince: string | null;
  paperSource: "EMPLOYEE" | "EMPLOYER" | null;
  account: { status: EmployeeAccountStatus; email: string | null; invitedAt: string | null; activatedAt: string | null };
  notice: { at: string | null; method: string | null; readiness: ElectronicReadiness };
};

export type AdminDocumentRow = {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  publishedAt: string;
  replaced: boolean;
  employeeOpenedAt: string | null;
  notified: "NOTIFIED" | "FAILED" | null;
};

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
const date = (iso: string) => DATE.format(new Date(iso));

function Message({ state }: { state: EmployeeSpaceActionState }) {
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  return (
    <div className="mt-3 text-sm" role={state.error ? "alert" : "status"}>
      {state.error ? <p className="text-accent-rose">{state.error}</p> : null}
      {state.success ? <p className="text-accent-teal">{state.success}</p> : null}
      {state.manualUrl ? (
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={state.manualUrl} className="h-9 min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-subtle/40 px-2 text-xs text-ink" onFocus={(event) => event.currentTarget.select()} />
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(state.manualUrl!).then(() => setCopied(true)); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border px-2.5 text-xs font-semibold text-ink hover:bg-surface-subtle"><Copy size={13} />{copied ? "Copié" : "Copier"}</button>
        </div>
      ) : null}
    </div>
  );
}

function Submit({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 ${variant === "primary" ? "bg-brand-primary text-white hover:opacity-90" : "border border-surface-border bg-white text-ink hover:bg-surface-subtle"}`}>
      {pending ? "Un instant…" : children}
    </button>
  );
}

function statusText(summary: EmployeeSpaceSummary): string {
  const { account } = summary;
  if (summary.isDemo) return "Salarié de démonstration : pas d'espace salarié.";
  switch (account.status) {
    case "ACTIVE": return `Espace activé${account.activatedAt ? ` le ${date(account.activatedAt)}` : ""} par ${account.email}.`;
    case "INVITED": return `Invitation envoyée${account.invitedAt ? ` le ${date(account.invitedAt)}` : ""} à ${account.email}, en attente d'activation.`;
    case "EXPIRED": return `L'invitation envoyée à ${account.email} a expiré.`;
    case "REVOKED": return "Accès retiré. Les documents restent conservés.";
    default: return "Pas encore d'espace salarié.";
  }
}

/** Accès du salarié à son espace : adresse personnelle, invitation, bulletin papier. */
export function EmployeeSpaceCard({ summary }: { summary: EmployeeSpaceSummary }) {
  const [settingsState, settingsAction] = useFormState(saveEmployeeSpaceSettings.bind(null, summary.employeeId), undefined);
  const [actionState, setActionState] = useState<EmployeeSpaceActionState>(undefined);
  const [pending, startTransition] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const { account } = summary;
  const canInvite = !summary.isDemo && account.status !== "ACTIVE";

  const run = (action: () => Promise<EmployeeSpaceActionState>) => startTransition(async () => { setActionState(await action()); setConfirmRevoke(false); });

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-semibold text-ink">Espace salarié</h3>
        <p className="text-sm text-ink-soft">{statusText(summary)}</p>
      </div>
      <p className="mt-1 text-sm leading-6 text-ink-faint">
        {summary.firstName} y retrouve ses bulletins, ses congés, ses demandes d&apos;absence et ses documents, depuis son téléphone. Le compte salarié ne donne aucun accès à RH Pilot et n&apos;est pas facturé.
      </p>

      {!summary.isDemo ? (
        <form action={settingsAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink">
              E-mail personnel
              <input name="personalEmail" type="email" defaultValue={summary.personalEmail ?? ""} placeholder="prenom.nom@exemple.fr" autoComplete="off" className="mt-1 block h-10 w-full max-w-md rounded-lg border border-surface-border px-3 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" />
              <span className="mt-1 block text-xs font-normal text-ink-faint">Pour l&apos;invitation et les notifications. Préférez l&apos;adresse personnelle : le salarié garde l&apos;accès à ses documents après son départ.</span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input type="hidden" name="paperPayslipShown" value={summary.paperSince ? "1" : "0"} />
              {summary.paperSource === "EMPLOYEE" ? <input type="hidden" name="paperPayslip" value="on" /> : null}
              <input name="paperPayslip" type="checkbox" defaultChecked={Boolean(summary.paperSince)} disabled={summary.paperSource === "EMPLOYEE"} className="mt-0.5 h-4 w-4 rounded border-surface-border disabled:opacity-60" />
              <span>
                Bulletin papier (refus du format électronique)
                <span className="block text-xs text-ink-faint">
                  {summary.paperSince ? `Depuis le ${date(summary.paperSince)}, ${summary.paperSource === "EMPLOYEE" ? "choisi par le salarié dans son espace" : "enregistré par l'employeur"}. ` : ""}
                  Le salarié peut s&apos;opposer à tout moment au bulletin électronique (C. trav. art. L3243-2) : ses bulletins ne sont alors plus publiés dans son espace, remettez-les sur papier.
                </span>
              </span>
            </label>
          </div>
          <Submit variant="secondary">Enregistrer</Submit>
        </form>
      ) : null}
      <Message state={settingsState} />

      {!summary.isDemo && !summary.paperSince ? <ElectronicNoticeBlock summary={summary} /> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-surface-border pt-4">
        {canInvite ? (
          <button type="button" disabled={pending || !summary.personalEmail} onClick={() => run(() => inviteToEmployeeSpace(summary.employeeId))} className="rounded-lg bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {pending ? "Envoi…" : account.status === "NONE" ? "Inviter à l'espace salarié" : "Renvoyer l'invitation"}
          </button>
        ) : null}
        {canInvite && !summary.personalEmail ? <span className="text-xs text-ink-faint">Renseignez et enregistrez d&apos;abord l&apos;e-mail personnel.</span> : null}
        {account.status === "ACTIVE" || account.status === "INVITED" ? (
          confirmRevoke ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-soft">À réserver aux erreurs (mauvaise adresse, fiche en double) : le salarié ne pourra plus télécharger ses documents. Remettez-lui d&apos;abord l&apos;archive ZIP de « Documents publiés ».</span>
              <button type="button" disabled={pending} onClick={() => run(() => revokeEmployeeSpace(summary.employeeId))} className="rounded-lg border border-accent-rose/40 px-3 py-1.5 font-semibold text-accent-rose hover:bg-accent-rose/5">Retirer l&apos;accès</button>
              <button type="button" onClick={() => setConfirmRevoke(false)} className="rounded-lg px-2 py-1.5 text-ink-soft hover:bg-surface-subtle">Annuler</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmRevoke(true)} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-subtle">{account.status === "ACTIVE" ? "Retirer l'accès" : "Annuler l'invitation"}</button>
          )
        ) : null}
      </div>
      <Message state={actionState} />
    </div>
  );
}

/** Documents publiés dans l'espace du salarié, avec leur suivi. */
export function EmployeeDocumentsTable({ documents }: { documents: AdminDocumentRow[] }) {
  if (documents.length === 0) return <p className="px-5 py-6 text-sm text-ink-soft">Aucun document publié pour l&apos;instant.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead><tr className="text-left text-xs font-semibold text-ink-faint"><th className="border-b border-surface-border px-5 py-2.5">Document</th><th className="border-b border-surface-border px-3 py-2.5">Publié le</th><th className="border-b border-surface-border px-3 py-2.5">Suivi</th><th className="border-b border-surface-border px-5 py-2.5 text-right">PDF</th></tr></thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id} className={document.replaced ? "text-ink-faint" : ""}>
              <td className="border-b border-surface-border px-5 py-2.5"><p className={`font-medium ${document.replaced ? "text-ink-faint line-through" : "text-ink"}`}>{document.title}</p>{document.title !== document.kindLabel ? <p className="text-xs text-ink-faint">{document.kindLabel}</p> : null}</td>
              <td className="whitespace-nowrap border-b border-surface-border px-3 py-2.5 text-ink-soft">{date(document.publishedAt)}</td>
              <td className="border-b border-surface-border px-3 py-2.5 text-ink-soft">
                {document.replaced ? "Remplacé par une version corrigée" : document.employeeOpenedAt ? `Ouvert par le salarié le ${date(document.employeeOpenedAt)}` : document.notified === "FAILED" ? "E-mail non parti, pas encore ouvert" : document.notified === "NOTIFIED" ? "Salarié prévenu, pas encore ouvert" : "Pas encore ouvert"}
              </td>
              <td className="border-b border-surface-border px-5 py-2.5 text-right"><a href={`/api/employee-documents/${document.id}`} target="_blank" rel="noopener" className="font-semibold text-brand-primary hover:underline">Ouvrir</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Dépôt d'un PDF : attestation France Travail, document signé, autre. */
export function UploadEmployeeDocumentForm({ employeeId, defaultKind = "FRANCE_TRAVAIL", compact = false }: { employeeId: string; defaultKind?: "FRANCE_TRAVAIL" | "OTHER"; compact?: boolean }) {
  const [state, action] = useFormState(uploadEmployeeDocument, undefined);
  const [kind, setKind] = useState<string>(defaultKind);
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <form action={action} className={compact ? "" : "rounded-xl border border-dashed border-surface-border p-4"}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="block text-sm font-medium text-ink">
          Type
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 block h-10 rounded-lg border border-surface-border bg-white px-2.5 text-sm text-ink">
            <option value="PAYSLIP">Bulletin établi par un autre logiciel</option>
            <option value="FRANCE_TRAVAIL">Attestation employeur France Travail</option>
            <option value="WORK_CERTIFICATE">Certificat de travail signé</option>
            <option value="FINAL_SETTLEMENT">Reçu pour solde de tout compte signé</option>
            <option value="OTHER">Autre document</option>
          </select>
        </label>
        {kind === "PAYSLIP" && <label className="block text-sm font-medium text-ink">Mois du bulletin<input type="month" name="period" required min="1950-01" max="2100-12" className="mt-1 block h-10 rounded-lg border border-surface-border px-3 text-sm" /></label>}
        {kind === "OTHER" ? (
          <label className="block flex-1 text-sm font-medium text-ink">
            Titre
            <input name="title" required maxLength={120} placeholder="Avenant au contrat, attestation…" className="mt-1 block h-10 w-full rounded-lg border border-surface-border px-3 text-sm text-ink" />
          </label>
        ) : null}
        <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 text-sm font-semibold text-ink hover:bg-surface-subtle">
          <FileUp size={15} /> <span className="max-w-[180px] truncate">{fileName ?? "Choisir le PDF"}</span>
          <input type="file" name="file" accept="application/pdf" required className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)} />
        </label>
        <Submit>Publier</Submit>
      </div>
      {kind === "PAYSLIP" && <div className="mt-3 space-y-2 text-sm text-ink-soft"><p>Déposez le PDF établi par votre comptable ou votre logiciel de paie (4 Mo maximum). Aucun recalcul : il sera remis au salarié avec son mois de référence, après vérification de l’information préalable et du choix papier.</p><label className="flex items-start gap-2"><input type="checkbox" name="confirmReplacement" className="mt-1" /><span>Si un bulletin existe pour ce mois, je confirme son remplacement. La version précédente restera conservée.</span></label></div>}
      {kind === "FRANCE_TRAVAIL" ? <p className="mt-2 text-xs leading-5 text-ink-faint">L&apos;attestation part à France Travail avec la DSN de fin de contrat : déposez ici l&apos;exemplaire salarié téléchargé sur net-entreprises.</p> : null}
      <Message state={state} />
    </form>
  );
}

/** Certificat de travail et reçu pour solde de tout compte, produits par RH Pilot. */
export function ExitDocumentButtons({ employeeId, finalSettlementReady, finalSettlementHint, healthCoverageDetected, existingKinds }: { employeeId: string; finalSettlementReady: boolean; finalSettlementHint: string; healthCoverageDetected: boolean; existingKinds: string[] }) {
  const [certificateState, certificateAction] = useFormState(generateExitDocument.bind(null, employeeId, "WORK_CERTIFICATE"), undefined);
  const [settlementState, settlementAction] = useFormState(generateExitDocument.bind(null, employeeId, "FINAL_SETTLEMENT"), undefined);
  const hasCertificate = existingKinds.includes("WORK_CERTIFICATE");
  const hasSettlement = existingKinds.includes("FINAL_SETTLEMENT");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form action={certificateAction} className="rounded-xl border border-surface-border p-4">
        <p className="text-sm font-semibold text-ink">Certificat de travail</p>
        <p className="mt-1 text-xs leading-5 text-ink-faint">Dates d&apos;entrée et de sortie, emploi occupé (C. trav. art. D1234-6). À remettre le dernier jour du contrat.</p>
        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="healthCoverage" defaultChecked={healthCoverageDetected} className="mt-0.5 h-4 w-4 rounded border-surface-border" />
          <span>Mentionner la portabilité santé et prévoyance<span className="block text-xs text-ink-faint">Si l&apos;entreprise a une mutuelle ou une prévoyance (CSS art. L911-8).</span></span>
        </label>
        <div className="mt-3"><Submit variant={hasCertificate ? "secondary" : "primary"}>{hasCertificate ? "Refaire et republier" : "Produire et publier"}</Submit></div>
        <Message state={certificateState} />
      </form>
      <form action={settlementAction} className="rounded-xl border border-surface-border p-4">
        <p className="text-sm font-semibold text-ink">Reçu pour solde de tout compte</p>
        <p className="mt-1 text-xs leading-5 text-ink-faint">{finalSettlementHint}</p>
        <div className="mt-3">
          {finalSettlementReady ? <Submit variant={hasSettlement ? "secondary" : "primary"}>{hasSettlement ? "Refaire et republier" : "Produire et publier"}</Submit> : <button type="button" disabled className="rounded-lg border border-surface-border px-3.5 py-2 text-sm font-semibold text-ink-faint">Pas encore disponible</button>}
        </div>
        <Message state={settlementState} />
      </form>
    </div>
  );
}

const ISO_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const isoDay = (iso: string) => ISO_DATE.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/**
 * Information préalable du salarié (C. trav. art. D3243-7) : note à faire
 * signer, puis date et mode de remise. Sans elle, ses bulletins ne sont pas
 * publiés en ligne (sauf s'il en a déjà reçu).
 */
function ElectronicNoticeBlock({ summary }: { summary: EmployeeSpaceSummary }) {
  const [state, action] = useFormState(recordElectronicNotice.bind(null, summary.employeeId), undefined);
  const [editing, setEditing] = useState(!summary.notice.at);
  const { readiness } = summary.notice;
  const today = new Date().toISOString().slice(0, 10);
  const status = summary.notice.at
    ? `Note remise le ${isoDay(summary.notice.at)} (${noticeMethodLabel(summary.notice.method).toLowerCase()}).`
    : readiness.ready ? "A déjà reçu des bulletins électroniques." : "Note pas encore remise.";
  const consequence = readiness.ready
    ? "Ses bulletins peuvent être publiés dans son espace."
    : readiness.reason === "WAITING"
      ? `Ses bulletins seront publiés en ligne à partir du ${isoDay(readiness.availableFrom)} ; d'ici là, remettez-les sur papier.`
      : "Tant que la note n'est pas remise, ses bulletins ne sont pas publiés en ligne : remettez-les sur papier.";

  return (
    <div className="mt-4 rounded-xl border border-surface-border bg-surface-subtle/30 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm font-semibold text-ink">Information sur le bulletin électronique</p>
        <p className={`text-sm ${readiness.ready ? "text-ink-soft" : "text-accent-amber"}`}>{status}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-ink-faint">
        Le salarié doit être informé de son droit de refuser le bulletin électronique un mois avant le premier bulletin électronique, ou à l&apos;embauche, par un moyen qui donne date certaine (C. trav. art. D3243-7). {consequence}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a href={`/api/employee-space/notice/${summary.employeeId}`} target="_blank" rel="noopener" className="inline-flex items-center rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle">Note à faire signer (PDF)</a>
        {!editing ? <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-brand-primary hover:underline">Modifier la date de remise</button> : null}
      </div>
      {editing ? (
        <form action={action} className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="block text-sm font-medium text-ink">
            Remise le
            <input type="date" name="noticeAt" required max={today} defaultValue={summary.notice.at?.slice(0, 10) ?? today} className="mt-1 block h-10 rounded-lg border border-surface-border bg-white px-2.5 text-sm text-ink" />
          </label>
          <label className="block text-sm font-medium text-ink">
            Mode de remise
            <select name="noticeMethod" required defaultValue={summary.notice.method ?? "HAND_DELIVERY"} className="mt-1 block h-10 rounded-lg border border-surface-border bg-white px-2.5 text-sm text-ink">
              {NOTICE_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </select>
          </label>
          <Submit variant="secondary">Enregistrer la remise</Submit>
        </form>
      ) : null}
      <Message state={state} />
      <p className="mt-2 text-xs leading-5 text-ink-faint">Gardez l&apos;exemplaire signé ou l&apos;accusé de réception : vous pouvez le déposer ci-dessous dans « Documents publiés », en « Autre document ».</p>
    </div>
  );
}
