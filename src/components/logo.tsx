import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("h-9 w-9", className)}
    >
      <rect
        x="9"
        y="5"
        width="25"
        height="31"
        rx="7"
        transform="rotate(8 21.5 20.5)"
        fill="currentColor"
        opacity="0.14"
      />
      <rect
        x="4"
        y="7"
        width="26"
        height="31"
        rx="7"
        transform="rotate(-6 17 22.5)"
        fill="#d9532b"
      />
      <path
        d="M17 14.5c.35 2.83 1.67 4.15 4.5 4.5-2.83.35-4.15 1.67-4.5 4.5-.35-2.83-1.67-4.15-4.5-4.5 2.83-.35 4.15-1.67 4.5-4.5Z"
        fill="#fff9ec"
      />
      <path
        d="M22.75 24.25c.18 1.45.85 2.12 2.3 2.3-1.45.18-2.12.85-2.3 2.3-.18-1.45-.85-2.12-2.3-2.3 1.45-.18 2.12-.85 2.3-2.3Z"
        fill="#fff9ec"
        opacity="0.75"
      />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  compact = false,
  tone = "dark",
}: {
  className?: string;
  href?: string;
  compact?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5",
        tone === "light" ? "text-cream" : "text-ink",
        className,
      )}
      aria-label="Recall home"
    >
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-3" />
      {!compact && (
        <span className="font-display text-[27px] leading-none tracking-[-0.02em]">
          recall<span className="text-accent">.</span>
        </span>
      )}
    </Link>
  );
}
