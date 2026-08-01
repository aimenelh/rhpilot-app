// prisma/seed.ts
//
// Peuple les gabarits (EventTemplate + TaskTemplate) des deux
// parcours Embauche et Fin de période d'essai.
// Rejouable en toute sécurité : chaque TaskTemplate est identifié
// par une clé technique stable (`key`), upsertée plutôt que
// recréée — fonctionne même après création de vraies instances
// (Task), contrairement à un deleteMany/createMany.
//
// Exécution : npx prisma db seed
// (nécessite dans package.json : "prisma": { "seed": "tsx prisma/seed.ts" })

import {
  PrismaClient,
  FunctionalRoleResolution,
  DeadlineType,
} from "@prisma/client";

const prisma = new PrismaClient();

// Logique proofRequired / proofLabel (appliquée dans tout ce fichier) :
// - proofRequired = true                         → pièce obligatoire
// - proofRequired = false, proofLabel renseigné   → pièce facultative suggérée
// - proofRequired = false, proofLabel absent       → aucune pièce attendue
type TaskTemplateSeed = {
  key: string;
  label: string;
  stepOrder: number;
  dueOffsetDays: number;
  deadlineType: DeadlineType;
  defaultFunctionalRole: FunctionalRoleResolution;
  proofRequired: boolean;
  proofLabel?: string;
};

type EventTemplateSeed = {
  key: string;
  label: string;
  description: string;
  tasks: TaskTemplateSeed[];
};

const EVENT_TEMPLATES: EventTemplateSeed[] = [
  {
    key: "embauche",
    label: "Embauche",
    description:
      "Parcours déclenché à l'arrivée d'un nouveau salarié, de la préparation du contrat au point d'intégration à 30 jours et au suivi de la visite médicale.",
    tasks: [
      {
        key: "embauche_preparation_contrat",
        label: "Préparer le contrat de travail",
        stepOrder: 1,
        dueOffsetDays: -10,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
      },
      {
        key: "embauche_dpae",
        label: "Déclarer la DPAE",
        stepOrder: 2,
        dueOffsetDays: -3,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: true,
        proofLabel: "Accusé de réception DPAE",
      },
      {
        key: "embauche_poste",
        label: "Préparer le poste de travail",
        stepOrder: 3,
        dueOffsetDays: -2,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.MANAGER_DIRECT,
        proofRequired: false,
      },
      {
        key: "embauche_signature_contrat",
        label: "Faire signer et récupérer le contrat de travail",
        stepOrder: 4,
        dueOffsetDays: -1,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: true,
        proofLabel: "Contrat de travail signé",
      },
      {
        key: "embauche_accueil",
        label: "Accueillir le salarié",
        stepOrder: 5,
        dueOffsetDays: 0,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.MANAGER_DIRECT,
        proofRequired: false,
      },
      {
        key: "embauche_visite_medicale_demande",
        label: "Programmer/demander la visite médicale",
        stepOrder: 6,
        dueOffsetDays: 15,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
        proofLabel: "Demande ou convocation",
      },
      {
        key: "embauche_point_30j",
        label: "Réaliser le point d'intégration à 30 jours",
        stepOrder: 7,
        dueOffsetDays: 30,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.MANAGER_DIRECT,
        proofRequired: false,
      },
      {
        key: "embauche_visite_medicale_suivi",
        label: "Suivre la réalisation de la visite médicale",
        stepOrder: 8,
        dueOffsetDays: 45,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        // Pas de pièce jointe au MVP : donnée de santé au travail,
        // le document reste dans le système sécurisé habituel de
        // l'entreprise. RH Pilot ne trace que le fait et la date
        // (via Task.completedAt).
        proofRequired: false,
      },
    ],
  },
  {
    key: "fin_periode_essai",
    label: "Fin de période d'essai",
    description:
      "Parcours déclenché avant l'échéance de la période d'essai, de la vérification du délai de prévenance à la clôture du dossier.",
    tasks: [
      {
        key: "fin_essai_delai_prevenance",
        label: "Vérifier le délai de prévenance applicable",
        stepOrder: 1,
        dueOffsetDays: -21,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
      },
      {
        key: "fin_essai_entretien_bilan",
        label: "Réaliser l'entretien de bilan de période d'essai",
        stepOrder: 2,
        dueOffsetDays: -15,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.MANAGER_DIRECT,
        proofRequired: false,
        proofLabel: "Compte-rendu d'entretien",
      },
      {
        key: "fin_essai_decision",
        label: "Décider de la confirmation ou de la rupture",
        stepOrder: 3,
        dueOffsetDays: -7,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.DIRIGEANT,
        proofRequired: false,
      },
      {
        key: "fin_essai_formalisation",
        label:
          "Formaliser la décision si nécessaire selon la décision prise et les règles applicables",
        stepOrder: 4,
        dueOffsetDays: -3,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
        proofLabel: "Document de formalisation de la décision",
      },
      {
        key: "fin_essai_cloture",
        label: "Clôturer le dossier de période d'essai",
        stepOrder: 5,
        dueOffsetDays: 0,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
      },
    ],
  },
  {
    key: "visite_medicale",
    label: "Visite médicale",
    description:
      "Parcours déclenchable à tout moment (pas seulement à l'embauche) pour organiser une visite médicale — suivi périodique, visite de reprise, etc.",
    tasks: [
      {
        key: "visite_medicale_identifier_type",
        label: "Identifier le type de suivi requis (standard, renforcé...)",
        stepOrder: 1,
        dueOffsetDays: -30,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
      },
      {
        key: "visite_medicale_prendre_rdv",
        label: "Prendre rendez-vous auprès du service de santé au travail",
        stepOrder: 2,
        dueOffsetDays: -21,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
        proofLabel: "Convocation ou accusé de rendez-vous",
      },
      {
        key: "visite_medicale_informer_salarie",
        label: "Informer le salarié de la date et du lieu du rendez-vous",
        stepOrder: 3,
        dueOffsetDays: -14,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
      },
      {
        key: "visite_medicale_realisation",
        label: "Confirmer que la visite a été réalisée",
        stepOrder: 4,
        dueOffsetDays: 0,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        // Pas de pièce jointe : donnée de santé au travail, cohérent
        // avec le traitement déjà appliqué au parcours Embauche.
        proofRequired: false,
      },
      {
        key: "visite_medicale_prochaine_echeance",
        label: "Mettre à jour la fiche du salarié avec la prochaine date de suivi médical",
        stepOrder: 5,
        dueOffsetDays: 7,
        deadlineType: DeadlineType.ORGANIZATIONAL_DEFAULT,
        defaultFunctionalRole: FunctionalRoleResolution.RH,
        proofRequired: false,
      },
    ],
  },
];

