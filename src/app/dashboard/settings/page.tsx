import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select, FieldHint } from "@/components/ui/Field";
import { updateNotificationPreference } from "../notifications/actions";

export default async function SettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Paramètres</h1>
      <p className="mt-1 text-sm text-ink-soft">Vos préférences personnelles sur RH Pilot.</p>

      <Card className="mt-6">
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
