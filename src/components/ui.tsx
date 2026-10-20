import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-cream hover:bg-forest shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]",
  secondary:
    "bg-surface text-ink border border-line-strong hover:border-ink/40 hover:bg-white",
  ghost: "text-ink-soft hover:bg-ink/[0.06]",
  accent: "bg-accent-deep text-white hover:bg-[#9e3614]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2.5",
  icon: "h-10 w-10 gap-0",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 select-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(function Button({ className, variant, size, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
});

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-ink/25 focus:border-ink/50 focus:bg-white focus:outline-none focus:ring-0 disabled:opacity-60";

export const labelClass =
  "block text-[13px] font-semibold tracking-[-0.01em] text-ink";

