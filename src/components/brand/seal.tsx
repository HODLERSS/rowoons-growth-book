import { cn } from "@/lib/utils";

interface SealProps {
  /** Stamped (done) or empty outline. */
  done?: boolean;
  size?: number;
  className?: string;
  /** Play the 120ms landing animation (respects reduced motion via CSS). */
  stamp?: boolean;
  title?: string;
}

/** The Dodam seal: a square stamp holding ㄷ — the first letter of 도담 and a D at once. */
export function Seal({ done = false, size = 24, className, stamp = false, title }: SealProps) {
  const color = done ? "var(--gb-done)" : "var(--gb-muted)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", !done && "opacity-60", stamp && done && "seal-stamp", className)}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    >
      <rect x="4" y="4" width="24" height="24" rx="5" fill="none" stroke={color} strokeWidth="2.4" />
      <path d="M20 11H12v10h8" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="square" />
    </svg>
  );
}

/** Reversed seal on a filled square (used for the profile card and empty states). */
export function SealMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--gb-ornament)" />
      <path d="M21 10.5H11v11h10" fill="none" stroke="var(--gb-on-primary)" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}
