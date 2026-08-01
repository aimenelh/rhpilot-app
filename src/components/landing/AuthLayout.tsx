import { Logomark, Wordmark } from "@/components/Brand";
import { AuthCardStack } from "@/components/landing/AuthCardStack";

export function AuthLayout({
  title,
  subtitle,
  preview,
  children,
}: {
  title: string;
  subtitle: string;
  preview: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Panneau de marque — masqué sur mobile, le formulaire reste
          utilisable seul en dessous d'un certain gabarit (quality
          floor responsive). */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink px-12 py-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-blue/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-brand-violet/30 blur-3xl"
        />

        <div className="relative flex items-center gap-2">
          <Logomark size={30} />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            RH <span className="bg-brand-gradient bg-clip-text text-transparent">Pilot</span>
          </span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-semibold leading-tight text-white">{title}</h1>
          <p className="mt-3 max-w-sm text-sm text-white/60">{subtitle}</p>
          <div className="mt-10 max-w-md">
            <AuthCardStack>{preview}</AuthCardStack>
          </div>
        </div>

        <p className="relative text-xs text-white/40">Votre copilote d&apos;organisation RH</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-surface-subtle px-6 py-16 lg:w-1/2 lg:px-16">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <Logomark size={28} />
          <Wordmark />
        </div>
        {children}
      </div>
    </div>
  );
}
