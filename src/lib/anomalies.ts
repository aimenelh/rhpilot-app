import { prisma } from "@/lib/prisma";
import { daysUntil } from "@/lib/urgency";
import { addDuration } from "@/lib/format";

export type AnomalySeverity = "critical" | "medium" | "low";

export type Anomaly = {
  key: string;
  severity: AnomalySeverity;
  message: string;
  action: {
    label: string;
    employeeId: string;
    eventTemplateKey: string;
    triggerDate: string; // YYYY-MM-DD, déjà calculée par le détecteur
  } | null;
  // Alternative à `action` pour les anomalies qui ne se résolvent pas
  // en déclenchant un événement, mais en complétant une information
  // (ex. renseigner un manager) — reste actionnable en un clic, juste
  // vers un autre endroit du produit.
  link?: { label: string; href: string };
};

type AnomalyDetector = (organizationId: string) => Promise<Anomaly[]>;

const SEVERITY_ORDER: Record<AnomalySeverity, number> = { critical: 0, medium: 1, low: 2 };

/**
 * Un salarié dont on connaît la durée de période d'essai, dont la fin
 * calculée approche (30 jours) ou est dépassée depuis peu (45 jours
 * maximum), et pour lequel aucun événement "Fin de période d'essai"
 * n'a jamais été déclenché. Déjà dépassée = critique (échéance
 * ratée) ; approche encore = moyen (à préparer, pas encore un oubli).
 *
 * Deux garde-fous, pas un seul : le salarié doit avoir été embauché
 * dans les 365 derniers jours, ET le dépassement ne doit pas remonter
 * à plus de 45 jours. Le premier ne suffisait pas : un import CSV ne
 * crée jamais d'historique de parcours, donc même un salarié embauché
 * récemment (150-280 jours) sans aucun événement déclenché se
 * retrouvait signalé — alors qu'un dépassement aussi ancien sans
 * qu'aucun signe d'action n'existe est presque toujours soit déjà
 * traité en dehors de RH Pilot, soit une simple donnée d'import, pas
 * un oubli à traiter aujourd'hui.
 */
async function detectProbationEndingWithoutEvent(organizationId: string): Promise<Anomaly[]> {
  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      deletedAt: null,
      probationDuration: { not: null },
      probationDurationUnit: { not: null },
    },
  });

  const anomalies: Anomaly[] = [];
  for (const employee of employees) {
    if (daysUntil(employee.hireDate) < -365) continue;

    const alreadyTriggered = await prisma.employeeEvent.findFirst({
      where: {
        organizationId,
        employeeId: employee.id,
        eventTemplate: { key: "fin_periode_essai" },
        deletedAt: null,
      },
    });
    if (alreadyTriggered) continue;

    const endDate = addDuration(employee.hireDate, employee.probationDuration!, employee.probationDurationUnit!);
    const diff = daysUntil(endDate);
    if (diff > 30) continue;
    if (diff < -45) continue;

    anomalies.push({
      key: `probation-${employee.id}`,
      severity: diff < 0 ? "critical" : "medium",
      message:
        diff < 0
          ? `${employee.firstName} ${employee.lastName} a dépassé la fin de période d'essai prévue (il y a ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}) sans parcours déclenché.`
          : `${employee.firstName} ${employee.lastName} termine sa période d'essai dans ${diff} jour${diff > 1 ? "s" : ""}.`,
      action: {
        label: "Générer le parcours",
        employeeId: employee.id,
        eventTemplateKey: "fin_periode_essai",
        triggerDate: endDate.toISOString().slice(0, 10),
      },
    });
  }
  return anomalies;
}

/**
 * Un salarié embauché depuis plus de 7 jours sans qu'aucun événement
 * "Embauche" n'ait jamais été déclenché pour lui — un oubli plausible
 * sur un cas récent, donc critique (contrairement aux données
 * manquantes, ce n'est pas juste "à compléter un jour").
 */
