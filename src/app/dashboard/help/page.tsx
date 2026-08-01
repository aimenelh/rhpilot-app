import { Card } from "@/components/ui/Card";
import { FAQ_ENTRIES } from "@/lib/faq";

export default function HelpPage() {
  const categories = Array.from(new Set(FAQ_ENTRIES.map((entry) => entry.category)));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Centre d&apos;aide</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Les questions les plus fréquentes sur RH Pilot.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        {categories.map((category) => (
          <div key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {category}
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {FAQ_ENTRIES.filter((entry) => entry.category === category).map((entry) => (
                <Card key={entry.id} id={entry.id} compact>
                  <h3 className="text-sm font-semibold text-ink">{entry.question}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft">{entry.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
