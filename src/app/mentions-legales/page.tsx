import Link from "next/link";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

export const metadata = {
  title: "Mentions légales, RH Pilot",
  description: "Identité de l'éditeur, hébergement et informations légales du site RH Pilot.",
};

// Le Kbis indique le SIREN (via le numéro RCS), pas le SIRET à
// proprement parler — celui-ci demande 5 chiffres supplémentaires
// identifiant l'établissement, absents de l'extrait fourni. RCS +
// SIREN est tout aussi valable pour des mentions légales
// d'entrepreneur individuel. À remplacer par le vrai SIRET si Aimen
// le retrouve ailleurs (mail INPI, societe.com une fois indexé).
const RCS = "RCS Montpellier 108 345 125";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-surface-border py-10 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      <section className="mx-auto max-w-2xl px-6 py-16">
        <Reveal variant="left">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Mentions légales
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie
            numérique, voici l&apos;identité des personnes intervenant dans la réalisation et le suivi de
            ce site.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-16">
        <Section title="Éditeur du site">
          <p>
            Le site RH Pilot est édité par Aimen EL HOUSSEINI, entrepreneur individuel (micro-entreprise),
            exerçant sous le nom commercial <strong className="font-semibold text-ink">RH Pilot</strong>.
          </p>
          <p>Adresse : 198 rue Robert Koch, 34090 Montpellier, France.</p>
          <p>{RCS}.</p>
          <p>TVA non applicable, article 293 B du Code général des impôts.</p>
          <p>
            Contact :{" "}
            <Link href="mailto:aimenoffi@gmail.com" className="font-medium text-brand-primary hover:underline">
              aimenoffi@gmail.com
            </Link>
            .
          </p>
        </Section>

        <Section title="Directeur de la publication">
          <p>Aimen EL HOUSSEINI.</p>
        </Section>

        <Section title="Hébergement">
          <p>Le site est hébergé par Vercel Inc.</p>
          <p>Adresse : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</p>
          <p>
            Site web :{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-primary hover:underline"
            >
              vercel.com
            </a>
            .
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L&apos;ensemble des éléments de ce site (textes, logo, interface, code) est la propriété
            exclusive de RH Pilot, sauf mention contraire. Toute reproduction ou représentation, totale ou
            partielle, sans autorisation écrite préalable est interdite.
          </p>
        </Section>

        <Section title="Données personnelles">
          <p>
            Pour tout ce qui concerne la collecte et le traitement de vos données, consultez la{" "}
            <Link href="/confidentialite" className="font-medium text-brand-primary hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </Section>
      </section>

      <MarketingFooter />
    </div>
  );
}
