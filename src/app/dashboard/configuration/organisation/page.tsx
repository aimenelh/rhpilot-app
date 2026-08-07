import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { updateConventionCollective, updateFunctionalRole } from "../../settings/organizationActions";
export const dynamic = "force-dynamic";
const COMMON_CCN = [
  "Syntec", "Métallurgie", "Commerce de gros",
  "Commerce de détail et de gros à prédominance alimentaire",
  "HCR (Hôtels, cafés, restaurants)", "Bâtiment et travaux publics (BTP)",
  "Pharmacie d'officine", "Banque", "Assurance", "Transport routier", "Immobilier",
  "Bureaux d'études techniques", "Cabinets d'avocats", "Cabinets d'experts-comptables",
  "Coiffure", "Aide à domicile", "Sport", "Animation", "Publicité",
  "Industrie pharmaceutique", "Automobile (services)", "Bricolage",
  "Restauration rapide", "Propreté", "Sécurité privée", "Textile", "Notariat",
  "Optique-lunetterie", "Import-export", "Édition",
];
export default async function OrganisationConfigPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  const canEditOrganization = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  });
  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/configuration"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={14} /> Configuration
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-ink">Organisation</h1>
      <p className="mt-1 text-sm text-ink-soft">Votre rôle RH et la convention collective applicable.</p>
      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Votre rôle dans l&apos;organisation</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Certaines tâches des parcours RH sont conçues pour être assignées automatiquement
          à &laquo;&nbsp;la personne RH&nbsp;&raquo; de l&apos;organisation. RH Pilot ne
          devine jamais qui occupe ce rôle. Sans cette information, ces tâches restent
          volontairement &laquo;&nbsp;À assigner&nbsp;&raquo;.
        </p>
        <form action={updateFunctionalRole} className="mt-4">
          <Label htmlFor="functionalRole">Mon rôle</Label>
          <Select
            id="functionalRole"
            name="functionalRole"
            defaultValue={membership.functionalRole ?? ""}
          >
            <option value="">Non renseigné</option>
            <option value="RH">RH</option>
            <option value="DIRIGEANT">Dirigeant</option>
          </Select>
          <FieldHint>
            Si plusieurs personnes de votre organisation sont marquées &laquo;&nbsp;RH&nbsp;&raquo;,
            l&apos;assignation automatique reste également désactivée : l&apos;ambiguïté
            n&apos;est jamais résolue au hasard.
          </FieldHint>
          <Button type="submit" className="mt-4">
            Enregistrer
          </Button>
        </form>
      </Card>
      {canEditOrganization && (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-ink">Convention collective</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Renseignez celle applicable à votre organisation. RH Pilot vous orientera alors
            vers la bonne source officielle au bon moment (embauche, période d&apos;essai,
            visite médicale), sans jamais interpréter ses règles à votre place.
          </p>
          <form action={updateConventionCollective} className="mt-4">
            <Label htmlFor="conventionCollective">Nom de la convention collective</Label>
            <Input
              id="conventionCollective"
              name="conventionCollective"
              list="ccn-suggestions"
              defaultValue={organization?.conventionCollective ?? ""}
              placeholder="Ex. Syntec"
            />
            <datalist id="ccn-suggestions">
              {COMMON_CCN.map((ccn) => (
                <option key={ccn} value={ccn} />
              ))}
            </datalist>
            <FieldHint>
              Tapez pour voir des suggestions parmi les conventions les plus courantes, ou
              indiquez la vôtre librement si elle n&apos;y figure pas. Laissez vide pour ne
              rien afficher.
            </FieldHint>
            <Button type="submit" className="mt-4">
              Enregistrer
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
