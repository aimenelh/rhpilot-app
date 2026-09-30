import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DashboardWorkspace } from "@/app/dashboard/DashboardWorkspace";
import type { DashboardTask } from "@/app/dashboard/dashboardModel";
import "@/app/dashboard/dashboard-fil.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aperçu du nouveau tableau de bord", robots: { index: false, follow: false } };

/** Aperçu isolé : disponible en développement et sur Vercel Preview, jamais en production. */
export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  const fixture = (id: string, label: string, date: string, eventId: string, eventLabel: string, employeeName: string, assignedName: string, mine = false): DashboardTask => ({ id, label, dueDate: `${date}T10:00:00.000Z`, eventId, eventLabel, employeeId: `preview-${eventId}`, employeeName, assignedName, isMine: mine, canComplete: false, proofRequired: false });
  const tasks = [
    fixture("preview-1", "Transmettre la DPAE", "2026-09-29", "lea", "Embauche", "Léa Martin", "Sophie Robert"),
    fixture("preview-2", "Vérifier le délai de prévenance", "2026-09-28", "karim", "Fin de période d’essai", "Karim Benali", "Aïmen El Housseini", true),
    fixture("preview-3", "Confirmer le rendez-vous", "2026-10-02", "julie", "Visite médicale", "Julie Dubois", "Sophie Robert"),
    fixture("preview-4", "Préparer son premier jour", "2026-10-05", "lea", "Embauche", "Léa Martin", "Thomas Morel"),
    fixture("preview-5", "Faire le point avec Karim", "2026-10-06", "karim", "Fin de période d’essai", "Karim Benali", "Aïmen El Housseini", true),
    fixture("preview-6", "Accueillir Léa dans l’équipe", "2026-10-05", "lea", "Embauche", "Léa Martin", "Thomas Morel"),
  ];
  tasks[2].previewStatus = "Convocation reçue";
  tasks[3].previewStatus = "3 étapes sur 5";
  tasks[4].previewStatus = "Entretien à prévoir";
  return <AppShell organizationName="Atelier & Co" accessRole="ADMIN" payrollEnabled={false} discoveryTourCompleted aiEnabled={false} assistantSummary={{ userDisplayName: "Aïmen El Housseini", overdueCount: 2, suggestionsCount: 0 }} rhNews={[]} demoExpiresAt={null} employeeCount={12} pendingRequestsCount={2} preview>
    <DashboardWorkspace organizationName="Atelier & Co" teamNames={["Léa Martin", "Karim Benali", "Julie Dubois"]} nextArrival={{ name: "Léa Martin", date: "2026-10-05T10:00:00.000Z" }} firstName="Aïmen" today="2026-09-30T09:00:00.000Z" admin employeeCount={12} tasks={tasks} requests={[
      { id: "preview-absence-1", employeeName: "Julie Dubois", startDate: "2026-10-12T00:00:00.000Z", endDate: "2026-10-16T00:00:00.000Z", justification: false },
      { id: "preview-absence-2", employeeName: "Hugo Petit", startDate: "2026-09-29T00:00:00.000Z", endDate: "2026-09-29T00:00:00.000Z", justification: true },
    ]} overdueCount={2} soonCount={4} activity={[{ id: "preview-activity", label: "Sophie a préparé le contrat de Léa Martin.", actor: null, date: "2026-09-30T07:12:00.000Z" }]} copilot={<div className="fil-preview-copilot"><div><h2>Votre Copilote RH</h2><p>Un peu de clarté pour la suite.</p></div><p>Le Copilote répond à partir de vos données dans l’espace connecté.</p><a href="/dashboard">Ouvrir mon espace</a></div>} preview/>
  </AppShell>;
}
