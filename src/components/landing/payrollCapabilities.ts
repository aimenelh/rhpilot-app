export type PayrollMoment = { heading: string; body: string };

export type PayrollCapability = {
  key: string;
  eyebrow: string;
  title: string;
  intro: string;
  summary: string;
  variant: "agreement" | "contributions" | "payslip";
  moments: PayrollMoment[];
  sources?: { name: string; detail: string; href: string }[];
};

const SOURCES = [
  { name: "URSSAF / Mon-entreprise", detail: "Règles officielles utilisées pour les calculs sociaux.", href: "https://mon-entreprise.urssaf.fr/" },
  { name: "BOSS", detail: "Bulletin officiel de la sécurité sociale.", href: "https://boss.gouv.fr/" },
  { name: "DGFiP", detail: "Prélèvement à la source et obligations fiscales.", href: "https://www.impots.gouv.fr/" },
  { name: "Légifrance", detail: "Textes législatifs et réglementaires.", href: "https://www.legifrance.gouv.fr/" },
  { name: "Service-Public.fr", detail: "Informations administratives officielles.", href: "https://www.service-public.fr/" },
];

export const PAYROLL_CAPABILITIES: Record<string, PayrollCapability> = {
  agreement: {
    key: "agreement",
    eyebrow: "Convention collective",
    title: "La convention collective fait partie du dossier de paie.",
    intro: "RH Pilot relie la convention collective au salarié ou à l’entreprise et utilise la bonne version pour la période concernée.",
    summary: "Avant le calcul, RH Pilot vérifie quelle convention et quelles règles s’appliquent à la période de paie.",
    variant: "agreement",
    moments: [
      { heading: "La convention du salarié d’abord", body: "Quand une convention collective est renseignée sur le profil du salarié, **elle est retenue en priorité** pour préparer sa paie." },
      { heading: "La version applicable à la période", body: "Une convention peut évoluer. RH Pilot conserve **les différentes versions avec leurs dates** et utilise celle qui correspond à la période de paie." },
      { heading: "L’effet sur la paie", body: "Cette vérification peut notamment changer **la façon dont certaines absences sont traitées** selon la convention applicable." },
    ],
    sources: SOURCES,
  },
  contributions: {
    key: "contributions",
    eyebrow: "Cotisations sociales",
    title: "Les cotisations sont calculées et expliquées ligne par ligne.",
    intro: "RH Pilot calcule les montants à la charge du salarié et de l’employeur et présente les principales cotisations de la période.",
    summary: "Chaque ligne indique simplement ce qui est prélevé, pour qui, et pour quel montant.",
    variant: "contributions",
    moments: [
      { heading: "Ce qui est payé par le salarié", body: "Le calcul distingue **les cotisations payées par le salarié**, qui diminuent le montant versé, et celles payées par l’employeur." },
      { heading: "Le détail par cotisation", body: "Les principales lignes sont présentées séparément : maladie, retraite, chômage, CSG/CRDS, prévoyance et autres cotisations concernées." },
      { heading: "La règle de chaque montant", body: "Chaque montant est relié à **la règle qui a servi à le calculer**, afin de pouvoir comprendre le résultat." },
    ],
    sources: SOURCES,
  },
  payslip: {
    key: "payslip",
    eyebrow: "Bulletin de paie",
    title: "Le bulletin est préparé à partir d’une période verrouillée.",
    intro: "RH Pilot vérifie que toutes les informations nécessaires sont présentes avant de produire le bulletin et bloque la génération en cas d’élément obligatoire manquant.",
    summary: "Un bulletin n’est généré que lorsque la période est terminée et que les informations nécessaires sont disponibles.",
    variant: "payslip",
    moments: [
      { heading: "La période doit être terminée", body: "Le bulletin peut être généré lorsque **le calcul du mois est terminé et la période est verrouillée**." },
      { heading: "Un calcul pour chaque salarié", body: "Chaque salarié actif doit disposer **d’un calcul enregistré pour la période** avant la création du bulletin." },
      { heading: "Les informations obligatoires", body: "RH Pilot vérifie notamment **l’identification de l’employeur et du salarié**, ainsi que la convention applicable." },
    ],
    sources: SOURCES,
  },
};
