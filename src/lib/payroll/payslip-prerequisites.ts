export type PayslipPrerequisite = {
  code: string;
  label: string;
  ready: boolean;
  detail: string;
};

export type PayslipPrerequisiteInput = {
  periodLocked: boolean;
  hasEmployees: boolean;
  calculationsComplete: boolean;
  snapshotsComplete: boolean;
  organizationSiret: string | null | undefined;
  employeePosition: string | null | undefined;
  employeeClassification: string | null | undefined;
  collectiveAgreementName: string | null | undefined;
};

export function getPayslipPrerequisites(input: PayslipPrerequisiteInput): PayslipPrerequisite[] {
  return [
    {
      code: "PERIOD_LOCKED",
      label: "Période verrouillée",
      ready: input.periodLocked,
      detail: input.periodLocked
        ? "Le calcul de paie est figé."
        : "La période doit être verrouillée avant toute génération.",
    },
    {
      code: "EMPLOYEES",
      label: "Salariés actifs",
      ready: input.hasEmployees,
      detail: input.hasEmployees
        ? "Au moins un salarié actif est présent."
        : "Aucun salarié actif n’est disponible pour cette période.",
    },
    {
      code: "CALCULATIONS",
      label: "Calculs de paie",
      ready: input.calculationsComplete,
      detail: input.calculationsComplete
        ? "Un calcul existe pour chaque salarié actif."
        : "Chaque salarié actif doit disposer d’un calcul enregistré.",
    },
    {
      code: "SNAPSHOTS",
      label: "Snapshots de calcul",
      ready: input.snapshotsComplete,
      detail: input.snapshotsComplete
        ? "Les résultats figés peuvent être reproduits."
        : "Chaque calcul doit conserver son snapshot avant génération.",
    },
    {
      code: "EMPLOYER_ID",
      label: "Identification employeur",
      ready: Boolean(input.organizationSiret?.trim()),
      detail: input.organizationSiret?.trim()
        ? "Le SIRET de l’organisation est renseigné."
        : "Le SIRET doit être renseigné pour produire un bulletin exploitable.",
    },
    {
      code: "EMPLOYEE_CONTEXT",
      label: "Contexte salarié",
      ready: Boolean(input.employeePosition?.trim() || input.employeeClassification?.trim()),
      detail:
        input.employeePosition?.trim() || input.employeeClassification?.trim()
          ? "Le bulletin dispose d’un intitulé ou d’une classification."
          : "Le poste ou la classification du salarié doit être renseigné.",
    },
    {
      code: "COLLECTIVE_AGREEMENT",
      label: "Convention collective",
      ready: Boolean(input.collectiveAgreementName?.trim()),
      detail: input.collectiveAgreementName?.trim()
        ? "La convention collective applicable est identifiée."
        : "La convention applicable doit être identifiée avant de présenter un bulletin réglementaire.",
    },
  ];
}

export function hasBlockingPayslipPrerequisites(
  prerequisites: PayslipPrerequisite[],
): boolean {
  return prerequisites.some((prerequisite) => !prerequisite.ready);
}
