import { describe, expect, it, beforeEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  adminEmails, adminOrigins, BODY_MAX, groupRecipients, handleAdmin, originOk, SINGLE_PER_HOUR, TITLE_MAX, validateDraft,
  type Account, type Actor, type AdminStore, type AuditRow, type Deps, type IosDevice, type LogRow, type WebSub,
} from "./core";
import type { Answer, ApnsEnv, Transport } from "./apns";

const OWNER: Actor = { id: "11111111-1111-4111-8111-111111111111", email: "minjae.m.lee@gmail.com", confirmed: true };
const OTHER: Actor = { id: "22222222-2222-4222-8222-222222222222", email: "someone@example.com", confirmed: true };
const PARENT = "33333333-3333-4333-8333-333333333333";
const NOW = Date.parse("2026-09-30T15:00:00Z");
const p8 = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const web = (id: number, user: string | null, extra: Partial<WebSub> = {}): WebSub => ({
  id, endpoint: `https://fcm.googleapis.com/fcm/send/e${id}`, p256dh: "k", auth: "a", user_id: user, lang: "en", tz: "America/Chicago",
  name: "Rowoon Lee", birth_date: "2025-04-17", due_date: null, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-20T00:00:00Z", ...extra,
});
const ios = (id: number, user: string | null, extra: Partial<IosDevice> = {}): IosDevice => ({
  id, token: `${"ab".repeat(31)}${String(id).padStart(2, "0")}`, environment: "production", user_id: user, lang: "ko", tz: "Asia/Seoul",
  name: null, birth_date: null, due_date: null, /* the iOS app sends no baby details */ created_at: "2026-09-02T00:00:00Z", last_seen_at: "2026-09-25T00:00:00Z", ...extra,
});

class MemStore implements AdminStore {
  subs: WebSub[] = [];
  devs: IosDevice[] = [];
  users: Account[] = [
    { id: OWNER.id, email: OWNER.email, created_at: "2026-09-01T00:00:00Z", last_sign_in_at: null },
    { id: PARENT, email: "parent@example.com", created_at: "2026-09-28T00:00:00Z", last_sign_in_at: null },
  ];
  audits: AuditRow[] = [];
  logs: (LogRow & { id: number })[] = [];
  secrets: Record<string, string> = {};
  jwt: { jwt: string; iat: number; key_id: string } | null = null;
  async secret(n: string) { return this.secrets[n] ?? ""; }
  async accounts() { return this.users; }
  async webSubs() { return this.subs; }
  async iosDevices() { return this.devs; }
  async recentCount(actor: string, actions: string[], since: string) {
    return this.audits.filter((a) => a.actor_id === actor && a.ok && actions.includes(a.action) && (a as AuditRow & { at?: string }).at! >= since).length;
  }
  async audit(row: AuditRow) { this.audits.push({ ...row, at: new Date(NOW).toISOString() } as AuditRow); }
  async history(limit: number) { return this.logs.slice(-limit).reverse() as unknown as Record<string, unknown>[]; }
  async claim(row: LogRow) {
    if (row.dedupe_key && this.logs.some((l) => l.dedupe_key === row.dedupe_key)) return null;
    const id = this.logs.length + 1;
    this.logs.push({ ...row, id });
    return id;
  }
  async finish(id: number, patch: Partial<LogRow>) { Object.assign(this.logs.find((l) => l.id === id)!, patch); }
  async dropWeb(eps: string[]) { this.subs = this.subs.filter((s) => !eps.includes(s.endpoint)); }
  async dropIos(t: string[]) { this.devs = this.devs.filter((d) => !t.includes(d.token)); }
  async setIosEnv(token: string, environment: ApnsEnv) { this.devs.find((d) => d.token === token)!.environment = environment; }
  async cachedJwt() { return this.jwt; }
  async saveJwt(v: { jwt: string; iat: number; key_id: string } | null) { this.jwt = v; }
}

let store: MemStore;
let webSent: { endpoint: string; payload: string }[];
let apnsSent: { env: ApnsEnv; token: string; body: string; headers: Record<string, string> }[];
let webStatus: (endpoint: string) => number;
let apnsAnswer: (env: ApnsEnv, token: string) => Answer;
let envVars: Record<string, string>;
let closed: number;

