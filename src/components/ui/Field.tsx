import { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={`mb-1.5 block text-sm font-medium text-ink ${props.className ?? ""}`}
    />
  );
}

const FIELD_BASE =
  "w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-ink-faint focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-ink-faint";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD_BASE} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD_BASE} ${props.className ?? ""}`} />;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs leading-5 text-ink-faint">{children}</p>;
}
