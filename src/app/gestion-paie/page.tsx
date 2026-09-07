import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, Calculator, FileCheck2, FileClock, FileText, HeartPulse, History, Landmark, ReceiptText, Scale, UserRound } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

const ITEMS = [
  { href: "/gestion-paie/production", title: "Production de la paie", text: "Préparer, calculer, contrôler et valider une période de paie.", icon: Calculator },
  { href: "/gestion-paie/variables", title: "Variables de paie", text: "Réunir les éléments du mois et les contrôler avant le calcul.", icon: ReceiptText },
  { href: "/gestion-paie/conges-absences", title: "Congés & absences", text: "Relier les événements RH à leur traitement dans la paie.", icon: CalendarDays },
  { href: "/gestion-paie/arrets-travail", title: "Arrêts de travail", text: "Structurer le suivi d’un arrêt et son impact sur la période.", icon: FileClock },
  { href: "/gestion-paie/referentiel-conventionnel", title: "Référentiel conventionnel", text: "Associer la convention collective au dossier et sélectionner la version applicable aux traitements couverts.", icon: Scale },
  { href: "/gestion-paie/complementaire-sante", title: "Complémentaire santé", text: "Prendre en compte le montant mensuel et la part employeur dans le calcul social.", icon: HeartPulse },
  { href: "/gestion-paie/cotisations-sociales", title: "Cotisations sociales", text: "Calculer les parts salarié et employeur et conserver le détail des cotisations.", icon: Landmark },
  { href: "/gestion-paie/montant-net-social", title: "Montant net social", text: "Calculer le montant net social à partir de la règle dédiée du modèle social.", icon: FileCheck2 },
  { href: "/gestion-paie/bulletin-de-paie", title: "Bulletin de paie", text: "Vérifier les prérequis avant de préparer un bulletin à partir d’une période verrouillée.", icon: FileText },
  { href: "/gestion-paie/tracabilite-calcul", title: "Traçabilité du calcul", text: "Conserver le modèle, les règles, les données et le résultat associés à la période.", icon: History },
  { href: "/gestion-paie/profil-paie", title: "Profil de paie", text: "Regrouper salaire, temps de travail, contrat, classification et convention collective.", icon: UserRound },
  { href: "/gestion-paie/contexte-employeur", title: "Contexte employeur", text: "Intégrer forme juridique, date de création, localisation et taux AT/MP au contexte social.", icon: Building2 },
];

export const metadata = { title: "Gestion de la paie, RH Pilot", description: "Référentiel salarié et employeur, variables, conventions, calcul social et contrôles de paie." };

export default function GestionPaiePage() {
  return (
    <div className="min-h-screen"><AmbientNetwork /><MarketingHeader /><main>
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pt-24"><Reveal variant="scale"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Gestion de la paie</p><h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">La paie, de la préparation au bulletin.</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">RH Pilot regroupe les données du salarié et de l’entreprise, applique les règles disponibles et conserve les éléments associés au calcul.</p></Reveal></section>
      <section className="border-y border-surface-border bg-white/75 py-16 backdrop-blur-sm"><div className="mx-auto max-w-6xl px-6"><Reveal><div><p className="text-sm font-semibold text-ink">Les fonctions du module paie</p><h2 className="mt-2 text-3xl font-semibold leading-tight text-ink sm:text-4xl">Un traitement paie, plusieurs niveaux de données.</h2></div></Reveal><div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ITEMS.map((item,index)=>{const Icon=item.icon;return <Reveal key={item.href} delay={index*35}><Link href={item.href} className="group block h-full border border-surface-border bg-white p-6 transition-transform hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-34px_rgba(20,21,26,0.45)]"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center bg-brand-primary/10 text-brand-primary"><Icon size={18}/></span><ArrowRight size={17} className="mt-1 text-ink-faint transition-transform group-hover:translate-x-1 group-hover:text-ink"/></div><h3 className="mt-7 text-lg font-semibold text-ink">{item.title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{item.text}</p></Link></Reveal>})}</div></div></section>
      <section className="mx-auto max-w-5xl px-6 py-20"><Reveal><div className="border border-surface-border bg-surface-subtle p-8 sm:p-12"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Calcul social</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">Les paramètres du dossier accompagnent le calcul.</h2><p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-soft">Le moteur social utilise les informations nécessaires du salarié et de l’entreprise. Les règles et résultats sont associés à la période calculée afin de pouvoir être relus.</p><div className="mt-8 grid gap-6 sm:grid-cols-3"><div><p className="text-sm font-semibold text-ink">Contexte salarié</p><p className="mt-1 text-sm text-ink-soft">Contrat, salaire, temps, catégorie et classification.</p></div><div><p className="text-sm font-semibold text-ink">Contexte employeur</p><p className="mt-1 text-sm text-ink-soft">Forme juridique, localisation, date de création et AT/MP.</p></div><div><p className="text-sm font-semibold text-ink">Référentiel</p><p className="mt-1 text-sm text-ink-soft">Convention, règles versionnées et sources associées au traitement.</p></div></div></div></Reveal></section>
    </main><MarketingFooter /></div>
  );
}
