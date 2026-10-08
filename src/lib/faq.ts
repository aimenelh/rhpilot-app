export type FaqEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

// Structure volontairement simple (catégorie/question/réponse) plutôt
// qu'un CMS complet — suffisant pour un centre d'aide statique
// aujourd'hui, et directement réutilisable comme base de connaissances
// pour un futur assistant IA sans rien reconstruire. Les `id` servent
// d'ancres sur la page Aide et de cibles pour les suggestions
// contextuelles de l'Assistant RH Pilot.
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "faq-create-employee",
    category: "Salariés",
    question: "Comment créer un salarié ?",
    answer:
      "Allez dans « Salariés » dans le menu, puis cliquez sur « Ajouter un salarié ». Prénom, nom et date d'embauche sont obligatoires ; le poste, le manager direct, le type de contrat et la durée de période d'essai sont facultatifs. Ils servent au calcul de certaines suggestions.",
  },
  {
    id: "faq-manager-selection",
    category: "Salariés",
    question: "Pourquoi je ne peux choisir que certaines personnes comme manager direct ?",
    answer:
      "Seules les personnes ayant un compte RH Pilot dans votre organisation peuvent être désignées comme manager direct d'un salarié. C'est nécessaire pour pouvoir leur assigner automatiquement des tâches et leur envoyer des notifications.",
  },
  {
    id: "faq-how-parcours-works",
    category: "Parcours RH",
    question: "Comment fonctionne un parcours ?",
    answer:
      "Un parcours se déclenche depuis la fiche d'un salarié (« Déclencher un événement RH »). Les tâches associées sont alors créées, avec leur échéance et, quand c’est possible, un responsable assigné.",
  },
  {
    id: "faq-unassigned",
    category: "Parcours RH",
    question: "Que veut dire « À assigner » sur une tâche ?",
    answer:
      "Une tâche reste « À assigner » quand aucune personne ne correspond au rôle habituel de la tâche, ou quand plusieurs personnes correspondent. Elle n’est jamais affectée au hasard. Vous pouvez la réassigner manuellement depuis la fiche du salarié concerné.",
  },
  {
    id: "faq-medical-visit",
    category: "Parcours RH",
    question: "Comment fonctionne le parcours Visite médicale ?",
    answer:
      "Le parcours peut être déclenché à tout moment depuis la fiche d’un salarié, pas seulement à l’embauche, par exemple pour un suivi périodique ou une visite de reprise. À la fin du parcours, renseignez la prochaine échéance sur la fiche du salarié. Vous serez prévenu quand elle approche ou est dépassée.",
  },
  {
    id: "faq-suggestions",
    category: "Parcours RH",
    question: "Pourquoi une suggestion apparaît sur mon tableau de bord ?",
    answer:
      "Certaines situations sont détectées automatiquement, par exemple une période d’essai qui approche sans qu’aucun parcours n’ait été déclenché. Chaque suggestion propose une action pour la traiter.",
  },
  {
    id: "faq-notifications-work",
    category: "Notifications",
    question: "Comment fonctionnent les notifications ?",
    answer:
      "Chaque personne peut recevoir un résumé par e-mail (quotidien ou hebdomadaire, réglable dans Paramètres) listant uniquement les tâches qui lui sont assignées et qui approchent ou sont en retard. Un rappel manuel ponctuel reste toujours possible depuis la tâche, quelle que soit cette préférence.",
  },
  {
    id: "faq-notifications-history",
    category: "Notifications",
    question: "Où voir l'historique des notifications envoyées ?",
    answer:
      "La section « Notifications » du menu liste tout ce qui a été envoyé (destinataire, type, date, auteur de l’envoi ou envoi automatique). Vous pouvez ainsi vérifier si une personne a déjà été relancée.",
  },
  {
    id: "faq-why-rigorous",
    category: "Philosophie",
    question: "Pourquoi utiliser RH Pilot si je suis déjà rigoureux ?",
    answer:
      "Le logiciel sert de liste de contrôle. Les échéances sont calculées et rappelées, ce qui limite les oublis quand les dossiers s’accumulent et réduit le temps consacré à leur suivi.",
  },
];
