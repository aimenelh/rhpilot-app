export function Logomark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#E8432E" />
      <path
        d="M10 8h8a5 5 0 0 1 0 10h-3.5l6 6h-5l-5.5-5.5V24h-4V8h4Zm0 4v3h7.5a1.5 1.5 0 1 0 0-3H10Z"
        fill="white"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        RH <span className="bg-brand-primary bg-clip-text text-transparent">Pilot</span>
      </span>
      <span className="rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
        Bêta
      </span>
    </span>
  );
}
