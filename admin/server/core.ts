// The Sprout admin API: every rule that keeps it safe, behind small interfaces so it is unit-tested against an
// in-memory store (core.test.ts) and wired to Supabase, web push and APNs in production (store.ts, handler.ts).
//
//  - identity: the caller's access token is verified by Supabase Auth, and the email on the ACCOUNT (not a claim
//    in the token) must be confirmed and on the allowlist (ADMIN_EMAILS env, else Vault admin_emails, else the owner)
//  - origin: a browser request from anywhere but the admin site is refused (handler.ts, originOk)
//  - validation: title 1-60 characters, body 1-178, the tap target restricted to the app's own routes
//  - privacy: lists and logs never carry a baby's name or birth date; only `recipient` (one profile, on purpose)
//    and the weekly preview show a first name and age. Weekly sends are logged with a placeholder title.
//  - rate limits: 50 single sends (test, one person, weekly) per hour per admin, 1 broadcast per 10 minutes; dry
//    runs are free
//  - a broadcast must name the recipient count it is about to reach (confirm_count), so a stale page can't blast
//  - idempotency: a send carries idempotency_key; a retry with the same key sends nothing twice
//  - every call, refused or not, is written to admin_audit; every send to push_log
import { apnsHeaders, apnsPayload, asEnv, jwtReusable, mintApnsJwt, sendOne, type ApnsConfig, type ApnsEnv, type IosResult, type Note, type Transport } from "./apns";
import { weeklyMessage } from "@/lib/weekly-message";
import { correctedAge } from "@/lib/corrected-age";

export const TITLE_MAX = 60;
export const BODY_MAX = 178;
export const SINGLE_PER_HOUR = 50;
export const BROADCAST_EVERY_MS = 10 * 60_000;
export const DEFAULT_ADMINS = ["minjae.m.lee@gmail.com"];
export const DEFAULT_ADMIN_ORIGINS = ["https://sprout-admin-minjae.vercel.app"];

export type Actor = { id: string; email: string; confirmed: boolean };
type Snapshot = { lang: string; tz: string; name: string | null; birth_date: string | null; due_date: string | null };
export type WebSub = Snapshot & { id: number; endpoint: string; p256dh: string; auth: string; user_id: string | null; created_at: string; updated_at: string };
export type IosDevice = Snapshot & { id: number; token: string; environment: string; user_id: string | null; created_at: string; last_seen_at: string };
export type Account = { id: string; email: string | null; created_at: string; last_sign_in_at: string | null };
export type AuditRow = { actor_id: string | null; actor_email: string | null; action: string; target?: string | null; payload?: unknown; result?: unknown; ok: boolean };
export type LogRow = {
  recipient: string; user_id: string | null; kind: string; title: string | null; body: string | null; link: string | null; status: string;
  devices?: number; sent?: number; dropped?: number; error?: string | null; results?: unknown; dedupe_key?: string | null; actor_id?: string | null;
};

export interface AdminStore {
  secret(name: string): Promise<string>;
  accounts(): Promise<Account[]>;
  webSubs(): Promise<WebSub[]>;
  iosDevices(): Promise<IosDevice[]>;
  /** audit rows by this actor with ok=true for these actions since the time */
  recentCount(actorId: string, actions: string[], sinceIso: string): Promise<number>;
  audit(row: AuditRow): Promise<void>;
  history(limit: number): Promise<Record<string, unknown>[]>;
  /** insert a log row; null when its dedupe_key was already used */
  claim(row: LogRow): Promise<number | null>;
  finish(id: number, patch: Partial<LogRow>): Promise<void>;
  dropWeb(endpoints: string[]): Promise<void>;
  dropIos(tokens: string[]): Promise<void>;
  setIosEnv(token: string, environment: ApnsEnv): Promise<void>;
  cachedJwt(): Promise<{ jwt: string; iat: number; key_id: string } | null>;
  saveJwt(v: { jwt: string; iat: number; key_id: string } | null): Promise<void>;
}

