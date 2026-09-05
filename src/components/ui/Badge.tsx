const TONE_CLASSES = {
  neutral: "bg-surface-subtle text-ink-soft",
  brand: "bg-brand-primary/10 text-brand-primary",
  teal: "bg-accent-teal/10 text-accent-teal",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
