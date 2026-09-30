import { useCallback, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { AdminScreen, type AdminCall } from "./AdminScreen";
import { Mark } from "./ui";

// Sign in with Google through Supabase Auth, then the tool. Who counts as an admin is decided only by the server
// (/api/admin): a verified token, a confirmed email on the account, and the allowlist.
export function AdminApp({ sb }: { sb: SupabaseClient }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);
  const call: AdminCall = useCallback(
    async (body) => {
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token ?? "";
      try {
        const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
        const json = (await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }))) as Record<string, unknown>;
        return { status: r.status, body: json };
      } catch {
        return { status: 0, body: { ok: false, error: "Network error." } };
      }
    },
    [sb],
  );
  const signIn = async () => {
    setErr(null);
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/" } });
    if (error) setErr(error.message);
  };

  return (
    <>
      <header className="topbar">
        <span className="brand">
          <Mark /> Sprout Admin
        </span>
        <span className="tag">Internal</span>
      </header>
      <main className="screen">
        {session === undefined ? (
          <p className="empty" aria-busy="true">
            Loading…
          </p>
        ) : session === null ? (
          <div className="card signin" data-testid="admin-signin">
            <h1 className="h1">Sprout Admin</h1>
            <p className="sub">Internal tool. Sign in with an admin account.</p>
            <button className="btn" onClick={() => void signIn()} data-testid="signin-google">
              Continue with Google
            </button>
            {err && (
              <div className="error-note" role="alert">
                {err}
              </div>
            )}
          </div>
        ) : (
          <AdminScreen call={call} onSignOut={() => void sb.auth.signOut()} />
        )}
      </main>
    </>
  );
}
