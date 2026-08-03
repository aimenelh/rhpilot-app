"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import type { EmployeeFormState } from "./actions";

type ManagerOption = { id: string; label: string };

type DefaultValues = {
  firstName: string;
  lastName: string;
  civility: string; // "" | "MME" | "M" | "AUTRE"
  professionalCategory: string; // "" | "CADRE" | "AGENT_DE_MAITRISE" | "EMPLOYE" | "OUVRIER" | "AUTRE"
  position: string;
  hireDate: string; // format YYYY-MM-DD
  contractType: string; // "" | "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION"
  contractEndDate: string; // "" ou YYYY-MM-DD — pertinent pour CDD/apprentissage/professionnalisation
  probationDuration: string; // "" ou un nombre en chaîne
  probationDurationUnit: string; // "" | "DAYS" | "WEEKS" | "MONTHS"
  nextMedicalVisitDate: string; // "" ou YYYY-MM-DD
  managerMembershipId: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" data-tour="submit-employee" disabled={pending}>
      {pending ? "Enregistrement..." : label}
    </Button>
  );
}

export function EmployeeForm({
  action,
  defaultValues,
  potentialManagers,
  submitLabel,
}: {
  action: (state: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  defaultValues: DefaultValues;
  potentialManagers: ManagerOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<EmployeeFormState, FormData>(action, undefined);

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        {state?.error && (
          <p
            role="alert"
            className="rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose"
          >
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-[1fr_2fr_2fr] gap-4">
          <div>
            <Label htmlFor="civility">Civilité</Label>
            <Select id="civility" name="civility" defaultValue={defaultValues.civility}>
              <option value="">Non renseigné</option>
              <option value="MME">Mme</option>
              <option value="M">M.</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" name="firstName" defaultValue={defaultValues.firstName} required />
          </div>
          <div>
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" name="lastName" defaultValue={defaultValues.lastName} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="position">Poste</Label>
            <Input
              id="position"
              name="position"
              defaultValue={defaultValues.position}
              placeholder="Ex. Secrétaire médicale"
            />
          </div>
          <div>
            <Label htmlFor="professionalCategory">Catégorie professionnelle</Label>
            <Select
              id="professionalCategory"
              name="professionalCategory"
              defaultValue={defaultValues.professionalCategory}
            >
              <option value="">Non renseigné</option>
              <option value="CADRE">Cadre</option>
              <option value="AGENT_DE_MAITRISE">Agent de maîtrise</option>
              <option value="EMPLOYE">Employé</option>
              <option value="OUVRIER">Ouvrier</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="hireDate">Date d&apos;embauche</Label>
          <Input
            id="hireDate"
            name="hireDate"
            type="date"
            defaultValue={defaultValues.hireDate}
            required
          />
        </div>

        <div>
          <Label htmlFor="contractType">Type de contrat</Label>
          <Select id="contractType" name="contractType" defaultValue={defaultValues.contractType}>
            <option value="">Non défini</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="APPRENTISSAGE">Contrat d&apos;apprentissage</option>
            <option value="PROFESSIONNALISATION">Contrat de professionnalisation</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="contractEndDate">Date de fin de contrat</Label>
          <Input
            id="contractEndDate"
            name="contractEndDate"
            type="date"
            defaultValue={defaultValues.contractEndDate}
          />
          <FieldHint>
            À renseigner pour un CDD ou un contrat d&apos;apprentissage/professionnalisation,
            sans objet pour un CDI. RH Pilot vous préviendra simplement quand cette date
            approche, sans rien déclencher automatiquement.
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="probationDuration">Durée de la période d&apos;essai</Label>
          <div className="flex gap-2">
            <Input
              id="probationDuration"
              name="probationDuration"
              type="number"
              min={0}
              max={365}
              className="w-28"
              defaultValue={defaultValues.probationDuration}
            />
            <Select
              name="probationDurationUnit"
              defaultValue={defaultValues.probationDurationUnit || "MONTHS"}
              className="flex-1"
            >
              <option value="DAYS">Jours</option>
              <option value="WEEKS">Semaines</option>
              <option value="MONTHS">Mois</option>
            </Select>
          </div>
          <FieldHint>
            Sert uniquement à pré-remplir (jamais imposer) la date suggérée lors du
            déclenchement de l&apos;événement correspondant (par exemple 45 jours pour un
            contrat d&apos;apprentissage, plutôt qu&apos;un raisonnement forcé en mois).
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="managerMembershipId">Manager direct</Label>
          <Select
            id="managerMembershipId"
            name="managerMembershipId"
            defaultValue={defaultValues.managerMembershipId}
          >
            <option value="">Non défini</option>
            {potentialManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.label}
              </option>
            ))}
          </Select>
          <FieldHint>
            Seules les personnes ayant un compte RH Pilot dans votre organisation
            peuvent être désignées comme manager direct.
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="nextMedicalVisitDate">Prochaine visite médicale</Label>
          <Input
            id="nextMedicalVisitDate"
            name="nextMedicalVisitDate"
            type="date"
            defaultValue={defaultValues.nextMedicalVisitDate}
          />
          <FieldHint>
            Renseignée généralement à la fin d&apos;un parcours "Visite médicale", mais
            modifiable directement ici à tout moment.
          </FieldHint>
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Link href="/dashboard/employees">
            <Button type="button" variant="secondary">
              Annuler
            </Button>
          </Link>
          <SubmitButton label={submitLabel} />
        </div>
      </form>
    </Card>
  );
}
