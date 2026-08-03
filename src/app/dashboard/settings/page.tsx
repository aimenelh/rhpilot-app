import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { updateNotificationPreference } from "../notifications/actions";
import { updateConventionCollective, updateFunctionalRole } from "./organizationActions";

const COMMON_CCN = [
  "Syntec",
  "Métallurgie",
  "Commerce de gros",
  "Commerce de détail et de gros à prédominance alimentaire",
  "HCR (Hôtels, cafés, restaurants)",
  "Bâtiment et travaux publics (BTP)",
  "Pharmacie d'officine",
  "Banque",
  "Assurance",
  "Transport routier",
  "Immobilier",
  "Bureaux d'études techniques",
  "Cabinets d'avocats",
  "Cabinets d'experts-comptables",
  "Coiffure",
  "Aide à domicile",
  "Sport",
  "Animation",
  "Publicité",
  "Industrie pharmaceutique",
  "Automobile (services)",
  "Bricolage",
  "Restauration rapide",
  "Propreté",
  "Sécurité privée",
  "Textile",
  "Notariat",
  "Optique-lunetterie",
  "Import-export",
  "Édition",
];

export default async function SettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const canEditOrganization = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Paramètres</h1>
      <p className="mt-1 text-sm text-ink-soft">Vos préférences personnelles sur RH Pilot.</p>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Votre rôle dans l&apos;organisation</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Certaines tâches des parcours RH sont conçues pour être assignées automatiquement
          à &laquo;&nbsp;la personne RH&nbsp;&raquo; de l&apos;organisation. RH Pilot ne
          devine jamais qui occupe ce rôle — sans cette information, ces tâches restent
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
            l&apos;assignation automatique reste également désactivée — l&apos;ambiguïté
            n&apos;est jamais résolue au hasard.
          </FieldHint>

          <Button type="submit" className="mt-4">
            Enregistrer
          </Button>
        </form>
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-ink">Notifications par email</h2>
        <p className="mt-1 text-sm text-ink-soft">
          À quelle fréquence souhaitez-vous recevoir un résumé de vos actions urgentes ?
        </p>

        <form action={updateNotificationPreference} className="mt-4">
          <Label htmlFor="notificationFrequency">Fréquence</Label>
          <Select
            id="notificationFrequency"
            name="notificationFrequency"
            defaultValue={membership.notificationFrequency}
          >
            <option value="DAILY">Quotidien</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="OFF">Désactivé</option>
          </Select>
          <FieldHint>
            Ne s&apos;applique qu&apos;aux tâches qui vous sont directement assignées. Un
            rappel manuel ponctuel reste toujours possible, quelle que soit cette préférence.
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
            Renseignez celle applicable à votre organisation — RH Pilot vous orientera alors
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

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-ink">Export de vos données</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Conformément au RGPD, exportez à tout moment l&apos;ensemble des données de votre
          organisation.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a href="/api/export/employees" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              <Download size={14} />
              Salariés (CSV)
            </Button>
          </a>
          <a href="/api/export/organization" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              <Download size={14} />
              Toutes les données (JSON)
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
