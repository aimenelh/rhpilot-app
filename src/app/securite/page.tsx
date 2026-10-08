import Link from "next/link";
import Image from "next/image";
import { MarketingCTA, MarketingPage, PageIntro } from "@/components/landing/MarketingPage";
import { CopilotScene } from "@/components/landing/CopilotScene";
import s from "@/components/landing/MarketingV2.module.css";
import p from "@/components/landing/InnerPages.module.css";
import sec from "./Securite.module.css";

export const metadata = {
  title: "Sécurité",
  description:
    "Comment RH Pilot protège vos données RH : cloisonnement entre organisations, hébergement dans l’Union européenne, authentification, journal des actions.",
};

// Même grille que les autres pages éditoriales (tarifs, questions, à propos) :
// en-tête pleine largeur, titre à gauche et contenu à droite.

const PILLARS = [
  {
    title: "Données cloisonnées",
    text: "Chaque organisation cliente est isolée : ses données ne sont jamais mêlées à celles d’une autre entreprise.",
  },
  {
    title: "Hébergement dans l’Union européenne",
    text: "Base de données Neon en Union européenne. Les fonctions applicatives Vercel sont configurées à Francfort (fra1). La liste des sous-traitants figure plus bas.",
    eu: true,
  },
  {
    title: "Authentification confiée à Clerk",
    text: "Les connexions et les mots de passe sont gérés par Clerk, un service spécialisé. RH Pilot ne stocke aucun mot de passe.",
  },
  {
    title: "Journal des actions",
    text: "Les actions importantes sont journalisées et consultables en cas de besoin.",
  },
  {
    title: "Aucune revente de données",
    text: "Les données ne sont jamais vendues à des tiers, ni utilisées pour entraîner une IA sans consentement explicite préalable.",
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
        title="Sécurité et protection des données"
        intro="Comment RH Pilot héberge, cloisonne et protège les données RH de votre entreprise, et avec quels sous-traitants."
        scene={
          <CopilotScene
            figure="securite"
            ask={{ persona: "sophie", text: "Où sont hébergées nos données ?" }}
            answer="Dans l’Union européenne : base de données Neon, application à Francfort."
          />
        }
      />

      <section className={p.section}>
        <div className={`${s.wrap} ${p.columns}`}>
          <div>
            <h2 className={s.title}>Les mesures en place</h2>
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
          <h2 className={s.title}>Sous-traitants</h2>
          <p className={`${s.body} ${sec.narrow}`}>
            L’infrastructure de RH Pilot est détaillée dans notre{" "}
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
            <h2 className={s.title}>Vos droits sur vos données</h2>
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
          </div>
        </div>
      </section>

      <MarketingCTA
        title="Vos questions sur la sécurité"
        text="Écrivez-nous à contact@rhpilot.fr, nous vous répondons avec les détails techniques."
        href="mailto:contact@rhpilot.fr"
        action="Nous écrire"
      />
    </MarketingPage>
  );
}
