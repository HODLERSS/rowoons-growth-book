import { useCallback, useEffect, useMemo, useState } from "react";
import { chars, idempotencyKey, LockPreview, timeAgo } from "./ui";

// The Sprout admin tool. Every rule that matters is enforced by /api/admin (server/core.ts), not here: who may use
// it, the limits, app-only links, the broadcast count, idempotency, the audit. This page makes the safe path the
// easy one: a lock-screen preview, "Send test to me" first (sending to anyone else unlocks for those exact words),
// dry runs, and a broadcast that needs the recipient count typed out. Lists never show a baby's details; the
// detail panel shows first name and age for one profile at a time.
export const TITLE_MAX = 60;
export const BODY_MAX = 178;

export type AdminCall = (body: Record<string, unknown>) => Promise<{ status: number; body: Record<string, unknown> }>;
type Recipient = { key: string; kind: "account" | "guest"; email: string | null; web: number; ios: number; environments: string[]; lang: string; since: string; last_seen: string };
type Overview = { accounts: number; accountsNew7d: number; guestsWithPush: number; accountsWithPush: number; webSubscriptions: number; iosDevices: number; iosSandbox: number; reachable: number; apnsConfigured: boolean };
type Endpoint = { channel: "web" | "ios"; id: number; host?: string; environment?: string; seen: string; name: string | null; ageMonths: number | null; ageDays: number | null; corrected: boolean; lang: string };
type LogRow = { id: number; created_at: string; recipient: string | null; email: string | null; kind: string; title: string | null; status: string; devices: number; sent: number; dropped: number; error: string | null };
type Tab = "overview" | "send" | "weekly" | "history";

const label = (r: Recipient) => (r.kind === "account" ? (r.email ?? "Account") : `Guest ${r.key}`);
const channels = (r: { web: number; ios: number }) => [r.web ? `web ${r.web}` : "", r.ios ? `iOS ${r.ios}` : ""].filter(Boolean).join(" · ") || "none";

const LINKS: { value: string; label: string; month?: boolean }[] = [
  { value: "/", label: "Home" },
  { value: "/milestones/N/", label: "Milestones for month…", month: true },
  { value: "/play-tips/N/", label: "Play ideas for month…", month: true },
  { value: "/watch-outs/N/", label: "Safety for month…", month: true },
  { value: "/memo/", label: "Journal" },
  { value: "/settings/", label: "Settings" },
];

export function AdminScreen({ call, onSignOut }: { call: AdminCall; onSignOut: () => void }) {
  const [phase, setPhase] = useState<"checking" | "denied" | "ready">("checking");
  const [denied, setDenied] = useState<string>("");
  const [me, setMe] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [history, setHistory] = useState<LogRow[]>([]);

  const refresh = useCallback(async () => {
    const [o, r, h] = await Promise.all([call({ action: "overview" }), call({ action: "recipients" }), call({ action: "history", limit: 50 })]);
    if (o.status === 200) setOverview(o.body as unknown as Overview);
    if (r.status === 200) setRecipients((r.body.recipients ?? []) as Recipient[]);
    if (h.status === 200) setHistory((h.body.history ?? []) as LogRow[]);
  }, [call]);

  useEffect(() => {
    let live = true;
    call({ action: "whoami" }).then(async (r) => {
      if (!live) return;
      if (r.status !== 200 || r.body.admin !== true) {
        setDenied(String(r.body.error ?? ""));
        setPhase("denied");
        return;
      }
      setMe(String(r.body.email ?? ""));
      setPhase("ready");
      await refresh();
    });
    return () => {
      live = false;
    };
  }, [call, refresh]);

  if (phase === "checking")
    return (
      <p className="empty" aria-busy="true">
        Checking access…
      </p>
    );
  if (phase === "denied")
    return (
      <div className="card signin" data-testid="admin-denied">
        <h1 className="h1">No access</h1>
        <p className="sub">{denied || "This account is not a Sprout admin."}</p>
        <button className="btn secondary" onClick={onSignOut} data-testid="admin-sign-out">
          Sign out
        </button>
      </div>
    );

  return (
    <div data-testid="admin-ready">
      <div className="who">
        <span>
          Signed in as <strong>{me}</strong>. Every action is logged.
        </span>
        <button className="chip" onClick={onSignOut} data-testid="admin-sign-out">
          Sign out
        </button>
      </div>
      <nav className="tabs" role="tablist" aria-label="Sections">
        {(["overview", "send", "weekly", "history"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)} data-testid={`tab-${t}`}>
            {{ overview: "Overview", send: "Send", weekly: "Weekly note", history: "History" }[t]}
          </button>
        ))}
      </nav>
      {tab === "overview" && <OverviewTab call={call} overview={overview} recipients={recipients} />}
      {tab === "send" && <SendTab call={call} recipients={recipients} overview={overview} refresh={refresh} />}
      {tab === "weekly" && <WeeklyTab call={call} recipients={recipients} refresh={refresh} />}
      {tab === "history" && <HistoryTab history={history} />}
    </div>
  );
}

