export function Card({
  children,
  className = "",
  compact = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-surface-border bg-white shadow-card ${compact ? "p-4" : "p-6"} ${className}`}
    >
      {children}
    </div>
  );
}