function deps(actor: Actor | null = OWNER): Deps {
  return {
    store,
    env: (k) => envVars[k],
    verify: async (t) => (t === "good" ? actor : null),
    webPush: async (sub, payload) => {
      webSent.push({ endpoint: sub.endpoint, payload });
      return { status: webStatus(sub.endpoint) };
    },
    apns: (): Transport => ({
      post: async (env, token, headers, body) => {
        apnsSent.push({ env, token, body, headers });
        return apnsAnswer(env, token);
      },
      close: () => void closed++,
    }),
    now: () => NOW,
    sleep: async () => {},
  };
}
const call = (input: Record<string, unknown>, actor: Actor | null = OWNER, jwt = "good") => handleAdmin(deps(actor), jwt, input);
const draft = { title: "A note from Sprout", body: "New play ideas are in the book.", link: "/play-tips/17/" };
let n = 0;
const key = () => `idem${String(++n).padStart(8, "0")}`;

beforeEach(() => {
  store = new MemStore();
  webSent = [];
  apnsSent = [];
  webStatus = () => 201;
  apnsAnswer = () => ({ status: 200, apnsId: "id-1", reason: null });
  envVars = { APNS_KEY_ID: "6NC7T26GLR", APNS_TEAM_ID: "5RCPL9J3UX", APNS_PRIVATE_KEY: p8 };
  closed = 0;
});

describe("identity", () => {
  it("401 without a valid token, and audits it", async () => {
    const r = await call({ action: "whoami" }, OWNER, "bad");
    expect(r.status).toBe(401);
    expect(store.audits.at(-1)).toMatchObject({ ok: false, actor_id: null, result: { error: "unauthenticated" } });
  });
  it("403 for a signed-in account that is not on the allowlist", async () => {
    const r = await call({ action: "whoami" }, OTHER);
    expect(r.status).toBe(403);
    expect(store.audits.at(-1)).toMatchObject({ ok: false, actor_email: OTHER.email, result: { error: "forbidden" } });
  });
  it("403 when the owner's email is not confirmed", async () => {
    expect((await call({ action: "whoami" }, { ...OWNER, confirmed: false })).status).toBe(403);
  });
  it("the owner is the default admin", async () => {
    const r = await call({ action: "whoami" });
    expect(r).toEqual({ status: 200, body: { ok: true, admin: true, email: OWNER.email } });
  });
  it("the Vault secret overrides the allowlist without a redeploy, and the env var wins over it", async () => {
    store.secrets.admin_emails = "someone@example.com";
    expect((await call({ action: "whoami" }, OTHER)).status).toBe(200);
    expect((await call({ action: "whoami" }, OWNER)).status).toBe(403);
    envVars.ADMIN_EMAILS = "minjae.m.lee@gmail.com";
    expect((await call({ action: "whoami" }, OTHER)).status).toBe(403);
  });
  it("unknown actions are refused after the identity check", async () => {
    expect((await call({ action: "drop_tables" })).status).toBe(400);
    expect((await call({ action: "drop_tables" }, OTHER)).status).toBe(403);
  });
});

describe("origin and allowlist parsing", () => {
  it("defaults to the admin site and ignores junk", () => {
    expect(adminOrigins(undefined)).toEqual(["https://sprout-admin-minjae.vercel.app"]);
    expect(adminOrigins("https://a.example/, not a url, http://localhost:5199")).toEqual(["https://a.example", "http://localhost:5199"]);
  });
  it("refuses foreign browser origins (the consumer site included), allows non-browser calls", () => {
    const allowed = adminOrigins(undefined);
    expect(originOk("https://sprout-admin-minjae.vercel.app", allowed)).toBe(true);
    expect(originOk("https://baby.minjae.co", allowed)).toBe(false);
    expect(originOk("https://evil.example", allowed)).toBe(false);
    expect(originOk(null, allowed)).toBe(true);
  });
  it("email allowlist falls back to the owner", () => {
    expect(adminEmails("")).toEqual(["minjae.m.lee@gmail.com"]);
    expect(adminEmails("A@B.co, c@d.io")).toEqual(["a@b.co", "c@d.io"]);
  });
});