function Stat({ n, label, sub, testId }: { n: number | string; label: string; sub?: string; testId?: string }) {
  return (
    <div className="stat" data-testid={testId}>
      <div className="stat-n">{n}</div>
      <div className="stat-l">{label}</div>
      {sub && <div className="stat-s">{sub}</div>}
    </div>
  );
}

function OverviewTab({ call, overview: o, recipients }: { call: AdminCall; overview: Overview | null; recipients: Recipient[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Endpoint[] | null>(null);
  const show = async (key: string) => {
    if (open === key) {
      setOpen(null);
      return;
    }
    setOpen(key);
    setDetail(null);
    const r = await call({ action: "recipient", recipient: key });
    setDetail(r.status === 200 ? ((r.body.endpoints ?? []) as Endpoint[]) : []);
  };
  return (
    <section data-testid="admin-overview">
      <div className="stats">
        <Stat n={o?.accounts ?? "–"} label="Accounts" sub={o ? `${o.accountsNew7d} new in 7 days` : undefined} testId="stat-accounts" />
        <Stat n={o?.guestsWithPush ?? "–"} label="Guests with notifications" testId="stat-guests" />
        <Stat n={o?.webSubscriptions ?? "–"} label="Web push subscriptions" testId="stat-web" />
        <Stat n={o?.iosDevices ?? "–"} label="iOS devices" sub={o ? `${o.iosSandbox} sandbox${o.apnsConfigured ? "" : " · APNs not configured"}` : undefined} testId="stat-ios" />
      </div>
      <h2 className="h2">People you can reach ({recipients.length})</h2>
      <div className="card table-wrap" data-testid="admin-recipients">
        {recipients.length === 0 ? (
          <p className="sub pad">Nobody has notifications on yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Who</th>
                <th>Channels</th>
                <th>Lang</th>
                <th>Since</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <FragmentRow key={r.key} r={r} open={open === r.key} detail={open === r.key ? detail : null} onToggle={() => void show(r.key)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function FragmentRow({ r, open, detail, onToggle }: { r: Recipient; open: boolean; detail: Endpoint[] | null; onToggle: () => void }) {
  return (
    <>
      <tr>
        <td>{label(r)}</td>
        <td>
          {channels(r)}
          {r.environments.includes("sandbox") ? " · sandbox" : ""}
        </td>
        <td>{r.lang}</td>
        <td className="num">{timeAgo(r.since)}</td>
        <td className="num">{timeAgo(r.last_seen)}</td>
        <td>
          <button className="chip" aria-expanded={open} onClick={onToggle} data-testid={`detail-${r.key}`}>
            {open ? "Hide" : "Details"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="detail">
          <td colSpan={6} data-testid="admin-detail">
            {detail === null ? (
              "Loading…"
            ) : detail.length === 0 ? (
              "Nothing to show."
            ) : (
              <ul>
                {detail.map((d) => (
                  <li key={`${d.channel}${d.id}`}>
                    <strong>{d.channel === "web" ? `Web (${d.host})` : `iPhone${d.environment === "sandbox" ? " (sandbox)" : ""}`}</strong> · baby {d.name ?? "unnamed"}
                    {d.ageMonths !== null ? `, ${d.ageMonths} mo ${d.ageDays} d${d.corrected ? " (weekly notes use corrected age)" : ""}` : ", no birth date"} · {d.lang} · seen {timeAgo(d.seen)}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Note({ note }: { note: { ok: boolean; text: string } | null }) {
  if (!note) return null;
  return (
    <div className={note.ok ? "status-note" : "error-note"} role="status" data-testid="admin-result">
      {note.text}
    </div>
  );
}

function SendTab({ call, recipients, overview, refresh }: { call: AdminCall; recipients: Recipient[]; overview: Overview | null; refresh: () => Promise<void> }) {
  const [to, setTo] = useState("me");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkKind, setLinkKind] = useState("/");
  const [month, setMonth] = useState("1");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tested, setTested] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const link = linkKind.includes("N") ? linkKind.replace("N", String(Math.min(36, Math.max(1, Number(month) || 1)))) : linkKind;
  const words = `${title.trim()}\u0000${body.trim()}\u0000${link}`;
  const titleN = chars(title);
  const bodyN = chars(body);
  const valid = titleN > 0 && titleN <= TITLE_MAX && bodyN > 0 && bodyN <= BODY_MAX;
  const reachable = useMemo(() => recipients.filter((r) => r.web + (overview?.apnsConfigured ? r.ios : 0) > 0), [recipients, overview]);
  const target = recipients.find((r) => r.key === to) ?? null;

  const run = async (payload: Record<string, unknown>, done: (b: Record<string, unknown>) => string) => {
    setBusy(true);
    setNote(null);
    setErrors({});
    try {
      const r = await call({ ...payload, title: title.trim(), body: body.trim(), link, ...(payload.dry_run ? {} : { idempotency_key: idempotencyKey() }) });
      if (r.status === 200 && r.body.ok !== false) {
        setNote({ ok: true, text: done(r.body) });
        return r.body;
      }
      if (r.body.errors) setErrors(r.body.errors as Record<string, string>);
      setNote({ ok: false, text: String(r.body.error ?? `Failed (${r.status})`) + (r.status === 401 ? " Your session may have expired." : "") });
      return null;
    } finally {
      setBusy(false);
      void refresh();
    }
  };
  const plural = (n: unknown, w: string) => `${n} ${w}${Number(n) === 1 ? "" : "s"}`;

  return (
    <section className="card compose" data-testid="admin-send">
      <label className="field">
        <span>Recipient</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} data-testid="admin-recipient">
          <option value="me">Me (test)</option>
          {recipients.map((r) => (
            <option key={r.key} value={r.key}>
              {label(r)} · {channels(r)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>
          Title{" "}
          <span className={"count" + (titleN > TITLE_MAX ? " over" : "")} data-testid="admin-title-count">
            {titleN}/{TITLE_MAX}
          </span>
        </span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX * 2} data-testid="admin-title" placeholder="A note from Sprout" />
        {errors.title && <div className="field-err" role="alert">{errors.title}</div>}
      </label>
      <label className="field">
        <span>
          Body{" "}
          <span className={"count" + (bodyN > BODY_MAX ? " over" : "")} data-testid="admin-body-count">
            {bodyN}/{BODY_MAX}
          </span>
        </span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={BODY_MAX * 2} data-testid="admin-body" placeholder="What's new this week in the book." />
        {errors.body && <div className="field-err" role="alert">{errors.body}</div>}
      </label>
      <div className="row2">
        <label className="field">
          <span>Tap opens</span>
          <select value={linkKind} onChange={(e) => setLinkKind(e.target.value)} data-testid="admin-link">
            {LINKS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        {linkKind.includes("N") && (
          <label className="field narrow">
            <span>Month</span>
            <input inputMode="numeric" value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} data-testid="admin-link-month" />
          </label>
        )}
      </div>
      {errors.link && <div className="field-err" role="alert">{errors.link}</div>}
      <p className="sub mono" data-testid="admin-link-value">
        Opens {link}
      </p>

      <LockPreview title={title} body={body} />

      <div className="actions">
        <button
          className="btn"
          disabled={busy || !valid}
          data-testid="admin-send-test"
          onClick={async () => {
            const b = await run({ action: "test" }, (x) => `Sent to your ${plural(x.sent, "device")}.`);
            if (b) setTested(words);
          }}
        >
          Send test to me
        </button>
        <button
          className="btn secondary"
          disabled={busy || !valid}
          data-testid="admin-dry-run"
          onClick={() =>
            void run(to === "me" ? { action: "test", dry_run: true } : { action: "send", recipient: to, dry_run: true }, (x) => `Dry run: valid, would reach ${plural(x.devices, "device")}${Number(x.iosSkipped) ? ` (${x.iosSkipped} iOS skipped: APNs not configured)` : ""}. Nothing sent.`)
          }
        >
          Dry run
        </button>
      </div>
      {to !== "me" && (
        <div className="actions">
          <button className="btn" disabled={busy || !valid || tested !== words} data-testid="admin-send-one" onClick={() => void run({ action: "send", recipient: to }, (x) => `Sent to ${target ? label(target) : "them"} (${x.sent} of ${plural(x.devices, "device")}).`)}>
            Send to {target ? label(target) : "recipient"}
          </button>
        </div>
      )}
      <div className="actions">
        <button
          className="btn secondary"
          disabled={busy || !valid || tested !== words || !reachable.length}
          data-testid="admin-broadcast"
          onClick={() => {
            setTyped("");
            setConfirming(true);
          }}
        >
          Send to everyone ({reachable.length})
        </button>
      </div>
      {valid && tested !== words && (
        <p className="sub" data-testid="admin-test-first">
          Send a test to yourself first: sending to anyone else unlocks for these exact words.
        </p>
      )}
      <Note note={note} />

      {confirming && (
        <div className="sheet-back" role="dialog" aria-modal="true" aria-label="Confirm broadcast">
          <div className="sheet">
            <h2 className="h2">Send to everyone?</h2>
            <p className="sub">
              “{title.trim()}” goes to {plural(reachable.length, "recipient")} with notifications on. It can’t be recalled. Type <strong>{reachable.length}</strong> to confirm.
            </p>
            <label className="field">
              <span>Recipient count</span>
              <input inputMode="numeric" value={typed} onChange={(e) => setTyped(e.target.value)} data-testid="admin-confirm-count" />
            </label>
            <button
              className="btn danger"
              disabled={busy || typed.trim() !== String(reachable.length)}
              data-testid="admin-confirm-broadcast"
              onClick={async () => {
                await run({ action: "broadcast", confirm_count: Number(typed) }, (x) => `Sent to ${plural(x.recipients, "recipient")} (${plural(x.sent, "device")}${Number(x.failed) ? `, ${x.failed} failed` : ""}).`);
                setConfirming(false);
              }}
            >
              Send to {reachable.length}
            </button>
            <button
              className="btn secondary"
              disabled={busy || typed.trim() === ""}
              data-testid="admin-confirm-dry"
              onClick={() => void run({ action: "broadcast", confirm_count: Number(typed), dry_run: true }, (x) => `Dry run: would reach ${plural(x.recipients, "recipient")} on ${plural(x.devices, "device")}. Nothing sent.`).then(() => setConfirming(false))}
            >
              Dry run instead
            </button>
            <button className="btn secondary" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function WeeklyTab({ call, recipients, refresh }: { call: AdminCall; recipients: Recipient[]; refresh: () => Promise<void> }) {
  const [to, setTo] = useState(recipients[0]?.key ?? "");
  const [preview, setPreview] = useState<{ title: string; body: string; url: string; month: number } | null>(null);
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!to && recipients.length) setTo(recipients[0].key);
  }, [to, recipients]);

  const load = async () => {
    setBusy(true);
    setNote(null);
    setPreview(null);
    try {
      const r = await call({ action: "weekly_preview", recipient: to });
      if (r.status !== 200) setNote({ ok: false, text: String(r.body.error ?? `Failed (${r.status})`) });
      else if (!r.body.note) setNote({ ok: false, text: String(r.body.reason ?? "No note this week.") });
      else {
        setPreview(r.body.note as { title: string; body: string; url: string; month: number });
        setPreviewFor(to);
      }
    } finally {
      setBusy(false);
    }
  };
  const send = async (dry: boolean) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await call({ action: "weekly_send", recipient: to, ...(dry ? { dry_run: true } : { idempotency_key: idempotencyKey() }) });
      if (r.status === 200 && r.body.ok !== false) setNote({ ok: true, text: dry ? `Dry run: would reach ${r.body.devices} device(s). Nothing sent.` : `Sent this week's note (${r.body.sent} of ${r.body.devices} device(s)).` });
      else setNote({ ok: false, text: String(r.body.error ?? `Failed (${r.status})`) });
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  return (
    <section className="card compose" data-testid="admin-weekly">
      <p className="sub">The note the Sunday 9 am job would send this profile this week. Send it now to check it on a phone. It goes to the profile's web push subscriptions. iPhones are skipped: the iOS app schedules its own weekly notes on the phone and sends us nothing about the baby.</p>
      <label className="field">
        <span>Profile</span>
        <select
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPreview(null);
            setNote(null);
          }}
          data-testid="weekly-recipient"
        >
          {recipients.length === 0 && <option value="">Nobody has notifications on</option>}
          {recipients.map((r) => (
            <option key={r.key} value={r.key}>
              {label(r)} · {channels(r)}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button className="btn secondary" disabled={busy || !to} onClick={() => void load()} data-testid="weekly-preview">
          Preview this week’s note
        </button>
      </div>
      {preview && previewFor === to && (
        <>
          <LockPreview title={preview.title} body={preview.body} testId="weekly-lock" />
          <p className="sub mono">
            Month {preview.month} · opens {preview.url}
          </p>
          <div className="actions">
            <button className="btn" disabled={busy} onClick={() => void send(false)} data-testid="weekly-send">
              Send now
            </button>
            <button className="btn secondary" disabled={busy} onClick={() => void send(true)} data-testid="weekly-dry">
              Dry run
            </button>
          </div>
        </>
      )}
      <Note note={note} />
    </section>
  );
}

function HistoryTab({ history }: { history: LogRow[] }) {
  return (
    <section className="card table-wrap" data-testid="admin-history">
      {history.length === 0 ? (
        <p className="sub pad">Nothing sent yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>To</th>
              <th>Kind</th>
              <th>Title</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td className="num">{timeAgo(h.created_at)}</td>
                <td>{h.email ?? h.recipient ?? "–"}</td>
                <td>{h.kind.replace("admin_", "")}</td>
                <td>{h.title ?? ""}</td>
                <td className={"st-" + h.status}>
                  {h.status} {h.sent}/{h.devices}
                  {h.dropped ? ` · ${h.dropped} removed` : ""}
                  {h.error ? ` · ${h.error}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
