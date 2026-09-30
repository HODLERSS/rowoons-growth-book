// The Supabase side of the admin API (service role). Kept thin: every rule is in core.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, Actor, AdminStore, IosDevice, WebSub } from "./core";

const SNAP = "lang, tz, name, birth_date, due_date";

export function supabaseStore(db: SupabaseClient): AdminStore {
  const must = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return r.data as T;
  };
  return {
    async secret(name) {
      const { data } = await db.rpc("admin_secret", { secret_name: name });
      return (data as string | null) ?? "";
    },
    async accounts() {
      const out: Account[] = [];
      for (let page = 1; page <= 50; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(`accounts: ${error.message}`);
        for (const u of data.users) out.push({ id: u.id, email: u.email ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null });
        if (data.users.length < 1000) break;
      }
      return out;
    },
    async webSubs() {
      return must(await db.from("push_subscriptions").select(`id, endpoint, p256dh, auth, user_id, created_at, updated_at, ${SNAP}`).order("created_at"), "push_subscriptions") as WebSub[];
    },
    async iosDevices() {
      // iOS devices carry no baby details (the app keeps its reminders on the phone): no weekly note for them here
      const rows = must(await db.from("push_devices").select("id, token, environment, user_id, lang, tz, created_at, last_seen_at").order("created_at"), "push_devices") as Omit<IosDevice, "name" | "birth_date" | "due_date">[];
      return rows.map((r) => ({ ...r, name: null, birth_date: null, due_date: null }));
    },
    async recentCount(actorId, actions, sinceIso) {
      const { count } = await db.from("admin_audit").select("id", { count: "exact", head: true }).eq("actor_id", actorId).eq("ok", true).in("action", actions).gte("created_at", sinceIso);
      return count ?? 0;
    },
    async audit(row) {
      await db.from("admin_audit").insert(row);
    },
    async history(limit) {
      const rows = must(await db.from("push_log").select("id, created_at, recipient, user_id, kind, title, body, link, status, devices, sent, dropped, error, actor_id").order("created_at", { ascending: false }).limit(limit), "push_log") as Record<string, unknown>[];
      const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean) as string[])];
      const emails = new Map<string, string | null>();
      await Promise.all(ids.map(async (id) => {
        const { data } = await db.auth.admin.getUserById(id);
        emails.set(id, data?.user?.email ?? null);
      }));
      return rows.map(({ user_id, ...r }) => ({ ...r, email: user_id ? (emails.get(user_id as string) ?? null) : null }));
    },
    async claim(row) {
      const { data, error } = await db.from("push_log").insert(row).select("id").single();
      if (!error) return data.id as number;
      if (row.dedupe_key && (error.code === "23505" || /duplicate key/i.test(error.message ?? ""))) return null;
      throw new Error(`push_log: ${error.message}`);
    },
    async finish(id, patch) {
      await db.from("push_log").update(patch).eq("id", id);
    },
    async dropWeb(endpoints) {
      if (endpoints.length) await db.from("push_subscriptions").delete().in("endpoint", endpoints);
    },
    async dropIos(tokens) {
      if (tokens.length) await db.from("push_devices").delete().in("token", tokens);
    },
    async setIosEnv(token, environment) {
      await db.from("push_devices").update({ environment }).eq("token", token);
    },
    async cachedJwt() {
      const { data } = await db.from("apns_provider_token").select("jwt, iat, key_id").eq("id", 1).maybeSingle();
      return data ? { jwt: String(data.jwt), iat: Number(data.iat), key_id: String(data.key_id) } : null;
    },
    async saveJwt(v) {
      if (!v) {
        await db.from("apns_provider_token").delete().eq("id", 1);
        return;
      }
      await db.from("apns_provider_token").upsert({ id: 1, ...v, updated_at: new Date().toISOString() });
    },
  };
}

/** Token → actor: Supabase Auth checks the signature and expiry; the email and its confirmation come from the account. */
export async function verifyActor(db: SupabaseClient, jwt: string): Promise<Actor | null> {
  if (!jwt || jwt.split(".").length !== 3) return null;
  const { data, error } = await db.auth.getUser(jwt);
  const user = data?.user;
  if (error || !user?.email) return null;
  return { id: user.id, email: user.email.toLowerCase(), confirmed: !!user.email_confirmed_at };
}