async function main() {
  for (const template of EVENT_TEMPLATES) {
    const eventTemplate = await prisma.eventTemplate.upsert({
      where: { key: template.key },
      update: {
        label: template.label,
        description: template.description,
      },
      create: {
        key: template.key,
        label: template.label,
        description: template.description,
      },
    });

    for (const task of template.tasks) {
      await prisma.taskTemplate.upsert({
        where: { key: task.key },
        update: {
          label: task.label,
          stepOrder: task.stepOrder,
          dueOffsetDays: task.dueOffsetDays,
          deadlineType: task.deadlineType,
          defaultFunctionalRole: task.defaultFunctionalRole,
          proofRequired: task.proofRequired,
          proofLabel: task.proofLabel ?? null,
          // Une tâche qui réapparaît dans la définition doit redevenir
          // active, même si elle avait été archivée entre-temps.
          archivedAt: null,
        },
        create: {
          key: task.key,
          eventTemplateId: eventTemplate.id,
          label: task.label,
          stepOrder: task.stepOrder,
          dueOffsetDays: task.dueOffsetDays,
          deadlineType: task.deadlineType,
          defaultFunctionalRole: task.defaultFunctionalRole,
          proofRequired: task.proofRequired,
          proofLabel: task.proofLabel ?? null,
        },
      });
    }

    // Archivage automatique : toute TaskTemplate déjà rattachée à ce
    // gabarit en base, mais absente de la définition actuelle, est
    // archivée (jamais supprimée physiquement — Restrict protège de
    // toute façon les templates déjà référencés par une vraie Task).
    const currentKeys = template.tasks.map((task) => task.key);
    const archived = await prisma.taskTemplate.updateMany({
      where: {
        eventTemplateId: eventTemplate.id,
        key: { notIn: currentKeys },
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    console.log(
      `✓ ${template.label} : ${template.tasks.length} tâches upsertées, ${archived.count} archivée(s)`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
