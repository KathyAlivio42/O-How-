import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          "disabled:opacity-50 disabled:pointer-events-none",
          size === "lg" ? "px-6 py-4 text-base" : "px-4 py-2.5 text-sm",
          variant === "primary" &&
            "bg-brand text-cream hover:bg-brand-dark active:bg-brand-dark",
          variant === "secondary" &&
            "bg-brand-light text-brand-dark hover:bg-brand/15",
          variant === "ghost" &&
            "bg-transparent text-ink hover:bg-ink/5 border border-ink/10",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