/**
 * Un salarié embauché depuis plus de 7 jours sans qu'aucun événement
 * "Embauche" n'ait jamais été déclenché pour lui — un oubli plausible
 * sur un cas récent, donc critique (contrairement aux données
 * manquantes, ce n'est pas juste "à compléter un jour").
 *
 * Limité aux salariés embauchés dans les 60 derniers jours — pas 365.
 * Le même défaut que le détecteur de période d'essai touchait
 * celui-ci aussi : un import CSV ne crée jamais d'événement, donc
 * n'importe quel salarié embauché "récemment" au sens large (jusqu'à
 * un an) se retrouvait signalé, même à 300 jours. Passé 60 jours sans
 * aucun signe d'action, ce n'est plus un oubli à traiter aujourd'hui
 * — soit c'est déjà géré ailleurs, soit c'est une donnée historique.
 */
async function detectMissingOnboardingEvent(organizationId: string): Promise<Anomaly[]> {
  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null },
  });

  const anomalies: Anomaly[] = [];
  for (const employee of employees) {
    const daysSinceHire = Math.abs(daysUntil(employee.hireDate));
    if (daysUntil(employee.hireDate) > -7) continue;
    if (daysSinceHire > 60) continue;

    const alreadyTriggered = await prisma.employeeEvent.findFirst({
      where: { organizationId, employeeId: employee.id, eventTemplate: { key: "embauche" }, deletedAt: null },
    });
    if (alreadyTriggered) continue;

    anomalies.push({
      key: `onboarding-${employee.id}`,
      severity: "critical",
      message: `${employee.firstName} ${employee.lastName} a été embauché·e il y a ${daysSinceHire} jours sans qu'aucun parcours d'embauche n'ait été déclenché.`,
      action: {
        label: "Créer le parcours",
        employeeId: employee.id,
        eventTemplateKey: "embauche",
        triggerDate: employee.hireDate.toISOString().slice(0, 10),
      },
    });
  }
  return anomalies;
}

/**
 * Un salarié actif sans manager direct renseigné. Signal faible :
 * toutes les PME n'organisent pas leurs salariés autour d'un manager
 * pour chacun, donc ce n'est pas systématiquement un oubli — juste un
 * point à vérifier, jamais urgent.
 */
async function detectEmployeeWithoutManager(organizationId: string): Promise<Anomaly[]> {
  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null, managerMembershipId: null },
  });

  return employees.map((employee) => ({
    key: `no-manager-${employee.id}`,
    severity: "low",
    message: `${employee.firstName} ${employee.lastName} n'a pas de manager direct renseigné.`,
    action: null,
    link: { label: "Renseigner un manager", href: `/dashboard/employees/${employee.id}` },
  }));
}

/**
 * Fiche incomplète (contrat ou durée d'essai manquants) — limité aux
 * salariés embauchés récemment (moins de 6 mois), la période d'essai
 * n'étant plus une donnée pertinente pour un ancien. Signal faible :
 * de l'hygiène de données, jamais un oubli qui coûte quelque chose.
 */
async function detectEmployeeMissingContractInfo(organizationId: string): Promise<Anomaly[]> {
  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      deletedAt: null,
      OR: [{ contractType: null }, { probationDuration: null }],
    },
  });

  return employees
    .filter((employee) => daysUntil(employee.hireDate) > -180)
    .map((employee) => ({
      key: `missing-contract-${employee.id}`,
      severity: "low",
      message: `${employee.firstName} ${employee.lastName} n'a pas de type de contrat ou de durée de période d'essai renseignés : les suggestions de fin de période d'essai ne peuvent pas être calculées pour cette personne.`,
      action: null,
      link: { label: "Compléter la fiche", href: `/dashboard/employees/${employee.id}` },
    }));
}

/**
 * Un salarié embauché depuis plus d'un an, sans qu'aucun parcours
 * "Visite médicale" n'ait jamais été déclenché pour lui, et sans
 * prochaine échéance renseignée. Signal moyen : à prévoir, pas encore
 * un oubli daté et chiffrable comme une échéance dépassée.
 */