describe("validation", () => {
  it("requires a title and body within limits and an app route", () => {
    expect(validateDraft(draft)).toEqual({ ok: true, note: { title: draft.title, body: draft.body, url: "/play-tips/17/" } });
    const bad = validateDraft({ title: "x".repeat(TITLE_MAX + 1), body: "", link: "https://evil.example" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["body", "link", "title"]);
    expect(validateDraft({ ...draft, body: "y".repeat(BODY_MAX + 1) }).ok).toBe(false);
    expect(validateDraft({ ...draft, link: "/milestones/37/" }).ok).toBe(false);
    expect(validateDraft({ ...draft, link: "//evil.example/" }).ok).toBe(false);
    expect(validateDraft({ ...draft, link: null }).ok).toBe(true);
  });
  it("counts characters, not UTF-16 units, and strips control and bidi characters", () => {
    const v = validateDraft({ title: "로운‮이\u0000야", body: "😀".repeat(BODY_MAX), link: "/" });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.note.title).toBe("로운 이 야");
  });
  it("an invalid send is a 400 with field errors and is audited", async () => {
    const r = await call({ action: "test", title: "", body: "x", idempotency_key: key() });
    expect(r.status).toBe(400);
    expect(r.body.errors).toHaveProperty("title");
    expect(store.audits.at(-1)).toMatchObject({ action: "test", ok: false });
  });
  it("a real send needs an idempotency key; a dry run does not", async () => {
    store.subs = [web(1, OWNER.id)];
    expect((await call({ action: "test", ...draft })).status).toBe(400);
    expect((await call({ action: "test", ...draft, dry_run: true })).status).toBe(200);
    expect(webSent).toHaveLength(0);
  });
});

describe("recipients and privacy", () => {
  it("groups by account, keeps each guest endpoint separate, and lists no baby details", async () => {
    store.subs = [web(1, PARENT), web(2, null), web(3, OWNER.id)];
    store.devs = [ios(1, PARENT, { environment: "sandbox" }), ios(2, null)];
    const r = await call({ action: "recipients" });
    const list = r.body.recipients as Record<string, unknown>[];
    expect(list.map((x) => x.key).sort()).toEqual([`user:${OWNER.id}`, `user:${PARENT}`, "ios:2", "web:2"].sort());
    expect(list.find((x) => x.key === `user:${PARENT}`)).toMatchObject({ kind: "account", email: "parent@example.com", web: 1, ios: 1, environments: ["sandbox"] });
    const text = JSON.stringify(r.body);
    expect(text).not.toMatch(/Rowoon|로운|2025-04-17/);
    expect(text).not.toContain("fcm.googleapis.com");
  });
  it("overview counts accounts, new accounts, guests and opt-ins without child details", async () => {
    store.subs = [web(1, PARENT), web(2, null)];
    store.devs = [ios(1, null, { environment: "sandbox" })];
    const r = await call({ action: "overview" });
    expect(r.body).toMatchObject({ accounts: 2, accountsNew7d: 1, guestsWithPush: 2, accountsWithPush: 1, webSubscriptions: 2, iosDevices: 1, iosSandbox: 1, apnsConfigured: true });
    expect(JSON.stringify(r.body)).not.toMatch(/Rowoon|로운|2025-04-17/);
  });
  it("the detail view shows first name and age for one recipient", async () => {
    store.subs = [web(1, PARENT)];
    const r = await call({ action: "recipient", recipient: `user:${PARENT}` });
    const e = (r.body.endpoints as Record<string, unknown>[])[0];
    expect(e).toMatchObject({ channel: "web", host: "fcm.googleapis.com", name: "Rowoon", ageMonths: 17 });
    expect(JSON.stringify(r.body)).not.toContain("2025-04-17");
    expect(JSON.stringify(store.audits)).not.toMatch(/Rowoon|로운/);
  });
  it("unknown recipients are 404", async () => {
    expect((await call({ action: "recipient", recipient: "web:99" })).status).toBe(404);
    expect((await call({ action: "recipient", recipient: "'; drop" })).status).toBe(404);
  });
  it("groupRecipients sorts accounts first, then guests by last seen", () => {
    const { list } = groupRecipients([web(1, null, { updated_at: "2026-09-01T00:00:00Z" }), web(2, null, { updated_at: "2026-09-29T00:00:00Z" }), web(3, PARENT)], [], store.users);
    expect(list.map((r) => r.key)).toEqual([`user:${PARENT}`, "web:2", "web:1"]);
  });
});

