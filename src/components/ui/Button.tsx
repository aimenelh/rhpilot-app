import { ButtonHTMLAttributes, ReactElement, cloneElement, forwardRef, isValidElement } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white shadow-card hover:opacity-95 hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-card",
  secondary:
    "bg-white text-ink border border-surface-border hover:bg-surface-subtle disabled:opacity-50",
  ghost: "text-ink-soft hover:bg-surface-subtle disabled:opacity-50",
  danger:
    "bg-white text-accent-rose border border-accent-rose/30 hover:bg-accent-rose/5 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", asChild = false, children, ...props }, ref) => {
    const classes = `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`;

    if (asChild) {
      if (!isValidElement(children)) {
        throw new Error("Button asChild attend un élément React unique comme enfant.");
      }

      return cloneElement(children as ReactElement<{ className?: string }>, {
        className: `${classes} ${children.props.className ?? ""}`,
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
