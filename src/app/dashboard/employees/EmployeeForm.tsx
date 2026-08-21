"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import type { EmployeeFormState } from "./actions";
import { isWeekend } from "@/lib/format";

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

// Durées maximales légales de la période d'essai en CDI, article
// L1221-19 du Code du travail. Ce sont des plafonds, pas des valeurs
// imposées : une convention collective peut prévoir plus court,
// jamais plus long (confirmé par la loi DDADUE du 9 mars 2023, qui a
// mis fin aux rares régimes de branche antérieurs à 2008 qui
// dépassaient encore ces plafonds).
const CDI_PROBATION_MONTHS: Record<string, number> = {
  CADRE: 4,
  AGENT_DE_MAITRISE: 3,
  EMPLOYE: 2,
  OUVRIER: 2,
};

const CATEGORY_LABELS: Record<string, string> = {
  CADRE: "cadre",
  AGENT_DE_MAITRISE: "agent de maîtrise ou technicien",
  EMPLOYE: "employé",
  OUVRIER: "ouvrier",
};

// Article L1242-10 : en CDD, un jour d'essai par semaine de contrat,
// plafonné à 2 semaines pour un contrat de 6 mois ou moins, et à 1
// mois au-delà, quelle que soit la durée totale du contrat.
function computeCddProbationDays(hireDate: string, contractEndDate: string): number | null {
  if (!hireDate || !contractEndDate) return null;
  const start = new Date(hireDate);
  const end = new Date(contractEndDate);
  const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (durationDays <= 0) return null;

  if (durationDays <= 182) {
    return Math.max(1, Math.min(Math.floor(durationDays / 7), 14));
  }
  return 30;
}

