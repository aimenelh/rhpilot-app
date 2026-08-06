import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import { BulkTriggerForm } from "./BulkTriggerForm";

export default async function BulkTriggerPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const eventTemplates = await prisma.eventTemplate.findMany({
    where: { archivedAt: null },
    orderBy: { label: "asc" },
    select: { key: true, label: true },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Déclencher un événement en masse</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Utile pour rattraper des salariés déjà présents dans votre organisation — par exemple
        programmer un même type d&apos;échéance pour plusieurs personnes en une fois, plutôt que
        fiche par fiche.
      </p>
      <BulkTriggerForm eventTemplates={eventTemplates} />
    </div>
  );
}
