import Link from "next/link";
import { Compass } from "lucide-react";

// 404 à l'intérieur de l'application : garde le menu, au lieu de la 404 du site vitrine.
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary-dark">
        <Compass size={22} />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-ink">Cette page n&apos;existe pas</h1>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Le salarié, le parcours ou la page demandé a peut-être été archivé, ou l&apos;adresse a changé.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-dark">
          Tableau de bord
        </Link>
        <Link href="/dashboard/employees" className="rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle">
          Salariés
        </Link>
      </div>
    </div>
  );
}
