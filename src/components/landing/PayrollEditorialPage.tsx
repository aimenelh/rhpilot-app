import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { LivePayslip, type PayslipFocus } from "@/components/landing/payroll/LivePayslip";
import { computePayslipDemo, DEFAULT_DEMO_INPUT } from "@/components/landing/payroll/payslipDemo";
import { IjssDemo, MinimumDemo, OvertimeDemo, PaidLeaveDemo, PreflightDemo, PrerequisitesDemo } from "@/components/landing/payroll/PayrollDemos";
import { PayrollTopics } from "@/components/landing/payroll/PayrollHub";
import h from "@/components/landing/payroll/PayrollHub.module.css";

// Gabarit commun des douze pages paie : une phrase, une démonstration qui
// appelle la vraie fonction du logiciel, la méthode en trois temps, les sources.

export type PayrollSource = {
  name: string;
  detail: string;
  href: string;
};

export type PayrollEditorialFeature = {
  eyebrow: string;
  title: string;
  intro: string;
  image?: string;
  imageAlt?: string;
  imagePosition?: "left" | "right";
  visualKicker: string;
  visualTitle: string;
  visualText: string;
  points: { title: string; text: string }[];
  workflowTitle: string;
  workflow: { label: string; text: string }[];
  detailsTitle: string;
  details: string[];
  sources: PayrollSource[];
  note: string;
};

export type PayrollEditorialCapability = {
  eyebrow: string;
  title: string;
  intro: string;
  summary: string;
  variant: string;
  moments: { heading: string; body: string }[];
  sources?: PayrollSource[];
};

type PageKey =
  | "production"
  | "variables"
  | "absences"
  | "arrets"
  | "payslip"
  | "contributions"
  | "netSocial"
  | "health"
  | "profile"
  | "agreement"
  | "employer"
  | "traceability";

const PAGES: Record<PageKey, { href: string; accent: string; lead: string; payslip?: PayslipFocus }> = {
  production: { href: "/gestion-paie/production", accent: "ce qui doit être contrôlé", lead: "Trois salariés, deux blocages. Réglez-les pour débloquer le calcul : c’est le contrôle que fait le logiciel avant chaque période." },
  variables: { href: "/gestion-paie/variables", accent: "bonne période", lead: "Ajoutez des heures supplémentaires : RH Pilot calcule le taux horaire, applique les majorations semaine par semaine et met à jour le brut du mois." },
  absences: { href: "/gestion-paie/conges-absences", accent: "période concernée", lead: "Changez le salaire, les primes ou la durée des congés : les deux méthodes légales sont calculées et la plus favorable est retenue." },
  arrets: { href: "/gestion-paie/arrets-travail", accent: "traité en paie", lead: "Faites varier le salaire et la durée de l’arrêt : carence, plafond et indemnités journalières sont recalculés." },
  payslip: { href: "/gestion-paie/bulletin-de-paie", accent: "période verrouillée", lead: "Sept prérequis, deux manquants. Tant qu’ils ne sont pas réunis, la génération reste bloquée. Réglez-les." },
  contributions: { href: "/gestion-paie/cotisations-sociales", accent: "ligne par ligne", lead: "Ouvrez n’importe quelle ligne : base, taux, montant, et la règle officielle qui l’a produite.", payslip: "contributions" },
  netSocial: { href: "/gestion-paie/montant-net-social", accent: "montant net social", lead: "Le montant net social se calcule avec le reste du bulletin. Faites varier le salaire pour le voir bouger.", payslip: "netSocial" },
  health: { href: "/gestion-paie/complementaire-sante", accent: "complémentaire santé", lead: "Changez le prix du contrat et la part de l’employeur : les lignes santé et le net imposable suivent.", payslip: "health" },
  profile: { href: "/gestion-paie/profil-paie", accent: "base au calcul", lead: "Le salaire et le statut du profil changent tout le bulletin. Passez le salarié cadre : l’APEC et la prévoyance apparaissent.", payslip: "profile" },
  agreement: { href: "/gestion-paie/referentiel-conventionnel", accent: "convention collective", lead: "Choisissez une classification : RH Pilot compare le minimum de la convention au Smic et retient le plus élevé." },
  employer: { href: "/gestion-paie/contexte-employeur", accent: "l’entreprise", lead: "Le taux accidents du travail de l’établissement change la part employeur. Faites-le varier.", payslip: "employer" },
  traceability: { href: "/gestion-paie/tracabilite-calcul", accent: "comment une paie a été calculée", lead: "La ligne de réduction générale est ouverte : son calcul, la règle du moteur et ses sources officielles.", payslip: "traceability" },
};

