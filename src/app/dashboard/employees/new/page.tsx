import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEmployee } from "../actions";
import { EmployeeForm } from "../EmployeeForm";
import { getUserDisplayName } from "@/lib/displayName";

export default async function NewEmployeePage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const memberships = await prisma.membership.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const potentialManagers = memberships.map((m) => ({
    id: m.id,
    label: `${getUserDisplayName(m.user)} (${m.user.email})`,
  }));

  return (
    <div className="max-w-xl">
      <Link href="/dashboard/employees" className="text-sm text-ink-soft hover:text-ink">
        ← Retour aux salariés
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-ink">Ajouter un salarié</h1>

      <div className="mt-6">
        <EmployeeForm
          action={createEmployee}
          submitLabel="Enregistrer"
          potentialManagers={potentialManagers}
          defaultValues={{
            firstName: "",
            lastName: "",
            position: "",
            hireDate: "",
            civility: "",
            professionalCategory: "",
            contractType: "",
            contractEndDate: "",
            probationDuration: "",
            probationDurationUnit: "",
            nextMedicalVisitDate: "",
            managerMembershipId: "",
          }}
        />
      </div>
    </div>
  );
}
