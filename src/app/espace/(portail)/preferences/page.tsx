import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { requireEmployeeSession } from "@/lib/employee-space/session";
import { getCurrentMemberships } from "@/lib/auth";
import { formatLongDate } from "@/lib/employee-space/labels";
import { PaperToggle } from "./PaperToggle";
import { startOwnOrganization } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte" };

export default async function EspacePreferencesPage() {
  const { account, user } = await requireEmployeeSession();
  const { memberships } = await getCurrentMemberships();
  return (
    <div className="space-y-5">
      <h1 className="text-[22px] font-semibold text-ink">Mon compte</h1>

      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <dl className="space-y-3 text-[15px]">
          <div><dt className="text-[13px] text-ink-faint">Nom</dt><dd className="font-medium text-ink">{account.firstName} {account.lastName}</dd></div>
          <div><dt className="text-[13px] text-ink-faint">Employeur</dt><dd className="font-medium text-ink">{account.organizationName}</dd></div>
          <div><dt className="text-[13px] text-ink-faint">Adresse de connexion et de notification</dt><dd className="break-all font-medium text-ink">{user.email}</dd></div>
          <div><dt className="text-[13px] text-ink-faint">Espace ouvert le</dt><dd className="font-medium text-ink">{formatLongDate(account.activatedAt)}</dd></div>
        </dl>
      </section>

      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink">Bulletin de paie</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">
          {account.paperPayslipSince
            ? `Vous recevez vos bulletins sur papier depuis le ${formatLongDate(account.paperPayslipSince)}${account.paperPayslipSource === "EMPLOYER" ? ", à la demande enregistrée par votre employeur" : ""}.`
            : "Vos bulletins vous sont remis sous forme électronique, dans cet espace. Vous pouvez vous y opposer à tout moment et les recevoir sur papier (article L3243-2 du Code du travail)."}
        </p>
        {account.organizationClosedAt ? null : <div className="mt-4"><PaperToggle paper={Boolean(account.paperPayslipSince)} /></div>}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        {memberships.length > 0 ? <Link href="/dashboard" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-surface-border bg-white px-4 text-[15px] font-semibold text-ink hover:bg-surface-subtle">Tableau de bord RH</Link> : null}
        <SignOutButton redirectUrl="/espace/connexion">
          <button type="button" className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-[15px] font-semibold text-ink-soft hover:bg-white">Me déconnecter</button>
        </SignOutButton>
      </div>
      <p className="px-1 text-xs leading-5 text-ink-faint">Pour changer d&apos;adresse e-mail ou de mot de passe, utilisez le menu de votre profil en haut à droite. Les notifications partent vers votre adresse de connexion.</p>
      {memberships.length === 0 ? (
        <form action={startOwnOrganization} className="px-1">
          <button type="submit" className="text-xs font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline">Vous dirigez une entreprise ? Créer votre propre espace RH</button>
        </form>
      ) : null}
    </div>
  );
}
