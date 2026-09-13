import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { BrowserContext } from "@playwright/test";

/** Test-only access to the account backend: creates disposable users, injects sessions, inspects rows, cleans up. */
function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env.local (CI passes env directly) */
  }
}
loadEnv();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const accountsConfigured = !!(SUPABASE_URL && ANON_KEY && SERVICE_KEY);

let adminClient: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  if (!adminClient) adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestUser(tag = "e2e"): Promise<TestUser> {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@sprout-e2e.invalid`;
  const password = `Pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  let last = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
    if (data.user) return { id: data.user.id, email, password };
    last = error?.message ?? "unknown";
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); // the auth service can time out while cold
  }
  throw new Error(`createUser failed: ${last}`);
}

export async function deleteTestUser(id: string): Promise<void> {
  await admin().auth.admin.deleteUser(id).catch(() => {});
}

/** Sign in server-side and plant the session in the page's storage the way the Supabase client stores it. */
export async function signInContext(ctx: BrowserContext, user: TestUser): Promise<void> {
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error || !data.session) throw new Error(`signInWithPassword failed: ${error?.message}`);
  const session = data.session;
  await ctx.addInitScript(
    (s) => {
      if (!localStorage.getItem("e2e:session")) {
        localStorage.setItem("sprout-auth", JSON.stringify(s));
        localStorage.setItem("e2e:session", "1");
      }
    },
    { access_token: session.access_token, refresh_token: session.refresh_token, expires_at: session.expires_at, expires_in: session.expires_in, token_type: session.token_type, user: session.user }
  );
}

export async function userRows(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await admin().from("user_data").select("key, value").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

/** A magic link that lands on the app's callback page (exercises the real PKCE-less token flow). */
export async function magicLink(email: string, redirectTo: string): Promise<string> {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
  if (error || !data.properties?.action_link) throw new Error(`generateLink failed: ${error?.message}`);
  return data.properties.action_link;
}

/** Read rows as a specific user through the public API (proves RLS, not just the app). */
export async function rowsAs(user: TestUser, otherUserId: string): Promise<number> {
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await anon.auth.signInWithPassword({ email: user.email, password: user.password });
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${data.session!.access_token}` } }, auth: { persistSession: false } });
  const { data: rows } = await asUser.from("user_data").select("key").eq("user_id", otherUserId);
  return rows?.length ?? 0;
}
