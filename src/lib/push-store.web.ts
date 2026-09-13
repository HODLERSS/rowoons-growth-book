import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Web push subscribers, one row each in `push_subscriptions` (Supabase, service role only; no client policies).
 * Guests may subscribe (user_id null). The profile snapshot columns let the weekly job pick month-appropriate
 * content; the client refreshes them every time it loads, so they track the profile without a sign-in.
 */
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface SubscriberRow extends PushSubscriptionJSON {
  user_id: string | null;
  lang: "en" | "ko";
  tz: string;
  name: string | null;
  birth_date: string | null;
  due_date: string | null;
  weekly_enabled: boolean;
  last_weekly_at: string | null;
}

export interface SubscribeInput extends PushSubscriptionJSON {
  lang?: unknown;
  tz?: unknown;
  name?: unknown;
  birthDate?: unknown;
  dueDate?: unknown;
  userId?: unknown;
}

let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are not set");
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function isSubscription(v: unknown): v is SubscribeInput {
  if (!v || typeof v !== "object") return false;
  const o = v as PushSubscriptionJSON;
  return typeof o.endpoint === "string" && /^https:\/\//.test(o.endpoint) && !!o.keys && typeof o.keys.p256dh === "string" && typeof o.keys.auth === "string";
}

export async function addSubscription(input: SubscribeInput): Promise<void> {
  const lang = input.lang === "ko" ? "ko" : "en";
  let tz = str(input.tz, 64) ?? "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const birth = str(input.birthDate, 10);
  const due = str(input.dueDate, 10);
  const row = {
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    lang,
    tz,
    name: str(input.name, 80),
    birth_date: birth && DATE.test(birth) ? birth : null,
    due_date: due && DATE.test(due) ? due : null,
    user_id: typeof input.userId === "string" && /^[0-9a-f-]{36}$/i.test(input.userId) ? input.userId : null,
  };
  const { error } = await adminClient().from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) throw new Error(error.message);
}

export async function removeSubscription(endpoint: string): Promise<boolean> {
  const { data, error } = await adminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).select("endpoint");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function readSubscriptions(): Promise<SubscriberRow[]> {
  const { data, error } = await adminClient().from("push_subscriptions").select("endpoint, p256dh, auth, user_id, lang, tz, name, birth_date, due_date, weekly_enabled, last_weekly_at").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth }, user_id: r.user_id, lang: r.lang, tz: r.tz, name: r.name, birth_date: r.birth_date, due_date: r.due_date, weekly_enabled: r.weekly_enabled, last_weekly_at: r.last_weekly_at }));
}

export async function markWeeklySent(endpoints: string[], at: Date): Promise<void> {
  if (!endpoints.length) return;
  await adminClient().from("push_subscriptions").update({ last_weekly_at: at.toISOString() }).in("endpoint", endpoints);
}