async function detectMedicalVisitNeverScheduled(organizationId: string): Promise<Anomaly[]> {
  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null, nextMedicalVisitDate: null },
  });

  const anomalies: Anomaly[] = [];
  for (const employee of employees) {
    if (daysUntil(employee.hireDate) > -365) continue;

    const alreadyTriggered = await prisma.employeeEvent.findFirst({
      where: { organizationId, employeeId: employee.id, eventTemplate: { key: "visite_medicale" }, deletedAt: null },
    });
    if (alreadyTriggered) continue;

    anomalies.push({
      key: `medical-visit-never-${employee.id}`,
      severity: "medium",
      message: `Aucune visite médicale n'a jamais été programmée pour ${employee.firstName} ${employee.lastName}, embauché·e il y a plus d'un an.`,
      action: {
        label: "Générer le parcours",
        employeeId: employee.id,
        eventTemplateKey: "visite_medicale",
        triggerDate: new Date().toISOString().slice(0, 10),
      },
    });
  }
  return anomalies;
}

/**
 * Une prochaine échéance de suivi médical déjà renseignée, mais
 * dépassée — critique : une date connue, ratée, pas juste un point de
 * vigilance.
 */
async function detectMedicalVisitOverdue(organizationId: string): Promise<Anomaly[]> {
  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null, nextMedicalVisitDate: { not: null } },
  });

  const anomalies: Anomaly[] = [];
  for (const employee of employees) {
    if (!employee.nextMedicalVisitDate) continue;
    const diff = daysUntil(employee.nextMedicalVisitDate);
    if (diff >= 0) continue;

    anomalies.push({
      key: `medical-visit-overdue-${employee.id}`,
      severity: "critical",
      message: `La prochaine visite médicale de ${employee.firstName} ${employee.lastName} était prévue il y a ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}.`,
      action: {
        label: "Générer le parcours",
        employeeId: employee.id,
        eventTemplateKey: "visite_medicale",
        triggerDate: new Date().toISOString().slice(0, 10),
      },
    });
  }
  return anomalies;
}

/**
 * Un CDD, un apprentissage ou une professionnalisation dont la date
 * de fin approche (30 jours) ou est dépassée. Volontairement sans
 * "action" de type "Générer le parcours" — il n'existe pas encore de
 * parcours "Fin de contrat" dans RH Pilot (certificat de travail,
 * solde de tout compte...), et on ne veut surtout pas laisser croire
 * le contraire. Juste un constat factuel, avec un lien vers la fiche.
 */
async function detectContractEndingApproaching(organizationId: string): Promise<Anomaly[]> {
  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null, contractEndDate: { not: null } },
  });

  const anomalies: Anomaly[] = [];
  for (const employee of employees) {
    if (!employee.contractEndDate) continue;
    const diff = daysUntil(employee.contractEndDate);
    if (diff > 30) continue;

    anomalies.push({
      key: `contract-ending-${employee.id}`,
      severity: diff < 0 ? "critical" : "medium",
      message:
        diff < 0
          ? `Le contrat de ${employee.firstName} ${employee.lastName} est arrivé à échéance il y a ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}.`
          : `Le contrat de ${employee.firstName} ${employee.lastName} arrive à échéance dans ${diff} jour${diff > 1 ? "s" : ""}.`,
      action: null,
      link: { label: "Voir la fiche", href: `/dashboard/employees/${employee.id}` },
    });
  }
  return anomalies;
}

// Registre extensible : chaque nouvelle règle d'anomalie (visite
// médicale bientôt due, document obligatoire manquant...) s'ajoute ici
// comme une fonction supplémentaire, sans toucher à la façon dont les
// anomalies sont affichées ou déclenchées.
const DETECTORS: AnomalyDetector[] = [
  detectProbationEndingWithoutEvent,
  detectMissingOnboardingEvent,
  detectEmployeeWithoutManager,
  detectEmployeeMissingContractInfo,
  detectMedicalVisitNeverScheduled,
  detectMedicalVisitOverdue,
  detectContractEndingApproaching,
];

export async function getAnomalies(organizationId: string): Promise<Anomaly[]> {
  const results = await Promise.all(DETECTORS.map((detector) => detector(organizationId)));
  return results.flat().sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
