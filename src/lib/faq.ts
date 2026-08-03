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
      "Allez dans « Salariés » dans le menu, puis cliquez sur « Ajouter un salarié ». Prénom, nom et date d'embauche sont obligatoires ; le poste, le manager direct, le type de contrat et la durée de période d'essai sont optionnels mais utiles : ils permettent à RH Pilot de calculer certaines suggestions automatiquement.",
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
      "Un parcours se déclenche depuis la fiche d'un salarié (« Déclencher un événement RH »). RH Pilot génère alors automatiquement toutes les tâches associées, avec leurs échéances calculées et un responsable assigné automatiquement quand c'est possible.",
  },
  {
    id: "faq-unassigned",
    category: "Parcours RH",
    question: "Que veut dire « À assigner » sur une tâche ?",
    answer:
      "RH Pilot n'invente jamais un responsable : si aucune personne ne correspond au rôle habituel de la tâche (ou si plusieurs correspondent, ce qui serait ambigu), elle reste « À assigner » plutôt que d'être affectée au hasard. Vous pouvez la réassigner manuellement depuis la fiche du salarié concerné.",
  },
  {
    id: "faq-medical-visit",
    category: "Parcours RH",
    question: "Comment fonctionne le parcours Visite médicale ?",
    answer:
      "Déclenchable à tout moment depuis la fiche d'un salarié, pas seulement à l'embauche : utile pour un suivi périodique ou une visite de reprise. À la fin du parcours, pensez à renseigner la prochaine échéance sur la fiche du salarié : RH Pilot vous préviendra automatiquement quand elle approchera ou sera dépassée.",
  },
  {
    id: "faq-suggestions",
    category: "Parcours RH",
    question: "Pourquoi une suggestion apparaît sur mon tableau de bord ?",
    answer:
      "RH Pilot détecte automatiquement certaines situations qui méritent votre attention, par exemple une période d'essai qui approche sans qu'aucun parcours n'ait été déclenché. Chaque suggestion propose une action directe pour la résoudre en un clic.",
  },
  {
    id: "faq-notifications-work",
    category: "Notifications",
    question: "Comment fonctionnent les notifications ?",
    answer:
      "Chaque personne peut recevoir un résumé par email (quotidien ou hebdomadaire, réglable dans Paramètres) listant uniquement les tâches qui lui sont assignées et qui approchent ou sont en retard. Un rappel manuel ponctuel reste toujours possible en un clic, quelle que soit cette préférence.",
  },
  {
    id: "faq-notifications-history",
    category: "Notifications",
    question: "Où voir l'historique des notifications envoyées ?",
    answer:
      "La section « Notifications » du menu liste tout ce qui a été envoyé (destinataire, type, date, et par qui ou automatique), pour savoir facilement si quelqu'un a déjà été relancé.",
  },
  {
    id: "faq-why-rigorous",
    category: "Philosophie",
    question: "Pourquoi utiliser RH Pilot si je suis déjà rigoureux ?",
    answer:
      "La rigueur est une compétence, RH Pilot ne la remplace pas : il la sécurise. Même les meilleurs professionnels utilisent des checklists, pas parce qu'ils ne connaissent pas leur métier, mais parce qu'un oubli reste toujours possible quand les dossiers s'accumulent. RH Pilot vous permet de consacrer moins de temps au suivi des échéances, et davantage à l'accompagnement de vos collaborateurs.",
  },
];
