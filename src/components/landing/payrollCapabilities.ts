export type PayrollCapability = {
  key: string;
  eyebrow: string;
  title: string;
  intro: string;
  summary: string;
  variant: "agreement" | "health" | "contributions" | "netSocial" | "payslip" | "traceability" | "profile" | "employer";
  points: { label: string; text: string }[];
  sources?: { name: string; detail: string; href: string }[];
};

const SOURCES = [
  { name: "URSSAF / Mon-entreprise", detail: "Modèle social Publicodes utilisé pour le calcul social.", href: "https://mon-entreprise.urssaf.fr/" },
  { name: "BOSS", detail: "Bulletin officiel de la sécurité sociale.", href: "https://boss.gouv.fr/" },
  { name: "DGFiP", detail: "Prélèvement à la source et obligations fiscales.", href: "https://www.impots.gouv.fr/" },
  { name: "Légifrance", detail: "Textes législatifs et réglementaires.", href: "https://www.legifrance.gouv.fr/" },
  { name: "Service-Public.fr", detail: "Informations administratives officielles.", href: "https://www.service-public.fr/" },
];

export const PAYROLL_CAPABILITIES: Record<string, PayrollCapability> = {
  agreement: {
    key: "agreement",
    eyebrow: "Référentiel conventionnel",
    title: "La convention collective fait partie du dossier de paie.",
    intro: "RH Pilot associe une convention collective au profil du salarié ou à l’organisation et conserve des versions datées du référentiel.",
    summary: "Pour les traitements conventionnels actuellement pris en charge, la version validée applicable à la période est recherchée avant utilisation.",
    variant: "agreement",
    points: [
      { label: "Convention", text: "La convention du profil salarié est prioritaire lorsqu’elle est renseignée." },
      { label: "Version", text: "Une version validée est sélectionnée selon sa période de validité." },
      { label: "Règle", text: "Les règles conventionnelles disposent elles aussi d’une période de validité et d’un statut de validation." },
      { label: "Application", text: "Les traitements conventionnels couverts, notamment pour les absences, utilisent cette sélection." },
    ],
    sources: SOURCES,
  },
  health: {
    key: "health",
    eyebrow: "Complémentaire santé",
    title: "La complémentaire santé entre dans le contexte de paie.",
    intro: "RH Pilot enregistre le montant mensuel de la complémentaire santé et la part prise en charge par l’employeur, puis transmet ces paramètres au calcul social.",
    summary: "Le montant de santé et le taux employeur sont contrôlés avant le calcul : la part employeur doit être comprise entre 50 % et 100 %.",
    variant: "health",
    points: [
      { label: "Montant mensuel", text: "Le montant de la complémentaire santé est renseigné dans le contexte de paie." },
      { label: "Part employeur", text: "Le taux de prise en charge employeur est contrôlé avant calcul." },
      { label: "Calcul social", text: "Ces informations sont fournies au modèle Publicodes avec les autres données du salarié." },
      { label: "Cotisation", text: "La part employeur fait partie des éléments détaillés dans les cotisations calculées." },
    ],
    sources: SOURCES,
  },
  contributions: {
    key: "contributions",
    eyebrow: "Cotisations sociales",
    title: "Les cotisations sont calculées et détaillées séparément.",
    intro: "Le moteur social de RH Pilot produit les montants salarié et employeur et expose le détail des principales cotisations utilisées pour le calcul.",
    summary: "Le détail conserve pour chaque ligne son intitulé, sa source Publicodes, son côté salarié ou employeur et son montant.",
    variant: "contributions",
    points: [
      { label: "Salarié", text: "Les cotisations à la charge du salarié alimentent le calcul du net avant impôt." },
      { label: "Employeur", text: "Les cotisations employeur sont prises en compte dans le coût employeur." },
      { label: "Détail", text: "Maladie, vieillesse, retraite complémentaire, chômage, CSG/CRDS, prévoyance et autres postes sont exposés lorsqu’ils sont présents." },
      { label: "Source", text: "Chaque ligne de détail conserve la règle Publicodes qui a produit le montant." },
    ],
    sources: SOURCES,
  },
  netSocial: {
    key: "net-social",
    eyebrow: "Montant net social",
    title: "Le montant net social vient directement du calcul social.",
    intro: "RH Pilot utilise la règle Publicodes dédiée au montant net social et conserve cette valeur dans le résultat de paie.",
    summary: "Le montant net social est distinct du net avant impôt et du prélèvement à la source dans le résultat enregistré.",
    variant: "netSocial",
    points: [
      { label: "Brut", text: "Le salaire brut et les éléments variables constituent le point de départ du calcul." },
      { label: "Cotisations", text: "Les cotisations issues du modèle social interviennent dans les différents montants de rémunération." },
      { label: "Net avant impôt", text: "RH Pilot conserve le montant net avant l’application du prélèvement à la source." },
      { label: "Net social", text: "Le montant net social est évalué à partir de la règle Publicodes correspondante." },
    ],
    sources: SOURCES,
  },
  payslip: {
    key: "payslip",
    eyebrow: "Bulletin de paie",
    title: "Le bulletin est préparé à partir d’une période verrouillée.",
    intro: "RH Pilot vérifie les prérequis avant de produire un bulletin : période verrouillée, salariés actifs, calculs complets, snapshots et identification employeur et salarié.",
    summary: "Une information obligatoire manque ? La génération est bloquée plutôt que de produire un document incomplet.",
    variant: "payslip",
    points: [
      { label: "Période", text: "Le calcul doit être terminé et la période verrouillée." },
      { label: "Calcul", text: "Chaque salarié actif doit disposer d’un calcul enregistré et d’un snapshot." },
      { label: "Employeur", text: "Le SIRET doit être renseigné pour le bulletin." },
      { label: "Salarié", text: "Un intitulé ou une classification et la convention applicable sont contrôlés." },
    ],
    sources: SOURCES,
  },
  traceability: {
    key: "traceability",
    eyebrow: "Traçabilité du calcul",
    title: "Le résultat de paie conserve le contexte qui l’a produit.",
    intro: "Chaque calcul enregistre le modèle social utilisé, les règles sélectionnées, les variables, les absences, les paramètres du salarié et la source du référentiel.",
    summary: "Le snapshot permet de retrouver les données et versions associées à une période sans reconstruire le calcul à partir d’informations modifiées après coup.",
    variant: "traceability",
    points: [
      { label: "Modèle", text: "La version du modèle Publicodes est conservée dans le résultat." },
      { label: "Règles", text: "La version de la règle de paie et sa source sont enregistrées." },
      { label: "Données", text: "Profil, variables, absences et impacts utilisés sont présents dans le snapshot." },
      { label: "Résultat", text: "Les totaux sociaux et le montant net social sont conservés avec le calcul." },
    ],
    sources: SOURCES,
  },
  profile: {
    key: "profile",
    eyebrow: "Profil de paie",
    title: "Les informations du salarié structurent le calcul.",
    intro: "Le profil paie regroupe le salaire de base, la durée mensuelle de référence et les informations qui permettent de contextualiser la période.",
    summary: "Contrat, catégorie professionnelle, statut cadre, convention collective et éléments de classification sont conservés autour du profil de paie.",
    variant: "profile",
    points: [
      { label: "Salaire", text: "Le salaire brut mensuel de référence est utilisé pour constituer le brut de la période." },
      { label: "Temps", text: "La durée mensuelle de référence fait partie des données de préparation de la paie." },
      { label: "Contrat", text: "Le type de contrat et la date d’embauche alimentent le contexte social." },
      { label: "Classification", text: "Catégorie professionnelle, niveau, coefficient et classification peuvent être conservés au profil." },
    ],
    sources: SOURCES,
  },
  employer: {
    key: "employer",
    eyebrow: "Contexte employeur",
    title: "Le calcul tient compte du contexte de l’entreprise.",
    intro: "La catégorie juridique, la date de création, le lieu de paie et le taux AT/MP font partie des paramètres transmis au calcul social.",
    summary: "Ces données sont contrôlées et intégrées au contexte du moteur social, au même titre que les informations du salarié.",
    variant: "employer",
    points: [
      { label: "Catégorie juridique", text: "La catégorie juridique de l’organisation est obligatoire pour le calcul social." },
      { label: "AT/MP", text: "Le taux accidents du travail et maladies professionnelles est transmis au modèle social." },
      { label: "Localisation", text: "La commune et le département de paie sont associés au contexte de l’établissement." },
      { label: "Entreprise", text: "La date de création de l’entreprise est également fournie au calcul." },
    ],
    sources: SOURCES,
  },
};