function pageKey(eyebrow: string, variant?: string): PageKey {
  const value = `${variant ?? ""} ${eyebrow}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  if (value.includes("production")) return "production";
  if (value.includes("variables")) return "variables";
  if (value.includes("conges") || value.includes("absences")) return "absences";
  if (value.includes("arrets")) return "arrets";
  if (value.includes("bulletin") || value.includes("payslip")) return "payslip";
  if (value.includes("cotisations") || value.includes("contributions")) return "contributions";
  if (value.includes("net-social") || value.includes("netsocial")) return "netSocial";
  if (value.includes("complementaire") || value.includes("health")) return "health";
  if (value.includes("profil") || value.includes("profile")) return "profile";
  if (value.includes("agreement") || value.includes("convention") || value.includes("referentiel")) return "agreement";
  if (value.includes("employeur") || value.includes("employer") || value.includes("entreprise")) return "employer";
  if (value.includes("tracabilite") || value.includes("traceability") || value.includes("suivi")) return "traceability";
  return "production";
}

function richText(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>));
}

function AccentTitle({ title, phrase }: { title: string; phrase: string }) {
  const index = title.toLowerCase().indexOf(phrase.toLowerCase());
  if (!phrase || index < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, index)}
      <em>{title.slice(index, index + phrase.length)}</em>
      {title.slice(index + phrase.length)}
    </>
  );
}

function Demo({ keyName }: { keyName: PageKey }) {
  const focus = PAGES[keyName].payslip;
  if (focus) return <LivePayslip initial={computePayslipDemo(DEFAULT_DEMO_INPUT)} focus={focus} />;
  switch (keyName) {
    case "payslip":
      return <PrerequisitesDemo net={computePayslipDemo(DEFAULT_DEMO_INPUT).netBeforeTax} />;
    case "variables":
      return <OvertimeDemo />;
    case "absences":
      return <PaidLeaveDemo />;
    case "arrets":
      return <IjssDemo />;
    case "agreement":
      return <MinimumDemo />;
    default:
      return <PreflightDemo />;
  }
}

function TopicPage({
  eyebrow,
  title,
  intro,
  keyName,
  steps,
  sources,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  keyName: PageKey;
  steps: { title: string; body: string }[];
  sources?: PayrollSource[];
}): ReactNode {
  const page = PAGES[keyName];
  return (
    <div className={h.page}>
      <MarketingHeader />
      <main id="main-content">
        <section className={h.hero} aria-labelledby="payroll-topic-title">
          <div className={h.inner}>
            <p className={h.kicker}>
              <Link href="/gestion-paie">Gestion de la paie</Link> · {eyebrow}
            </p>
            <h1 id="payroll-topic-title" className={h.title}>
              <AccentTitle title={title} phrase={page.accent} />
            </h1>
            <p className={h.intro}>{richText(intro)}</p>
            <p className={h.try}>{page.lead}</p>
            <div className={h.demo}>
              <Demo keyName={keyName} />
            </div>
          </div>
        </section>

        <section className={h.how} aria-labelledby="payroll-how-title">
          <div className={h.inner}>
            <h2 id="payroll-how-title" className={h.h2Small}>
              Comment RH Pilot s’y prend
            </h2>
            <div className={h.howGrid}>
              {steps.map((step) => (
                <div key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{richText(step.body)}</p>
                </div>
              ))}
            </div>
            {sources?.length ? (
              <p className={h.sources}>
                Textes et sources officielles :{" "}
                {sources.map((source, index) => (
                  <span key={source.href}>
                    {index ? " · " : null}
                    <a href={source.href} target="_blank" rel="noreferrer" title={source.detail}>
                      {source.name}
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>

        <PayrollTopics current={page.href} title="Les autres sujets de la paie" />
      </main>
      <ClosingCta
        title="Votre prochaine paie se prépare déjà."
        accent="Autant la voir venir."
        text="Créez votre espace, ajoutez vos salariés et lancez votre première période."
        action="Essayer RH Pilot"
      />
      <MarketingFooter />
    </div>
  );
}

export function PayrollFeatureEditorial({ feature }: { feature: PayrollEditorialFeature }) {
  return (
    <TopicPage
      eyebrow={feature.eyebrow}
      title={feature.title}
      intro={feature.intro}
      keyName={pageKey(feature.eyebrow)}
      steps={feature.points.map((point) => ({ title: point.title, body: point.text }))}
      sources={feature.sources}
    />
  );
}

export function PayrollCapabilityEditorial({ capability }: { capability: PayrollEditorialCapability }) {
  return (
    <TopicPage
      eyebrow={capability.eyebrow}
      title={capability.title}
      intro={capability.intro}
      keyName={pageKey(capability.eyebrow, capability.variant)}
      steps={capability.moments.map((moment) => ({ title: moment.heading, body: moment.body }))}
      sources={capability.sources}
    />
  );
}
