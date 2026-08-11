export function Card({
  children,
  className = "",
  compact = false,
  id,
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  id?: string;
  // Active un léger soulèvement + ombre au survol — à réserver aux
  // cartes réellement cliquables (ex. une carte enveloppée dans un
  // <Link>). Par défaut à false pour ne jamais laisser croire qu'une
  // carte purement informative est cliquable.
  interactive?: boolean;
}) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-surface-border bg-white shadow-card transition-all duration-200 ${
        interactive ? "hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-lg" : ""
      } ${compact ? "p-4" : "p-6"} ${className}`}
    >
      {children}
    </div>
  );
}
