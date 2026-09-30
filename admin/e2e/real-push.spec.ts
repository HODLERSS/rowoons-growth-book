import { test, expect, chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { ANON, createUser, env, setAllowlist, svc, URL_ } from "./helpers";

// A REAL web push through the deployed admin API: a disposable user subscribes a real Chromium profile on the live
// app (FCM), is allowlisted for the run, and sends "test to me" plus this week's note to that subscription; the
// service worker must show both. Opt-in (REAL_PUSH=1): it touches production data, then cleans it up.
test.skip(process.env.REAL_PUSH !== "1", "set REAL_PUSH=1 to send a real web push");

test("admin test send and weekly note arrive at a real web push subscription", async ({}, info) => {
  test.skip(info.project.name !== "desktop", "one browser is enough");
  test.setTimeout(120_000);
  const admin = process.env.ADMIN_BASE_URL ?? "https://sprout-admin-minjae.vercel.app";
  const app = "https://baby.minjae.co";
  const u = await createUser("admin-e2e-push");
  await setAllowlist(`minjae.m.lee@gmail.com,${u.email}`);
  const ctx = await chromium.launchPersistentContext("", { headless: true, channel: "chromium", permissions: ["notifications"] });
  let endpoint = "";
  try {
    const page = await ctx.newPage();
    await page.goto(`${app}/settings/`);
    const vapid = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    endpoint = await page.evaluate(async ({ k, userId }) => {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const pad = "=".repeat((4 - (k.length % 4)) % 4);
      const key = Uint8Array.from(atob((k + pad).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const json = sub.toJSON();
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...json, lang: "en", tz: "America/Chicago", name: "Tester", birthDate: "2025-04-17", userId }) });
      if (!r.ok) throw new Error(`subscribe ${r.status}`);
      return sub.endpoint;
    }, { k: vapid, userId: u.id });
    expect(endpoint).toMatch(/^https:\/\//);

    // sign the disposable admin in with its password, then call the deployed API as the admin page would
    const client = createClient(URL_, ANON, { auth: { persistSession: false } });
    const { data } = await client.auth.signInWithPassword({ email: u.email, password: u.password });
    const token = data.session!.access_token;
    const post = async (body: Record<string, unknown>) => {
      const r = await fetch(`${admin}/api/admin`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Origin: admin }, body: JSON.stringify(body) });
      return { status: r.status, body: (await r.json()) as Record<string, unknown> };
    };
    const stamp = Date.now().toString(36);
    const title = `Admin E2E ${stamp}`;
    const sent = await post({ action: "test", title, body: "Real web push from the admin E2E.", link: "/memo/", idempotency_key: `e2e${stamp}test` });
    expect(sent.status, JSON.stringify(sent.body)).toBe(200);
    expect(sent.body).toMatchObject({ ok: true, sent: 1, devices: 1 });
    const shown = async (want: string) => page.evaluate(async (w) => {
      const reg = await navigator.serviceWorker.ready;
      return (await reg.getNotifications()).map((n) => n.title).filter((t) => t.includes(w));
    }, want);
    await expect.poll(() => shown(title), { timeout: 45_000, intervals: [1000] }).toHaveLength(1);

    const weekly = await post({ action: "weekly_send", recipient: `user:${u.id}`, idempotency_key: `e2e${stamp}week` });
    expect(weekly.status, JSON.stringify(weekly.body)).toBe(200);
    await expect.poll(() => shown("Tester, month"), { timeout: 45_000, intervals: [1000] }).toHaveLength(1);
    await page.screenshot({ path: "test-results/real-push-page.png" });
    console.log("delivered:", await shown("Admin E2E"), await shown("Tester, month"));
  } finally {
    await ctx.close();
    if (endpoint) await svc().from("push_subscriptions").delete().eq("endpoint", endpoint);
    await setAllowlist(null);
    await svc().from("admin_audit").delete().eq("actor_id", u.id);
    await svc().auth.admin.deleteUser(u.id);
  }
});