export type Deps = {
  store: AdminStore;
  env: (k: string) => string | undefined;
  /** verify an access token; null when missing, malformed, badly signed, expired, or not a user */
  verify(jwt: string): Promise<Actor | null>;
  /** one web push; resolves with the push service's status code (201 = accepted), never throws */
  webPush(sub: WebSub, payload: string): Promise<{ status: number; error?: string }>;
  apns(): Transport;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

type Res = { status: number; body: Record<string, unknown> };
const res = (status: number, body: Record<string, unknown>): Res => ({ status, body });

// ---------- small pure rules ----------

export const adminOrigins = (raw: string | null | undefined): string[] => {
  const list = String(raw ?? "").split(/[,\s]+/).map((s) => s.trim().replace(/\/+$/, "")).filter((s) => /^https?:\/\/[^/]+$/.test(s));
  return list.length ? list : DEFAULT_ADMIN_ORIGINS;
};
/** A request without an Origin is not a browser (curl, a script with a token); one with a foreign Origin is refused. */
export const originOk = (origin: string | null | undefined, allowed: string[]): boolean => origin == null || allowed.includes(origin);

export const adminEmails = (raw: string | null | undefined): string[] => {
  const list = String(raw ?? "").split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter((s) => /.+@.+\..+/.test(s));
  return list.length ? list : DEFAULT_ADMINS;
};

/** Routes a notification may open: the app's own month pages, the journal and settings (same rule as the app). */
export const LINK_RE = /^\/$|^\/(milestones|play-tips|watch-outs)\/([1-9]|[12][0-9]|3[0-6])\/$|^\/(memo|settings)\/$/;

// control characters (a notification is one paragraph) and zero-width / bidi tricks go; the rest is kept
const STRIP_RANGES: [number, number][] = [[0x00, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2064], [0xfeff, 0xfeff]];
const STRIP = new RegExp(`[${STRIP_RANGES.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join("")}]`, "g");
const clean = (v: unknown) => String(v ?? "").replace(STRIP, " ").replace(/\s+/g, " ").trim();
const chars = (s: string) => [...s].length;

export function validateDraft(input: { title?: unknown; body?: unknown; link?: unknown }): { ok: true; note: Note } | { ok: false; errors: Record<string, string> } {
  const title = clean(input.title);
  const body = clean(input.body);
  const link = input.link == null || input.link === "" ? "/" : String(input.link).trim();
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Title is required.";
  else if (chars(title) > TITLE_MAX) errors.title = `Title is ${chars(title)} characters; the limit is ${TITLE_MAX}.`;
  if (!body) errors.body = "Body is required.";
  else if (chars(body) > BODY_MAX) errors.body = `Body is ${chars(body)} characters; the limit is ${BODY_MAX}.`;
  if (!LINK_RE.test(link)) errors.link = "Link must be an app route: /, /milestones/N/, /play-tips/N/, /watch-outs/N/, /memo/ or /settings/.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, note: { title, body, url: link } };
}

// ---------- recipients ----------

export type Recipient = {
  key: string; kind: "account" | "guest"; email: string | null; web: number; ios: number; environments: string[];
  lang: string; since: string; last_seen: string;
};
type Endpoints = { web: WebSub[]; ios: IosDevice[] };

/** Accounts get one row (all of their subscriptions and devices); a guest subscription or device is its own row. */
export function groupRecipients(subs: WebSub[], devs: IosDevice[], accounts: Account[]): { list: Recipient[]; endpoints: Map<string, Endpoints> } {
  const emails = new Map(accounts.map((a) => [a.id, a.email]));
  const endpoints = new Map<string, Endpoints>();
  const add = (key: string, e: { web?: WebSub; ios?: IosDevice }) => {
    const cur = endpoints.get(key) ?? { web: [], ios: [] };
    if (e.web) cur.web.push(e.web);
    if (e.ios) cur.ios.push(e.ios);
    endpoints.set(key, cur);
  };
  for (const s of subs) add(s.user_id ? `user:${s.user_id}` : `web:${s.id}`, { web: s });
  for (const d of devs) add(d.user_id ? `user:${d.user_id}` : `ios:${d.id}`, { ios: d });
  const list: Recipient[] = [];
  for (const [key, e] of endpoints) {
    const all = [...e.web.map((w) => ({ lang: w.lang, since: w.created_at, seen: w.updated_at })), ...e.ios.map((d) => ({ lang: d.lang, since: d.created_at, seen: d.last_seen_at }))];
    const latest = all.reduce((a, b) => (b.seen > a.seen ? b : a));
    list.push({
      key,
      kind: key.startsWith("user:") ? "account" : "guest",
      email: key.startsWith("user:") ? (emails.get(key.slice(5)) ?? null) : null,
      web: e.web.length,
      ios: e.ios.length,
      environments: [...new Set(e.ios.map((d) => asEnv(d.environment)))].sort(),
      lang: latest.lang,
      since: all.reduce((a, b) => (b.since < a.since ? b : a)).since,
      last_seen: latest.seen,
    });
  }
  list.sort((a, b) => (a.kind !== b.kind ? (a.kind === "account" ? -1 : 1) : b.last_seen.localeCompare(a.last_seen)));
  return { list, endpoints };
}

/** First name and age in months for one snapshot: shown only on the detail view, never in a list or a log. */
export function profileSummary(s: Snapshot, now: Date): { name: string | null; ageMonths: number | null; ageDays: number | null; corrected: boolean; lang: string } {
  const firstName = s.name ? s.name.trim().split(/\s+/)[0] || null : null;
  if (!s.birth_date) return { name: firstName, ageMonths: null, ageDays: null, corrected: false, lang: s.lang };
  const c = correctedAge(s.birth_date, s.due_date, now);
  if (!c.chronological.valid || c.chronological.isFuture) return { name: firstName, ageMonths: null, ageDays: null, corrected: false, lang: s.lang };
  return { name: firstName, ageMonths: c.chronological.months, ageDays: c.chronological.days, corrected: c.corrected, lang: s.lang };
}

/** The freshest snapshot with a birth date among a recipient's endpoints (what "this week's note" is written from). */
export function freshestProfile(e: Endpoints): Snapshot | null {
  const snaps = [...e.web.map((w) => ({ s: w as Snapshot, at: w.updated_at })), ...e.ios.map((d) => ({ s: d as Snapshot, at: d.last_seen_at }))].filter((x) => x.s.birth_date);
  if (!snaps.length) return null;
  return snaps.reduce((a, b) => (b.at > a.at ? b : a)).s;
}

// ---------- delivery ----------

export type DeliverResult = { status: string; devices: number; sent: number; dropped: number; error: string | null; duplicate?: boolean; results: unknown[] };

export async function apnsConfig(store: AdminStore, env: (k: string) => string | undefined): Promise<ApnsConfig | null> {
  const keyId = env("APNS_KEY_ID") ?? "", teamId = env("APNS_TEAM_ID") ?? "", p8 = env("APNS_PRIVATE_KEY") ?? "";
  if (!keyId || !teamId || !p8) return null;
  return { keyId: keyId.trim(), teamId: teamId.trim(), p8, bundleId: env("APNS_BUNDLE_ID") || "co.minjae.sprout" };
}

async function providerToken(store: AdminStore, cfg: ApnsConfig, nowS: number): Promise<string> {
  const cached = await store.cachedJwt().catch(() => null);
  if (jwtReusable(cached, cfg.keyId, nowS)) return cached!.jwt;
  const jwt = mintApnsJwt(cfg, nowS);
  await store.saveJwt({ jwt, iat: nowS, key_id: cfg.keyId }).catch(() => {});
  return jwt;
}

/**
 * Send one recipient's notes (each endpoint may get its own words: weekly notes differ per profile) and log it.
 * Dead web subscriptions (404/410) and dead APNs tokens are deleted; a token that answered on the other host is re-filed.
 */
export async function deliver(
  deps: Deps, ctx: { apns: ApnsConfig | null; transport: Transport | null },
  recipient: string, userId: string | null, e: Endpoints, noteFor: (s: Snapshot) => Note | null,
  log: { kind: string; title: string | null; body: string | null; link: string | null; dedupeKey: string | null; actorId: string },
): Promise<DeliverResult> {
  const { store } = deps;
  const web = e.web.map((w) => ({ w, n: noteFor(w) })).filter((x): x is { w: WebSub; n: Note } => !!x.n);
  const ios = ctx.apns ? e.ios.map((d) => ({ d, n: noteFor(d) })).filter((x): x is { d: IosDevice; n: Note } => !!x.n) : [];
  const devices = web.length + ios.length;
  const logId = await store.claim({ recipient, user_id: userId, kind: log.kind, title: log.title, body: log.body, link: log.link, status: devices ? "sending" : "no_devices", devices, dedupe_key: log.dedupeKey, actor_id: log.actorId });
  if (logId === null) return { status: "duplicate", devices, sent: 0, dropped: 0, error: null, duplicate: true, results: [] };
  if (!devices) return { status: "no_devices", devices: 0, sent: 0, dropped: 0, error: null, results: [] };
  const results: ({ channel: "web"; id: number; status: number; ok: boolean; dead: boolean; error?: string } | ({ channel: "ios"; id: number } & IosResult))[] = [];
  const deadWeb: string[] = [];
  for (const { w, n } of web) {
    const r = await deps.webPush(w, JSON.stringify(n));
    const ok = r.status >= 200 && r.status < 300;
    const dead = r.status === 404 || r.status === 410;
    if (dead) deadWeb.push(w.endpoint);
    results.push({ channel: "web", id: w.id, status: r.status, ok, dead, ...(r.error ? { error: r.error.slice(0, 120) } : {}) });
  }
  const deadIos: string[] = [];
  if (ios.length && ctx.transport) {
    const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
    let jwt: string | null = null;
    try {
      jwt = await providerToken(store, ctx.apns!, Math.floor((deps.now?.() ?? Date.now()) / 1000));
    } catch (err) {
      for (const { d } of ios) results.push({ channel: "ios", id: d.id, tail: d.token.slice(-6), environment: asEnv(d.environment), status: 0, apnsId: null, reason: err instanceof Error ? err.message.slice(0, 80) : "jwt", ok: false, dead: false });
    }
    if (jwt) {
      const headers = apnsHeaders(jwt, ctx.apns!.bundleId);
      for (const { d, n } of ios) {
        const r = await sendOne(ctx.transport, d.token, asEnv(d.environment), headers, JSON.stringify(apnsPayload(n, log.kind)), sleep);
        if (r.dead) deadIos.push(d.token);
        if (r.envFixed) await store.setIosEnv(d.token, r.envFixed).catch(() => {});
        results.push({ channel: "ios", id: d.id, ...r });
      }
      // a rejected provider token (key revoked or rotated): forget it so the next call mints a fresh one
      if (results.some((r) => r.channel === "ios" && (r.reason === "InvalidProviderToken" || r.reason === "ExpiredProviderToken"))) await store.saveJwt(null).catch(() => {});
    }
  }
  if (deadWeb.length) await store.dropWeb(deadWeb).catch(() => {});
  if (deadIos.length) await store.dropIos(deadIos).catch(() => {});
  const sent = results.filter((r) => r.ok).length;
  const status = sent === devices ? "sent" : sent > 0 ? "partial" : "failed";
  const bad = results.find((r) => !r.ok);
  const error = bad ? (bad.channel === "web" ? `web ${bad.status}${bad.error ? ` ${bad.error}` : ""}` : `ios ${bad.status} ${bad.reason ?? ""}`.trim()) : null;
  await store.finish(logId, { status, sent, dropped: deadWeb.length + deadIos.length, error, results });
  return { status, devices, sent, dropped: deadWeb.length + deadIos.length, error, results };
}

// ---------- the handler ----------

const ACTIONS = ["whoami", "overview", "recipients", "recipient", "history", "preview", "test", "send", "broadcast", "weekly_preview", "weekly_send"] as const;
type Action = (typeof ACTIONS)[number];
const SENDS = ["test", "send", "weekly_send"];
const KEY_RE = /^(user:[0-9a-f-]{36}|web:\d{1,12}|ios:\d{1,12})$/i;
const IDEM_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function handleAdmin(deps: Deps, jwt: string, input: Record<string, unknown>): Promise<Res> {
  const action = String(input.action ?? "") as Action;
  const dry = input.dry_run === true;
  const actor = await deps.verify(jwt).catch(() => null);
  const target = typeof input.recipient === "string" ? input.recipient.slice(0, 60) : null;
  // the audit keeps what the admin typed (their own words), never a profile's name or birth date
  const audit = (ok: boolean, result: unknown, tgt: string | null = target) =>
    deps.store.audit({
      actor_id: actor?.id ?? null, actor_email: actor?.email ?? null, action: (ACTIONS.includes(action) ? action : "unknown") + (dry ? ":dry" : ""), target: tgt,
      payload: { title: input.title ?? null, body: input.body ?? null, link: input.link ?? null, confirm_count: input.confirm_count ?? null, idempotency_key: input.idempotency_key ?? null },
      result, ok,
    }).catch(() => {});
  if (!actor) {
    await audit(false, { error: "unauthenticated" });
    return res(401, { ok: false, error: "Sign in again." });
  }
  const allow = adminEmails(deps.env("ADMIN_EMAILS") || (await deps.store.secret("admin_emails").catch(() => "")));
  if (!actor.confirmed || !allow.includes(actor.email.toLowerCase())) {
    await audit(false, { error: "forbidden" });
    return res(403, { ok: false, error: "This account is not a Sprout admin." });
  }
  if (!ACTIONS.includes(action)) {
    await audit(false, { error: "unknown action" });
    return res(400, { ok: false, error: "Unknown action." });
  }
  if (action === "whoami") return res(200, { ok: true, admin: true, email: actor.email });

  const now = deps.now?.() ?? Date.now();
  if (action === "history") {
    const n = Math.min(Math.max(Number(input.limit) || 50, 1), 200);
    return res(200, { ok: true, history: await deps.store.history(n) });
  }

  const [subs, devs, accounts] = await Promise.all([deps.store.webSubs(), deps.store.iosDevices(), deps.store.accounts()]);
  const { list, endpoints } = groupRecipients(subs, devs, accounts);
  const apnsCfg = await apnsConfig(deps.store, deps.env);

  if (action === "overview") {
    const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
    await audit(true, null, null);
    return res(200, {
      ok: true,
      accounts: accounts.length,
      accountsNew7d: accounts.filter((a) => a.created_at >= weekAgo).length,
      guestsWithPush: list.filter((r) => r.kind === "guest").length,
      accountsWithPush: list.filter((r) => r.kind === "account").length,
      webSubscriptions: subs.length,
      iosDevices: devs.length,
      iosSandbox: devs.filter((d) => asEnv(d.environment) === "sandbox").length,
      reachable: list.length,
      apnsConfigured: !!apnsCfg,
    });
  }
  if (action === "recipients") return res(200, { ok: true, recipients: list, count: list.length });

  const pick = () => {
    if (!target || !KEY_RE.test(target)) return null;
    const e = endpoints.get(target);
    return e ? { key: target, userId: target.startsWith("user:") ? target.slice(5) : null, e } : null;
  };

  if (action === "recipient") {
    const p = pick();
    if (!p) return res(404, { ok: false, error: "No such recipient." });
    const at = new Date(now);
    const row = list.find((r) => r.key === p.key)!;
    const profiles = [...p.e.web.map((w) => ({ channel: "web", id: w.id, host: safeHost(w.endpoint), seen: w.updated_at, ...profileSummary(w, at) })), ...p.e.ios.map((d) => ({ channel: "ios", id: d.id, environment: asEnv(d.environment), seen: d.last_seen_at, ...profileSummary(d, at) }))];
    await audit(true, { viewed: p.key });
    return res(200, { ok: true, recipient: row, endpoints: profiles });
  }

  if (action === "weekly_preview") {
    const p = pick();
    if (!p) return res(404, { ok: false, error: "No such recipient." });
    const snap = freshestProfile(p.e);
    const note = snap ? weeklyMessage(snap, new Date(now)) : null;
    await audit(true, { month: note?.month ?? null });
    if (!note) return res(200, { ok: true, note: null, reason: "This profile has no birth date, so there is no weekly note." });
    return res(200, { ok: true, note });
  }

  // everything below writes to someone's phone (or pretends to, when dry)
  let draft: Note | null = null;
  if (action !== "weekly_send") {
    const v = validateDraft(input);
    if (!v.ok) {
      await audit(false, { errors: v.errors });
      return res(400, { ok: false, error: "Fix the highlighted fields.", errors: v.errors });
    }
    draft = v.note;
  }
  if (action === "preview") return res(200, { ok: true, note: draft, web: draft, ios: apnsPayload(draft!, "admin_preview") });

  const idem = typeof input.idempotency_key === "string" && IDEM_RE.test(input.idempotency_key) ? input.idempotency_key : null;
  if (!dry && !idem) {
    await audit(false, { error: "idempotency_key required" });
    return res(400, { ok: false, error: "Missing idempotency key. Reload the page." });
  }
  const iosCount = (e: Endpoints) => (apnsCfg ? e.ios.length : 0);

  if (action === "test" || action === "send" || action === "weekly_send") {
    let key: string, userId: string | null, e: Endpoints;
    if (action === "test") {
      key = `user:${actor.id}`;
      userId = actor.id;
      e = endpoints.get(key) ?? { web: [], ios: [] };
    } else {
      const p = pick();
      if (!p) {
        await audit(false, { error: "no such recipient" });
        return res(404, { ok: false, error: "Pick a recipient." });
      }
      ({ key, userId, e } = p);
    }
    const weekly = action === "weekly_send";
    const at = new Date(now);
    const noteFor = weekly ? (s: Snapshot) => { const n = weeklyMessage(s, at); return n ? { title: n.title, body: n.body, url: n.url } : null; } : () => draft;
    const reach = e.web.filter((w) => !!noteFor(w)).length + (apnsCfg ? e.ios.filter((d) => !!noteFor(d)).length : 0);
    if (dry) {
      const r = { ok: true, dry_run: true, devices: reach, web: e.web.length, ios: iosCount(e), iosSkipped: apnsCfg ? 0 : e.ios.length };
      await audit(true, r, key);
      return res(200, r);
    }
    const used = await deps.store.recentCount(actor.id, SENDS, new Date(now - 3600_000).toISOString());
    if (used >= SINGLE_PER_HOUR) {
      await audit(false, { error: "rate limited", used }, key);
      return res(429, { ok: false, error: `Limit reached: ${SINGLE_PER_HOUR} sends an hour.` });
    }
    if (!reach) {
      await audit(false, { error: "no devices" }, key);
      const why = action === "test" ? "No device is linked to your account. Sign in to Sprout on your phone and turn notifications on." : weekly ? "No device of theirs has a birth date to write a weekly note from." : "That recipient has no device with notifications on.";
      return res(409, { ok: false, error: why });
    }
    const transport = apnsCfg && e.ios.length ? deps.apns() : null;
    try {
      const month = weekly ? (freshestProfile(e) ? weeklyMessage(freshestProfile(e)!, at)?.month ?? null : null) : null;
      const r = await deliver(deps, { apns: apnsCfg, transport }, key, userId, e, noteFor, {
        kind: action === "test" ? "admin_test" : weekly ? "admin_weekly" : "admin_single",
        title: weekly ? `Weekly note${month ? ` (month ${month})` : ""}` : draft!.title,
        body: weekly ? null : draft!.body,
        link: weekly ? null : draft!.url,
        dedupeKey: `${idem}:${key}`,
        actorId: actor.id,
      });
      if (r.duplicate) {
        await audit(false, { error: "duplicate" }, key);
        return res(409, { ok: false, error: "Already sent (same request). Check History.", duplicate: true });
      }
      const ok = r.sent > 0;
      await audit(ok, { status: r.status, devices: r.devices, sent: r.sent, dropped: r.dropped, error: r.error }, key);
      return res(ok ? 200 : 502, { ok, status: r.status, devices: r.devices, sent: r.sent, dropped: r.dropped, error: r.error });
    } finally {
      transport?.close();
    }
  }

  // broadcast: everyone with notifications on
  const reachable = list.filter((r) => { const e = endpoints.get(r.key)!; return e.web.length + iosCount(e) > 0; });
  if (Number(input.confirm_count) !== reachable.length) {
    const r = { error: "confirm_count mismatch", expected: reachable.length };
    await audit(false, r, "all");
    return res(409, { ok: false, error: `Type ${reachable.length} to confirm the recipient count.`, expected: reachable.length });
  }
  const deviceTotal = reachable.reduce((s, r) => { const e = endpoints.get(r.key)!; return s + e.web.length + iosCount(e); }, 0);
  if (dry) {
    const r = { ok: true, dry_run: true, recipients: reachable.length, devices: deviceTotal };
    await audit(true, r, "all");
    return res(200, r);
  }
  const recent = await deps.store.recentCount(actor.id, ["broadcast"], new Date(now - BROADCAST_EVERY_MS).toISOString());
  if (recent > 0) {
    await audit(false, { error: "rate limited" }, "all");
    return res(429, { ok: false, error: "One broadcast every 10 minutes." });
  }
  const transport = apnsCfg ? deps.apns() : null;
  let people = 0, sent = 0, dropped = 0, failed = 0, duplicates = 0;
  try {
    for (const r of reachable) {
      const e = endpoints.get(r.key)!;
      const out = await deliver(deps, { apns: apnsCfg, transport }, r.key, r.key.startsWith("user:") ? r.key.slice(5) : null, e, () => draft, {
        kind: "admin_broadcast", title: draft!.title, body: draft!.body, link: draft!.url, dedupeKey: `${idem}:${r.key}`, actorId: actor.id,
      }).catch(() => null);
      if (out?.duplicate) { duplicates++; continue; }
      people++;
      if (out && out.sent > 0) sent += out.sent; else failed++;
      dropped += out?.dropped ?? 0;
    }
  } finally {
    transport?.close();
  }
  const out = { ok: sent > 0 || reachable.length === 0 || duplicates === reachable.length, recipients: people, sent, dropped, failed, duplicates };
  await audit(out.ok, out, "all");
  return res(200, out);
}

function safeHost(endpoint: string): string {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return "unknown";
  }
}
