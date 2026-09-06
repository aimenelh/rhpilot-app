export type PayrollPreflightSeverity = "BLOCKING" | "WARNING";

export type PayrollPreflightCode =
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
