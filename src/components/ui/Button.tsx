import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-card hover:opacity-95 disabled:opacity-50",
  secondary:
    "bg-white text-ink border border-surface-border hover:bg-surface-subtle disabled:opacity-50",
  ghost: "text-ink-soft hover:bg-surface-subtle disabled:opacity-50",
  danger:
    "bg-white text-accent-rose border border-accent-rose/30 hover:bg-accent-rose/5 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