describe("sending", () => {
  it("test goes to the admin's own devices on both channels and is logged", async () => {
    store.subs = [web(1, OWNER.id), web(2, PARENT)];
    store.devs = [ios(1, OWNER.id)];
    const r = await call({ action: "test", ...draft, idempotency_key: key() });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, status: "sent", devices: 2, sent: 2 });
    expect(webSent.map((w) => w.endpoint)).toEqual([store.subs[0].endpoint]);
    expect(JSON.parse(webSent[0].payload)).toEqual({ title: draft.title, body: draft.body, url: "/play-tips/17/" });
    expect(apnsSent).toHaveLength(1);
    expect(apnsSent[0].env).toBe("production");
    expect(apnsSent[0].headers).toMatchObject({ "apns-topic": "co.minjae.sprout", "apns-push-type": "alert" });
    expect(JSON.parse(apnsSent[0].body)).toMatchObject({ aps: { alert: { title: draft.title, body: draft.body } }, url: "/play-tips/17/" });
    expect(store.logs[0]).toMatchObject({ kind: "admin_test", recipient: `user:${OWNER.id}`, status: "sent", sent: 2, actor_id: OWNER.id });
    expect(closed).toBe(1);
    expect(store.jwt?.key_id).toBe("6NC7T26GLR");
  });
  it("test with no linked device is a 409 with a hint", async () => {
    const r = await call({ action: "test", ...draft, idempotency_key: key() });
    expect(r.status).toBe(409);
    expect(String(r.body.error)).toMatch(/Sign in to Sprout on your phone/);
  });
  it("send reaches a guest subscription by key", async () => {
    store.subs = [web(7, null)];
    const r = await call({ action: "send", recipient: "web:7", ...draft, idempotency_key: key() });
    expect(r.body).toMatchObject({ ok: true, sent: 1 });
    expect(store.logs[0]).toMatchObject({ kind: "admin_single", recipient: "web:7", user_id: null });
  });
  it("the same idempotency key never sends twice", async () => {
    store.subs = [web(1, OWNER.id)];
    const k = key();
    expect((await call({ action: "test", ...draft, idempotency_key: k })).status).toBe(200);
    const again = await call({ action: "test", ...draft, idempotency_key: k });
    expect(again.status).toBe(409);
    expect(again.body.duplicate).toBe(true);
    expect(webSent).toHaveLength(1);
  });
  it("a gone web subscription (410) is removed; a dead APNs token is removed", async () => {
    store.subs = [web(1, PARENT)];
    store.devs = [ios(1, PARENT)];
    webStatus = () => 410;
    apnsAnswer = () => ({ status: 410, apnsId: null, reason: "Unregistered" });
    const r = await call({ action: "send", recipient: `user:${PARENT}`, ...draft, idempotency_key: key() });
    expect(r.status).toBe(502);
    expect(r.body).toMatchObject({ ok: false, status: "failed", dropped: 2 });
    expect(store.subs).toHaveLength(0);
    expect(store.devs).toHaveLength(0);
  });
  it("a token filed under the wrong APNs host is retried there and re-filed", async () => {
    store.devs = [ios(1, PARENT, { environment: "production" })];
    apnsAnswer = (env) => (env === "production" ? { status: 400, apnsId: null, reason: "BadDeviceToken" } : { status: 200, apnsId: "x", reason: null });
    const r = await call({ action: "send", recipient: `user:${PARENT}`, ...draft, idempotency_key: key() });
    expect(r.body).toMatchObject({ ok: true, sent: 1, dropped: 0 });
    expect(store.devs[0].environment).toBe("sandbox");
  });
  it("without APNs credentials iOS devices are skipped, web still sends", async () => {
    envVars = {};
    store.subs = [web(1, PARENT)];
    store.devs = [ios(1, PARENT)];
    const dry = await call({ action: "send", recipient: `user:${PARENT}`, ...draft, dry_run: true });
    expect(dry.body).toMatchObject({ devices: 1, iosSkipped: 1 });
    const r = await call({ action: "send", recipient: `user:${PARENT}`, ...draft, idempotency_key: key() });
    expect(r.body).toMatchObject({ ok: true, sent: 1, devices: 1 });
    expect(apnsSent).toHaveLength(0);
  });
  it("rate limit: 50 sends an hour per admin", async () => {
    store.subs = [web(1, OWNER.id)];
    for (let i = 0; i < SINGLE_PER_HOUR; i++) store.audits.push({ actor_id: OWNER.id, actor_email: OWNER.email, action: "test", ok: true, at: new Date(NOW - 60_000).toISOString() } as AuditRow);
    const r = await call({ action: "test", ...draft, idempotency_key: key() });
    expect(r.status).toBe(429);
    expect(webSent).toHaveLength(0);
    // dry runs are free
    expect((await call({ action: "test", ...draft, dry_run: true })).status).toBe(200);
  });
  it("the provider token is reused inside 40 minutes", async () => {
    store.devs = [ios(1, OWNER.id)];
    store.jwt = { jwt: "cached.jwt.value", iat: Math.floor(NOW / 1000) - 600, key_id: "6NC7T26GLR" };
    await call({ action: "test", ...draft, idempotency_key: key() });
    expect(apnsSent[0].headers.authorization).toBe("bearer cached.jwt.value");
  });
});

