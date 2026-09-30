import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Test-only access to Supabase for the admin E2E: disposable users (service role), the Vault allowlist override
// (Management API, SUPABASE_ACCESS_TOKEN), and session injection under the admin site's own storage key.
export const env: Record<string, string> = { ...process.env } as Record<string, string>;
try {
  for (const line of readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.env.local"), "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !env[m[1]]) env[m[1]] = m[2];
  }
} catch {
  /* CI passes env directly */
}
export const URL_ = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const PAT = env.SUPABASE_ACCESS_TOKEN ?? "";
const REF = URL_ ? new URL(URL_).hostname.split(".")[0] : "";
export const OWNER = "minjae.m.lee@gmail.com";
export const svc = () => createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

export async function sql(query: string) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  if (!r.ok) throw new Error(`sql ${r.status}`);
  return r.json();
}
export const setAllowlist = (emails: string | null) =>
  sql(emails === null
    ? "delete from vault.secrets where name = 'admin_emails'"
    : `delete from vault.secrets where name = 'admin_emails'; select vault.create_secret('${emails.replace(/'/g, "")}', 'admin_emails');`);

export type User = { id: string; email: string; password: string };
export async function createUser(tag: string): Promise<User> {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@sprout-e2e.invalid`;
  const password = `Pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await svc().auth.admin.createUser({ email, password, email_confirm: true });
  if (!data.user) throw new Error(`createUser: ${error?.message}`);
  return { id: data.user.id, email, password };
}
export async function signIn(ctx: BrowserContext, u: User) {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email: u.email, password: u.password });
  if (!data.session) throw new Error(`signIn: ${error?.message}`);
  const s = data.session;
  await ctx.addInitScript((v) => localStorage.setItem("sprout-admin-auth", JSON.stringify(v)), {
    access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, expires_in: s.expires_in, token_type: s.token_type, user: s.user,
  });
}

