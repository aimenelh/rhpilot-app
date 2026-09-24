type EmployeeIdentityInput = {
  firstName: string;
  lastName: string;
  hireDate: Date;
};

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr-FR");
}

export function employeeIdentityKey(employee: EmployeeIdentityInput): string {
  if (Number.isNaN(employee.hireDate.getTime())) {
    throw new Error("Date d'embauche invalide pour l'identité salarié.");
  }

  return [
    normalizeName(employee.firstName),
    normalizeName(employee.lastName),
    employee.hireDate.toISOString().slice(0, 10),
  ].join("|");
}
