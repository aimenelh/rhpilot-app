import Link from "next/link";
import { ArrowRight, Mail, UserRound } from "lucide-react";
import { Logomark } from "@/components/Brand";

/**
 * Écran mobile des pages de connexion et d'inscription. L'espace employeur se pilote
 * depuis un ordinateur ; sur téléphone, on oriente sans impasse : le salarié vers son
 * espace, l'employeur vers un lien à rouvrir sur ordinateur ou vers le diagnostic RH.
 */
export function MobileAppNotice({ mode }: { mode: "sign-in" | "sign-up" }) {
  const link = `https://rhpilot.fr/${mode}`;
  const mailto = `mailto:?subject=${encodeURIComponent("RH Pilot, à ouvrir sur ordinateur")}&body=${encodeURIComponent(`Lien pour ${mode === "sign-up" ? "créer mon espace" : "me connecter"} : ${link}`)}`;
  return (
    <div className="flex min-h-screen flex-col justify-center gap-6 px-6 py-10">
      <div className="flex items-center gap-2">
        <Logomark size={28} />
        <span className="text-[15px] font-semibold text-ink">RH Pilot</span>
      </div>

      <Link href="/espace/connexion" className="flex items-center gap-3 rounded-2xl bg-brand-primary px-5 py-4 text-white shadow-elevated">
        <UserRound size={22} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Vous êtes salarié ?</span>
          <span className="block text-sm text-white/90">Accéder à mon espace : bulletins, congés, documents</span>
        </span>
        <ArrowRight size={18} className="shrink-0" />
      </Link>

      <div className="rounded-2xl border border-surface-border bg-white p-5">
        <h1 className="text-lg font-semibold text-ink">
          {mode === "sign-up" ? "Créer l'espace de votre entreprise" : "Espace employeur"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Le suivi RH et la paie se pilotent depuis un ordinateur, où tout tient sur un écran. Envoyez-vous le lien pour
          le retrouver plus tard.
        </p>
        <a href={mailto} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-semibold text-ink">
          <Mail size={16} /> M&apos;envoyer le lien par e-mail
        </a>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-brand-primary-dark"><Link href="/services?demo=1" className="underline">Voir la démonstration</Link><Link href="/contact" className="underline">Demander une présentation</Link></div>
        <p className="mt-4 text-sm text-ink-soft">
          En attendant, testez votre suivi RH en deux minutes :{" "}
          <Link href="/diagnostic" className="font-semibold text-brand-primary-dark underline underline-offset-2">faire le diagnostic</Link>.
        </p>
      </div>

      <Link href="/" className="text-center text-sm font-medium text-ink-soft underline underline-offset-2">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
