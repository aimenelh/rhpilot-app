import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Logomark } from "@/components/Brand";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";

export function AuthLayout({
  title,
  subtitle,
  preview,
  formTitle,
  formSubtitle,
  children,
}: {
  title: string;
  subtitle: string;
  preview: React.ReactNode;
  formTitle: string;
  formSubtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AmbientNetwork />

      <style>{`
        @keyframes authIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-in { animation: authIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .auth-in { animation: none; }
        }
      `}</style>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-14 px-6 py-16 lg:flex-row lg:items-center lg:gap-20">
        {/* Colonne gauche — même langage que le hero de la landing */}
        <div className="w-full max-w-md lg:max-w-lg">
          <Link href="/" className="auth-in mb-8 flex items-center gap-2">
            <Logomark size={30} />
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              RH <span className="bg-brand-gradient bg-clip-text text-transparent">Pilot</span>
            </span>
          </Link>

          <h1
            className="auth-in text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl"
            style={{ animationDelay: "0.05s" }}
          >
            {title}
          </h1>
          <p className="auth-in mt-4 max-w-md text-base text-ink-soft" style={{ animationDelay: "0.12s" }}>
            {subtitle}
          </p>

          {/* La mascotte et les vraies cartes RH, déjà composées dans
              l'illustration elle-même : plus besoin de les recréer en
              petits mockups séparés à côté. */}
          <div className="auth-in mt-10 hidden lg:block" style={{ animationDelay: "0.22s" }}>
            {preview}
          </div>

          <div className="auth-in mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-faint" style={{ animationDelay: "0.3s" }}>
            <span className="flex items-center gap-1.5">
              <CircleCheck size={13} className="text-accent-teal" /> Hébergé en Europe
            </span>
            <span className="flex items-center gap-1.5">
              <CircleCheck size={13} className="text-accent-teal" /> Sécurisé
            </span>
            <span className="flex items-center gap-1.5">
              <CircleCheck size={13} className="text-accent-teal" /> Pensé pour le RGPD
            </span>
          </div>
        </div>

        {/* Colonne droite — épurée, sans halo ni ombre appuyée */}
        <div className="auth-in w-full max-w-md" style={{ animationDelay: "0.16s" }}>
          <div className="rounded-2xl border border-surface-border bg-white p-8">
            <h2 className="text-xl font-semibold text-ink">{formTitle}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{formSubtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
