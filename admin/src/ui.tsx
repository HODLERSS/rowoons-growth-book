// Small helpers for the admin page, kept here so the page imports nothing from the consumer app.
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const chars = (s: string) => [...s.trim()].length;

/** A fresh key per send click: the server refuses to send twice for the same key (a double click, a retry). */
export const idempotencyKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9]/g, "").slice(0, 32);

/** The Sprout device (stem and two leaves) on the coral tile. */
export const Mark = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="9" fill="var(--gb-ornament)" />
    <path d="M16 27V14" stroke="var(--gb-on-primary)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    <path d="M16 16c-1-6-5-8-10-8 0 6 4 9 10 8z" fill="var(--gb-on-primary)" />
    <path d="M16 12c1-5 4-7 9-7 0 5-3 8-9 7z" fill="var(--gb-on-primary)" />
  </svg>
);

export function LockPreview({ title, body, testId = "admin-preview" }: { title: string; body: string; testId?: string }) {
  const now = new Date();
  return (
    <div className="lock-preview" aria-label="Lock screen preview" data-testid={testId}>
      <div className="lp-time">{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/, "")}</div>
      <div className="lp-date">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      <div className="lp-note">
        <span className="lp-icon">
          <Mark size={34} />
        </span>
        <span className="lp-app">SPROUT</span>
        <span className="lp-when">now</span>
        <span className="lp-title">{title.trim() || "Title"}</span>
        <span className="lp-body">{body.trim() || "Body"}</span>
      </div>
    </div>
  );
}