function getLegalProbationSuggestion(
  contractType: string,
  professionalCategory: string,
  hireDate: string,
  contractEndDate: string
): { duration: string; unit: string; hint: string } | null {
  if (contractType === "CDI") {
    const months = CDI_PROBATION_MONTHS[professionalCategory];
    if (!months) return null;
    return {
      duration: String(months),
      unit: "MONTHS",
      hint: `Délai légal maximum selon le Code du travail (art. L1221-19) pour un ${CATEGORY_LABELS[professionalCategory]} en CDI : ${months} mois. Votre convention collective peut prévoir une durée plus courte, jamais plus longue : modifiez librement ce champ si besoin.`,
    };
  }
  if (contractType === "CDD") {
    const days = computeCddProbationDays(hireDate, contractEndDate);
    if (days == null) return null;
    return {
      duration: String(days),
      unit: "DAYS",
      hint: `Délai légal maximum selon le Code du travail (art. L1242-10) pour un CDD de cette durée : ${days} jour${days > 1 ? "s" : ""}. Votre convention collective peut prévoir une durée plus courte, jamais plus longue : modifiez librement ce champ si besoin.`,
    };
  }
  return null;
}

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
  const [contractType, setContractType] = useState(defaultValues.contractType);
  const [hireDate, setHireDate] = useState(defaultValues.hireDate);
  const [contractEndDate, setContractEndDate] = useState(defaultValues.contractEndDate);
  const [professionalCategory, setProfessionalCategory] = useState(defaultValues.professionalCategory);
  const [probationDuration, setProbationDuration] = useState(defaultValues.probationDuration);
  const [probationDurationUnit, setProbationDurationUnit] = useState(
    defaultValues.probationDurationUnit || "MONTHS"
  );
  // Dès que quelqu'un touche directement à la durée ou à l'unité, on
  // arrête de la recalculer automatiquement en arrière-plan — sinon
  // un ajustement manuel pour coller à une convention collective
  // serait écrasé au moindre changement de date. Une valeur déjà
  // présente à l'ouverture du formulaire (fiche existante) compte
  // aussi comme "déjà décidée par quelqu'un".
  const [probationTouched, setProbationTouched] = useState(Boolean(defaultValues.probationDuration));

  const showContractEndDate = ["CDD", "APPRENTISSAGE", "PROFESSIONNALISATION"].includes(contractType);

  useEffect(() => {
    if (probationTouched) return;
    const suggestion = getLegalProbationSuggestion(
      contractType,
      professionalCategory,
      hireDate,
      contractEndDate
    );
    if (suggestion) {
      setProbationDuration(suggestion.duration);
      setProbationDurationUnit(suggestion.unit);
    } else {
      setProbationDuration("");
    }
  }, [contractType, professionalCategory, hireDate, contractEndDate, probationTouched]);

  const legalSuggestion = getLegalProbationSuggestion(
    contractType,
    professionalCategory,
    hireDate,
    contractEndDate
  );

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
              value={professionalCategory}
              onChange={(event) => setProfessionalCategory(event.target.value)}
            >
              <option value="">Non renseigné</option>
              <option value="CADRE">Cadre</option>
              <option value="AGENT_DE_MAITRISE">Agent de maîtrise</option>
              <option value="EMPLOYE">Employé</option>
              <option value="OUVRIER">Ouvrier</option>
              <option value="AUTRE">Autre</option>
            </Select>
            {contractType === "CDI" && !professionalCategory && (
              <FieldHint>
                Renseignez la catégorie pour pré-remplir la durée légale de la période
                d&apos;essai.
              </FieldHint>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="hireDate">Date d&apos;embauche</Label>
          <Input
            id="hireDate"
            name="hireDate"
            type="date"
            value={hireDate}
            onChange={(event) => setHireDate(event.target.value)}
            required
          />
          {isWeekend(hireDate) && (
            <FieldHint>
              Cette date tombe un week-end, vérifiez qu&apos;elle correspond bien à votre
              intention.
            </FieldHint>
          )}
        </div>

        <div>
          <Label htmlFor="contractType">Type de contrat</Label>
          <Select
            id="contractType"
            name="contractType"
            value={contractType}
            onChange={(event) => setContractType(event.target.value)}
          >
            <option value="">Non défini</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="APPRENTISSAGE">Contrat d&apos;apprentissage</option>
            <option value="PROFESSIONNALISATION">Contrat de professionnalisation</option>
          </Select>
        </div>

        {showContractEndDate && (
          <div>
            <Label htmlFor="contractEndDate">Date de fin de contrat</Label>
            <Input
              id="contractEndDate"
              name="contractEndDate"
              type="date"
              value={contractEndDate}
              onChange={(event) => setContractEndDate(event.target.value)}
            />
            {isWeekend(contractEndDate) && (
              <FieldHint>
                Cette date tombe un week-end, vérifiez qu&apos;elle correspond bien à votre
                intention.
              </FieldHint>
            )}
            <FieldHint>
              RH Pilot vous préviendra simplement quand cette date approche, sans rien
              déclencher automatiquement.
            </FieldHint>
            {contractType === "CDD" && !contractEndDate && (
              <FieldHint>
                Renseignez cette date pour pré-remplir la durée légale de la période
                d&apos;essai.
              </FieldHint>
            )}
          </div>
        )}

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
              value={probationDuration}
              onChange={(event) => {
                setProbationDuration(event.target.value);
                setProbationTouched(true);
              }}
            />
            <Select
              name="probationDurationUnit"
              value={probationDurationUnit}
              onChange={(event) => {
                setProbationDurationUnit(event.target.value);
                setProbationTouched(true);
              }}
              className="flex-1"
            >
              <option value="DAYS">Jours</option>
              <option value="WEEKS">Semaines</option>
              <option value="MONTHS">Mois</option>
            </Select>
          </div>
          {legalSuggestion ? (
            <FieldHint>{legalSuggestion.hint}</FieldHint>
          ) : ["APPRENTISSAGE", "PROFESSIONNALISATION"].includes(contractType) ? (
            <FieldHint>
              Ces contrats suivent un régime différent du CDI et du CDD pour la période
              d&apos;essai, RH Pilot ne le pré-calcule pas : renseignez la durée
              vous-même.
            </FieldHint>
          ) : (
            <FieldHint>
              Sert uniquement à pré-remplir (jamais imposer) la date suggérée lors du
              déclenchement de l&apos;événement correspondant.
            </FieldHint>
          )}
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
