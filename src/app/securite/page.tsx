import Link from "next/link";
import Image from "next/image";
import { MarketingCTA, MarketingPage, PageIntro } from "@/components/landing/MarketingPage";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import sec from "./Securite.module.css";

export const metadata = {
  title: "Sécurité, RH Pilot",
  description:
    "Comment RH Pilot protège vos données RH : isolation entre organisations, prestataires techniques, authentification déléguée, traçabilité complète.",
};

// Même grille que les autres pages éditoriales (tarifs, questions, pourquoi) :
// en-tête pleine largeur, titre à gauche et contenu à droite.

const PILLARS = [
  {
    title: "Isolation stricte des données",
    text: "Chaque organisation cliente est cloisonnée. Vos données ne sont jamais mêlées à celles d’une autre entreprise.",
  },
  {
    title: "Une infrastructure identifiée",
    text: "Base de données Neon en Union européenne. Les fonctions applicatives Vercel sont configurées à Francfort (fra1). Retrouvez nos prestataires ci-dessous.",
    eu: true,
  },
  {
    title: "Authentification déléguée",
    text: "Gérée par Clerk, spécialiste de l’authentification, jamais construite ni stockée par nous-mêmes.",
  },
  {
    title: "Traçabilité complète",
    text: "Chaque action importante est journalisée, consultable en cas de besoin.",
  },
  {
    title: "Aucune donnée vendue",
    text: "Jamais vendues à des tiers, jamais utilisées pour entraîner une IA sans consentement explicite préalable.",
  },
];

const VENDORS = [
  { name: "Neon", role: "Base de données (UE)", src: "/logos/neon.png", w: 581, h: 194, dark: false },
  { name: "Clerk", role: "Authentification", src: "/logos/clerk.png", w: 580, h: 197, dark: false },
  { name: "Resend", role: "E-mails transactionnels", src: "/logos/resend.png", w: 712, h: 199, dark: true },
  { name: "Vercel", role: "Hébergement de l’application", src: "/logos/vercel.png", w: 800, h: 201, dark: false },
];

// Drapeau européen reconstruit fidèlement (fond bleu, 12 étoiles en
// cercle) : le fichier fourni portait un filigrane visible, inutilisable
// tel quel sur un vrai site.
function EUFlag({ size = 22 }: { size?: number }) {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
    return { x: 12 + 7 * Math.cos(angle), y: 12 + 7 * Math.sin(angle) };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={sec.flag} role="img" aria-label="Union européenne">
      <rect width="24" height="24" fill="#003399" />
      {stars.map((star, i) => (
        <text key={i} x={star.x} y={star.y} fontSize="5" fill="#FFCC00" textAnchor="middle" dominantBaseline="central">
          ★
        </text>
      ))}
    </svg>
  );
}

export default function SecurityPage() {
  return (
    <MarketingPage>
      <PageIntro
        eyebrow="Sécurité"
        title="La confiance ne se décrète pas."
        intro="Vos données RH sont sensibles. Voici, concrètement, comment RH Pilot les traite, sans jargon, et sans rien promettre que nous ne fassions déjà."
      />

      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <div>
            <p className={s.eyebrow}>Les fondamentaux</p>
            <h2 className={s.title}>Ce qui protège vos données.</h2>
          </div>
          <ul className={`${p.rows} ${sec.rows}`}>
            {PILLARS.map((item) => (
              <li key={item.title}>
                <h3>
                  {item.title}
                  {item.eu ? <EUFlag size={16} /> : null}
                </h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${p.section} ${p.tint}`}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Notre infrastructure</p>
          <h2 className={s.title}>Avec qui nous travaillons</h2>
          <p className={`${s.body} ${sec.narrow}`}>
            Aucun mystère : voici l’infrastructure réelle derrière RH Pilot, listée en détail dans notre{" "}
            <Link href="/confidentialite" className={sec.inline}>
              politique de confidentialité
            </Link>
            .
          </p>
          <ul className={sec.vendors}>
            {VENDORS.map((vendor) => (
              <li key={vendor.name} data-dark={vendor.dark}>
                <span className={sec.logo}>
                  <Image src={vendor.src} alt={vendor.name} width={vendor.w} height={vendor.h} />
                </span>
                <span className={sec.role}>{vendor.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <div>
            <p className={s.eyebrow}>Vos droits</p>
            <h2 className={s.title}>Vos droits, sans détour</h2>
          </div>
          <div className={p.story}>
            <p>
              RH Pilot agit comme sous-traitant au sens du RGPD : l’entreprise cliente reste responsable du traitement des
              données de ses salariés.
            </p>
            <p>
              Vous conservez à tout moment vos droits d’accès, de rectification, d’effacement, de limitation, de portabilité et
              d’opposition.
            </p>
            <Link href="/confidentialite" className={sec.link}>
              Lire la politique de confidentialité complète
            </Link>
            <blockquote className={p.quote}>
              RH Pilot n’interprète jamais votre convention collective : il vous oriente vers la bonne source officielle, au bon
              moment.
            </blockquote>
          </div>
        </div>
      </section>

      <MarketingCTA
        title="Une question sur vos données ?"
        text="Écrivez-nous : nous répondons avec les détails techniques, sans détour."
        href="mailto:aimenoffi@gmail.com"
        action="Nous écrire"
      />
    </MarketingPage>
  );
}
