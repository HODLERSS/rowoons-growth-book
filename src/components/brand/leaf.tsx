import { cn } from "@/lib/utils";

interface LeafProps {
  /** Confirmed (green leaf) or not yet (muted outline). */
  done?: boolean;
  size?: number;
  className?: string;
  /** Play the 180ms unfold animation (disabled by the reduced-motion rule in CSS). */
  stamp?: boolean;
  title?: string;
}

/** The Sprout device: a stem with two leaves. The leaves fill green when a milestone is confirmed. */
export function Leaf({ done = false, size = 24, className, stamp = false, title }: LeafProps) {
  const color = done ? "var(--gb-done)" : "var(--gb-muted)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", !done && "opacity-55", stamp && done && "leaf-unfold", className)}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    >
      <path d="M16 28V14" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M16 16c-1-6-5-8-10-8 0 6 4 9 10 8z" fill={done ? color : "none"} stroke={color} strokeWidth={done ? 0 : 2} strokeLinejoin="round" />
      <path d="M16 12c1-5 4-7 9-7 0 5-3 8-9 7z" fill={done ? color : "none"} stroke={color} strokeWidth={done ? 0 : 2} strokeLinejoin="round" />
    </svg>
  );
}

/** The mark on a filled coral square (profile card, empty states). */
export function LeafMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="var(--gb-ornament)" />
      <path d="M16 27V14" stroke="var(--gb-on-primary)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M16 16c-1-6-5-8-10-8 0 6 4 9 10 8z" fill="var(--gb-on-primary)" />
      <path d="M16 12c1-5 4-7 9-7 0 5-3 8-9 7z" fill="var(--gb-on-primary)" />
    </svg>
  );
}
