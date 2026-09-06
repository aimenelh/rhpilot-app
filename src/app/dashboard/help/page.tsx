import Link from "next/link";
import { Search, Mail, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { FAQ_ENTRIES } from "@/lib/faq";

export default function HelpPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const categories = Array.from(new Set(FAQ_ENTRIES.map((entry) => entry.category)));
  const query = searchParams.q?.trim().toLowerCase() ?? "";
  const activeCategory = searchParams.category;

  const results = query
    ? FAQ_ENTRIES.filter(
        (entry) =>
          entry.question.toLowerCase().includes(query) || entry.answer.toLowerCase().includes(query)
      )
    : activeCategory
      ? FAQ_ENTRIES.filter((entry) => entry.category === activeCategory)
      : null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Besoin d&apos;aide ?</h1>
      <p className="mt-1 text-sm text-ink-soft">Cherchez une réponse, ou parcourez par catégorie.</p>

      <form method="get" className="relative mt-5">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input
          type="search"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Rechercher dans l'aide..."
          className="pl-10"
        />
      </form>

      {results === null ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((category) => {
            const count = FAQ_ENTRIES.filter((e) => e.category === category).length;
            return (
              <Link key={category} href={`/dashboard/help?category=${encodeURIComponent(category)}`}>
                <Card compact className="h-full transition-colors hover:border-brand-primary/40">
                  <p className="text-sm font-semibold text-ink">{category}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {count} question{count > 1 ? "s" : ""}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6">
          {!query && (
            <Link
              href="/dashboard/help"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
            >
              <ArrowLeft size={14} />
              Toutes les catégories
            </Link>
          )}
          {results.length === 0 ? (
            <p className="text-sm text-ink-faint">Aucune réponse ne correspond à cette recherche.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((entry) => (
                <Card key={entry.id} id={entry.id} compact>
                  <h3 className="text-sm font-semibold text-ink">{entry.question}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft">{entry.answer}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-surface-border pt-6">
        <div>
          <h2 className="text-sm font-semibold text-ink">Vous ne trouvez pas ?</h2>
          <p className="mt-0.5 text-sm text-ink-soft">On vous répond directement.</p>
        </div>
        <a
          href="mailto:aimenoffi@gmail.com?subject=Question%20RH%20Pilot"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-surface-border px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand-primary hover:text-brand-primary"
        >
          <Mail size={14} />
          Contacter RH Pilot
        </a>
      </div>
    </div>
  );
}
