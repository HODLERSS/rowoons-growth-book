// Test harness: call the deployed admin API as a disposable, temporarily allowlisted admin (never the owner's
// account). Usage: SUPABASE_ACCESS_TOKEN=… node scripts/as-test-admin.mjs '<json action>' ['<json action>' …]
// Prints each response; always removes the allowlist override and the user.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN = process.env.ADMIN_BASE_URL ?? "https://sprout-admin-minjae.vercel.app";
const REF = new URL(URL_).hostname.split(".")[0];
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  if (!r.ok) throw new Error(`sql ${r.status}`);
};
const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const email = `admin-harness-${Date.now()}@sprout-e2e.invalid`;
const password = `Pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const { data: created } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
try {
  await sql(`delete from vault.secrets where name = 'admin_emails'; select vault.create_secret('minjae.m.lee@gmail.com,${email}', 'admin_emails');`);
  const { data } = await createClient(URL_, ANON, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password });
  for (const raw of process.argv.slice(2)) {
    const body = JSON.parse(raw);
    if (body.idempotency_key === "auto") body.idempotency_key = `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const r = await fetch(`${ADMIN}/api/admin`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`, Origin: ADMIN }, body: JSON.stringify(body) });
    console.log(body.action, r.status, JSON.stringify(await r.json()));
  }
} finally {
  await sql("delete from vault.secrets where name = 'admin_emails'");
  await svc.from("admin_audit").delete().eq("actor_id", created.user.id);
  await svc.auth.admin.deleteUser(created.user.id);
}
