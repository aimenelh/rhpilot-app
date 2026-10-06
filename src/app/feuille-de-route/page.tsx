import { MarketingPage, PageIntro } from "@/components/landing/MarketingPage";
export const metadata = { title: "Feuille de route", description: "Les fonctionnalités disponibles, en accès anticipé et prévues pour RH Pilot." };
const groups = [
 { title: "Disponible", items: ["Fiches salariés, import CSV et parcours RH", "Calendrier, rappels et demandes d’absence", "Espace salarié et dépôt de bulletins PDF externes", "Invitations, rôles et retrait des accès", "Démonstration et tutoriels"] },
 { title: "Accès anticipé sur invitation", items: ["Calcul de paie sur un périmètre limité", "Bulletins PDF et contrôles de cohérence", "DSN d'essai à déposer sur net-entreprises, en parallèle de la déclaration habituelle"] },
 { title: "À l’étude", items: ["Virements SEPA et export comptable", "Bulletins rectificatifs et double validation", "Extension aux forfaits jours et stagiaires", "DSN complète et validation avant dépôt"] },
];
export default function Page() { return <MarketingPage><PageIntro title="Les prochaines étapes de RH Pilot." intro="État au 29 septembre 2026. Les fonctionnalités à l’étude n’ont pas de date de disponibilité annoncée."/><section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">{groups.map(group => <article key={group.title} className="rounded-xl border border-surface-border p-6"><h2 className="text-xl font-semibold">{group.title}</h2><ul className="mt-5 space-y-4 text-ink-soft">{group.items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</section></MarketingPage>; }
