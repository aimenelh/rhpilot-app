import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Globe,
  KeyRound,
  FileClock,
  ShieldX,
  FileLock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";

export const metadata = {
  title: "Sécurité — RH Pilot",
  description:
    "Comment RH Pilot protège vos données RH : isolation entre organisations, hébergement en Europe, authentification déléguée, traçabilité complète.",
};

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Isolation stricte des données",
    text: "Chaque organisation cliente est cloisonnée. Vos données ne sont jamais mêlées à celles d'une autre entreprise.",
  },
  {
    icon: Globe,
    title: "Hébergé en Europe",
    text: "Base de données et application hébergées dans l'Union européenne.",
    badge: true,
  },
  {
    icon: KeyRound,
    title: "Authentification déléguée",
    text: "Gérée par Clerk, spécialiste de l'authentification — jamais construite ni stockée par nous-mêmes.",
  },
  {
    icon: FileClock,
    title: "Traçabilité complète",
    text: "Chaque action importante est journalisée, consultable en cas de besoin.",
  },
  {
    icon: ShieldX,
    title: "Aucune donnée vendue",
    text: "Jamais vendues à des tiers, jamais utilisées pour entraîner une IA sans consentement explicite préalable.",
  },
  {
    icon: FileLock,
    title: "Fichiers privés par nature",
    text: "Accès aux documents joints uniquement via des liens temporaires et signés.",
  },
];

const VENDORS = [
  { name: "Neon", role: "Base de données (UE)", src: "/logos/neon.png", w: 581, h: 194, dark: false },
  { name: "Clerk", role: "Authentification", src: "/logos/clerk.png", w: 580, h: 197, dark: false },
  { name: "Resend", role: "Emails transactionnels", src: "/logos/resend.png", w: 712, h: 199, dark: true },
  { name: "Vercel", role: "Hébergement de l'application", src: "/logos/vercel.png", w: 800, h: 201, dark: false },
];

const RIGHTS = ["Accès", "Rectification", "Effacement", "Limitation", "Portabilité", "Opposition"];

// Drapeau européen reconstruit fidèlement (fond bleu, 12 étoiles en
// cercle) — le fichier fourni portait un filigrane visible, inutilisable
// tel quel sur un vrai site.
function EUFlag({ size = 22 }: { size?: number }) {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
    return { x: 12 + 7 * Math.cos(angle), y: 12 + 7 * Math.sin(angle) };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0 rounded-sm" aria-label="Union européenne">
      <rect width="24" height="24" fill="#003399" />
      {stars.map((s, i) => (
        <text key={i} x={s.x} y={s.y} fontSize="5" fill="#FFCC00" textAnchor="middle" dominantBaseline="central">
          ★
        </text>
      ))}
    </svg>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      {/* Hero */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <Reveal variant="scale">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            <ShieldCheck size={13} /> Sécurité
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            La confiance ne se décrète pas.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-4 text-lg text-ink-soft">
            Vos données RH sont sensibles. Voici, concrètement, comment RH Pilot les traite —
            sans jargon, et sans rien promettre que nous ne fassions déjà.
          </p>
        </Reveal>
      </section>

      {/* Les 6 piliers */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((item, index) => (
              <Reveal key={item.title} variant="bounce" delay={(index % 3) * 100 + Math.floor(index / 3) * 120}>
                <Card className="h-full">
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                      <item.icon size={18} />
                    </span>
                    {item.badge && <EUFlag size={24} />}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft">{item.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sous-traitants réels */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Reveal variant="scale">
          <h2 className="text-2xl font-semibold text-ink">Avec qui nous travaillons</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-soft">
            Aucun mystère : voici l&apos;infrastructure réelle derrière RH Pilot, listée en
            détail dans notre politique de confidentialité.
          </p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {VENDORS.map((vendor, index) => (
            <Reveal key={vendor.name} variant="bounce" delay={index * 90}>
              <Card compact className={vendor.dark ? "bg-[#0a0a0a]" : ""}>
                <div className="flex h-8 items-center justify-center">
                  <Image
                    src={vendor.src}
                    alt={vendor.name}
                    width={vendor.w}
                    height={vendor.h}
                    className="h-full w-auto object-contain"
                  />
                </div>
                <p className={`mt-2 text-xs ${vendor.dark ? "text-white/60" : "text-ink-faint"}`}>{vendor.role}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* RGPD */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <Reveal variant="scale">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-2xl font-semibold text-ink">Vos droits, sans détour</h2>
            <p className="mt-3 text-sm text-ink-soft">
              RH Pilot agit comme sous-traitant au sens du RGPD — l&apos;entreprise cliente
              reste responsable du traitement des données de ses salariés. Vous conservez à
              tout moment :
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {RIGHTS.map((right) => (
                <span
                  key={right}
                  className="rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft"
                >
                  {right}
                </span>
              ))}
            </div>
            <Link
              href="/confidentialite"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline"
            >
              Lire la politique de confidentialité complète <ExternalLink size={14} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Honnêteté produit — lien direct avec la sécurité */}
      <section className="bg-ink py-16">
        <Reveal variant="scale">
          <p className="mx-auto max-w-lg px-6 text-center text-lg font-medium leading-relaxed text-white">
            RH Pilot n&apos;interprète jamais votre convention collective : il vous oriente
            simplement vers la bonne source officielle, au bon moment.
          </p>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Reveal variant="bounce">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <p className="text-base font-medium text-ink">
              Une question sur la sécurité de vos données ?
            </p>
            <Link href="/sign-up" className="mt-5 inline-block">
              <Button className="px-6 py-3 text-base">
                <span className="inline-flex items-center gap-2">
                  Essayer gratuitement <ArrowRight size={16} />
                </span>
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
