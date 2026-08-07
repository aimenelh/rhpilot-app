import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
export const dynamic = "force-dynamic";
const ACCESS_ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
};
export default async function AboutConfigPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: { conventionCollective: true },
  });
  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/configuration"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={14} /> Configuration
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-ink">À propos</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Informations sur votre espace RH Pilot.
      </p>
      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Votre espace</h2>
        <dl className="mt-3 flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Votre rôle d&apos;accès</dt>
            <dd className="font-medium text-ink">
              {ACCESS_ROLE_LABELS[membership.accessRole] ?? membership.accessRole}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Convention collective</dt>
            <dd className="font-medium text-ink">
              {organization?.conventionCollective || "Non renseignée"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Version</dt>
            <dd className="font-medium text-ink">RH Pilot — Bêta</dd>
          </div>
        </dl>
      </Card>
      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-ink">Ressources</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Link href="/pourquoi" className="text-brand-blue hover:underline">
            Pourquoi RH Pilot ?
          </Link>
          <Link href="/cgu" className="text-brand-blue hover:underline">
            Conditions générales d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="text-brand-blue hover:underline">
            Politique de confidentialité
          </Link>
          <Link href="/cookies" className="text-brand-blue hover:underline">
            Cookies
          </Link>
        </div>
      </Card>
      <p className="mt-6 text-xs text-ink-faint">
        RH Pilot est actuellement en version bêta gratuite. Les informations d&apos;abonnement
        apparaîtront ici lors du passage en version payante.
      </p>
    </div>
  );
}