describe("broadcast", () => {
  beforeEach(() => {
    store.subs = [web(1, PARENT), web(2, null), web(3, OWNER.id)];
    store.devs = [ios(1, null)];
  });
  it("needs the exact recipient count", async () => {
    const r = await call({ action: "broadcast", ...draft, confirm_count: 3, idempotency_key: key() });
    expect(r.status).toBe(409);
    expect(r.body.expected).toBe(4);
    expect(webSent).toHaveLength(0);
    expect(store.audits.at(-1)).toMatchObject({ action: "broadcast", ok: false, target: "all" });
  });
  it("dry run reports reach and sends nothing", async () => {
    const r = await call({ action: "broadcast", ...draft, confirm_count: 4, dry_run: true });
    expect(r.body).toMatchObject({ ok: true, dry_run: true, recipients: 4, devices: 4 });
    expect(webSent.length + apnsSent.length).toBe(0);
  });
  it("sends once to everyone, then is limited to one every 10 minutes", async () => {
    const r = await call({ action: "broadcast", ...draft, confirm_count: 4, idempotency_key: key() });
    expect(r.body).toMatchObject({ ok: true, recipients: 4, sent: 4, failed: 0 });
    expect(webSent).toHaveLength(3);
    expect(apnsSent).toHaveLength(1);
    expect(store.logs.every((l) => l.kind === "admin_broadcast")).toBe(true);
    const again = await call({ action: "broadcast", ...draft, confirm_count: 4, idempotency_key: key() });
    expect(again.status).toBe(429);
  });
});

describe("weekly note", () => {
  it("previews the note for a profile (name and month) from its freshest snapshot", async () => {
    store.subs = [web(1, PARENT, { updated_at: "2026-09-01T00:00:00Z", name: "Old", lang: "en" }), web(2, PARENT, { updated_at: "2026-09-29T00:00:00Z", name: "로운", lang: "ko" })];
    store.devs = [ios(1, PARENT, { last_seen_at: "2026-09-30T00:00:00Z" })];
    const r = await call({ action: "weekly_preview", recipient: `user:${PARENT}` });
    expect(r.body.note).toMatchObject({ title: "로운, 17개월", month: 17 });
    expect(String((r.body.note as { url: string }).url)).toMatch(/^\/(play-tips|watch-outs|milestones)\/17\/$/);
  });
  it("a profile without a birth date has no note", async () => {
    store.subs = [web(1, null, { birth_date: null })];
    const r = await call({ action: "weekly_preview", recipient: "web:1" });
    expect(r.body).toMatchObject({ ok: true, note: null });
    const s = await call({ action: "weekly_send", recipient: "web:1", idempotency_key: key() });
    expect(s.status).toBe(409);
  });
  it("send now writes each subscription its own note, skips iOS (no baby details there) and logs no baby name", async () => {
    store.subs = [web(1, PARENT, { lang: "en", name: "Rowoon" }), web(2, PARENT, { lang: "ko", name: "로운" })];
    store.devs = [ios(1, PARENT)];
    const r = await call({ action: "weekly_send", recipient: `user:${PARENT}`, idempotency_key: key() });
    expect(r.body).toMatchObject({ ok: true, sent: 2, devices: 2 });
    expect(JSON.parse(webSent[0].payload).title).toBe("Rowoon, month 17");
    expect(JSON.parse(webSent[1].payload).title).toBe("로운, 17개월");
    expect(apnsSent).toHaveLength(0);
    expect(store.logs[0]).toMatchObject({ kind: "admin_weekly", title: "Weekly note (month 17)", body: null });
    expect(JSON.stringify(store.logs.map(({ results: _r, ...l }) => l))).not.toMatch(/Rowoon|로운/);
    expect(JSON.stringify(store.audits)).not.toMatch(/Rowoon|로운|2025-04-17/);
  });
});

describe("history", () => {
  it("is admin-only and capped", async () => {
    expect((await call({ action: "history" }, OTHER)).status).toBe(403);
    const r = await call({ action: "history", limit: 10_000 });
    expect(r.status).toBe(200);
  });
});
