import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import { Logomark } from "@/components/Brand";
import { InitializingScreen } from "@/components/InitializingScreen";
import { EspaceAuthFrame } from "@/components/espace/EspaceAuthFrame";
import { EspaceNav } from "@/components/espace/EspaceNav";
import { ActionForm } from "@/components/espace/ActionForm";
import { SubmitButton } from "@/components/espace/SubmitButton";
import { getEmployeeSessionState } from "@/lib/employee-space/session";
import { findPendingInvitationsForEmail } from "@/lib/employee-space/invitations";
import { acceptPendingInvitation, switchEmployeeAccount } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Mon espace salarié", template: "%s · Espace salarié" }, robots: { index: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

async function NoSpace({ email }: { email: string }) {
  const pending = await findPendingInvitationsForEmail(email).catch(() => []);
  return (
    <EspaceAuthFrame>
      {pending.length > 0 ? (
        <>
          <h1 className="text-xl font-semibold text-ink">Une invitation vous attend</h1>
          <p className="mt-2 text-[15px] leading-6 text-ink-soft">Activez l&apos;espace salarié que votre employeur a ouvert pour {email}.</p>
          <div className="mt-5 space-y-3">
            {pending.map((invitation) => (
              <ActionForm key={invitation.accountId} action={async () => { "use server"; return acceptPendingInvitation(invitation.accountId); }} className="rounded-xl border border-surface-border p-4">
                <p className="text-[15px] font-semibold text-ink">{invitation.organizationName}</p>
                <p className="text-sm text-ink-soft">{invitation.firstName} {invitation.lastName}</p>
                <SubmitButton pendingLabel="Activation…" className="mt-3 w-full">Activer cet espace</SubmitButton>
              </ActionForm>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-ink">Aucun espace salarié</h1>
          <p className="mt-2 text-[15px] leading-6 text-ink-soft">
            Aucun espace salarié n&apos;est ouvert pour <strong className="font-semibold text-ink">{email}</strong>. Votre employeur vous l&apos;ouvre depuis RH Pilot : l&apos;invitation arrive par e-mail, sur votre adresse personnelle.
          </p>
        </>
      )}
      <SignOutButton redirectUrl="/espace/connexion">
        <button type="button" className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-ink-soft hover:bg-surface-subtle">Me déconnecter</button>
      </SignOutButton>
    </EspaceAuthFrame>
  );
}

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getEmployeeSessionState();
  if (session.state === "signed-out") redirect("/espace/connexion");
  if (session.state === "initializing") return <InitializingScreen />;
  if (session.state === "no-space") return <NoSpace email={session.email} />;

  const { account, accounts } = session;
  return (
    <div className="min-h-[100dvh] bg-surface-subtle pb-[calc(76px+env(safe-area-inset-bottom))] sm:pb-10">
      <header className="sticky top-0 z-20 border-b border-surface-border bg-white/95 backdrop-blur sm:static">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link href="/espace" className="flex min-w-0 items-center gap-2.5" aria-label="Accueil de l'espace salarié">
            <Logomark size={26} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-5 text-ink">{account.organizationName}</span>
              <span className="block truncate text-xs leading-4 text-ink-faint">{account.firstName} {account.lastName}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/espace/preferences" aria-label="Mon compte et mes préférences" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-subtle hover:text-ink">
              <Settings size={19} />
            </Link>
            <UserButton afterSignOutUrl="/espace/connexion" />
          </div>
        </div>
        {accounts.length > 1 ? (
          <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 pb-2 sm:px-6">
            {accounts.map((candidate) => (
              <form key={candidate.accountId} action={async () => { "use server"; await switchEmployeeAccount(candidate.accountId); }}>
                <button type="submit" aria-pressed={candidate.accountId === account.accountId} className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold ${candidate.accountId === account.accountId ? "border-ink bg-ink text-white" : "border-surface-border bg-white text-ink-soft"}`}>
                  {candidate.organizationName}
                </button>
              </form>
            ))}
          </div>
        ) : null}
      </header>
      <EspaceNav />
      <main className="mx-auto max-w-3xl px-4 pt-5 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
