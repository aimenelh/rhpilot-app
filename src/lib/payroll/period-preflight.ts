export type PayrollPreflightSeverity = "BLOCKING" | "WARNING";

export type PayrollPreflightCode =
  | "PARTIAL_MONTH_ENTRY"
  | "PARTIAL_MONTH_EXIT"
  | "EXIT_WITHOUT_TERMINATION"
  | "OVERLAPPING_PROFILES"
  | "NO_EMPLOYEES"
  | "MISSING_PAYROLL_PROFILE"
  | "MISSING_BASE_SALARY"
  | "MISSING_MONTHLY_HOURS";

export interface PayrollPreflightEmployeeInput {
  employeeId: string;
  firstName: string;
  lastName: string;
  baseSalaryCents?: number | null;
  monthlyHours?: number | null;
  hireDate?: Date;
  contractEndDate?: Date | null;
  profileCount?: number;
  hasIncompleteMonthAdjustment?: boolean;
  /** Moteur de bulletin : fiche de sortie (motif et indemnités) saisie pour la période. */
  hasTermination?: boolean;
}

export interface PayrollPreflightIssue {
  code: PayrollPreflightCode;
  severity: PayrollPreflightSeverity;
  employeeId?: string;
  message: string;
}

export interface PayrollPreflightResult {
  ready: boolean;
  issues: PayrollPreflightIssue[];
}

/**
 * Contrôle uniquement la complétude des données salarié nécessaires à un
 * futur calcul. Il ne déduit aucune règle sociale et ne remplace pas la
 * résolution des règles légales/conventionnelles.
 */
export function checkPayrollPeriodReadiness(
  employees: PayrollPreflightEmployeeInput[],
  period?: { year: number; month: number },
  options: { bulletinEngine?: boolean } = {},
): PayrollPreflightResult {
  if (employees.length === 0) {
    return {
      ready: false,
      issues: [
        {
          code: "NO_EMPLOYEES",
          severity: "BLOCKING",
          message: "Aucun salarié actif n'est disponible pour cette période.",
        },
      ],
    };
  }

  const issues: PayrollPreflightIssue[] = [];

  for (const employee of employees) {
    const displayName = `${employee.firstName} ${employee.lastName}`.trim();

    if (period) {
      const start = `${period.year}-${String(period.month).padStart(2, "0")}-01`;
      const end = new Date(Date.UTC(period.year, period.month, 0)).toISOString().slice(0, 10);
      const hire = employee.hireDate?.toISOString().slice(0, 10);
      const exit = employee.contractEndDate?.toISOString().slice(0, 10);
      if (options.bulletinEngine) {
        // Le moteur de bulletin calcule lui-même les entrées et sorties ; une sortie exige la fiche de solde de tout compte.
        if (exit && exit >= start && exit <= end && !employee.hasTermination) issues.push({ code: "EXIT_WITHOUT_TERMINATION", severity: "BLOCKING", employeeId: employee.employeeId, message: `${displayName} : sortie le ${exit.split("-").reverse().join("/")}. Renseignez la fiche de sortie (motif et indemnités) pour établir le solde de tout compte.` });
      } else if (hire && hire > start && hire <= end && !employee.hasIncompleteMonthAdjustment) issues.push({ code: "PARTIAL_MONTH_ENTRY", severity: "BLOCKING", employeeId: employee.employeeId, message: `${displayName} : entrée en cours de mois. Renseignez un unique prorata INCOMPLETE_MONTH en euros, établi sur l’horaire réel.` });
      if (!options.bulletinEngine && exit && exit >= start && exit < end && !employee.hasIncompleteMonthAdjustment) issues.push({ code: "PARTIAL_MONTH_EXIT", severity: "BLOCKING", employeeId: employee.employeeId, message: `${displayName} : sortie en cours de mois. Renseignez un unique prorata INCOMPLETE_MONTH en euros, établi sur l’horaire réel.` });
    }
    if ((employee.profileCount ?? 0) > 1) issues.push({ code: "OVERLAPPING_PROFILES", severity: "BLOCKING", employeeId: employee.employeeId, message: `${displayName} : plusieurs profils paie couvrent cette période. Vérifiez leurs dates d’effet.` });

    if (employee.baseSalaryCents == null) {
      issues.push({
        code: "MISSING_BASE_SALARY",
        severity: "BLOCKING",
        employeeId: employee.employeeId,
        message: `Salaire brut de référence manquant pour ${displayName}.`,
      });
    } else if (!Number.isInteger(employee.baseSalaryCents) || employee.baseSalaryCents < 0) {
      issues.push({
        code: "MISSING_BASE_SALARY",
        severity: "BLOCKING",
        employeeId: employee.employeeId,
        message: `Salaire brut de référence invalide pour ${displayName}.`,
      });
    }

    if (employee.monthlyHours == null) {
      issues.push({
        code: "MISSING_MONTHLY_HOURS",
        severity: "BLOCKING",
        employeeId: employee.employeeId,
        message: `Durée mensuelle de référence manquante pour ${displayName}.`,
      });
    } else if (!Number.isFinite(employee.monthlyHours) || employee.monthlyHours <= 0) {
      issues.push({
        code: "MISSING_MONTHLY_HOURS",
        severity: "BLOCKING",
        employeeId: employee.employeeId,
        message: `Durée mensuelle de référence invalide pour ${displayName}.`,
      });
    }
  }

  const employeesWithAnyProfileData = employees.filter(
    (employee) => employee.baseSalaryCents != null || employee.monthlyHours != null,
  ).length;

  if (employeesWithAnyProfileData < employees.length) {
    for (const employee of employees) {
      if (employee.baseSalaryCents == null && employee.monthlyHours == null) {
        issues.push({
          code: "MISSING_PAYROLL_PROFILE",
          severity: "BLOCKING",
          employeeId: employee.employeeId,
          message: `Profil paie absent pour ${employee.firstName} ${employee.lastName}.`,
        });
      }
    }
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}
