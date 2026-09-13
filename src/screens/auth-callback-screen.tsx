"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LeafMark } from "@/components/brand/leaf";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/lib/supabase";

/**
 * Where Google and magic links land on the web. The Supabase client reads the `code` from the URL on load and
 * exchanges it; we wait for the session and go Home. Errors (expired link, cancelled consent) stay readable.
 */
export function AuthCallbackScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const sb = supabase();
    const params = new URLSearchParams(window.location.search);
    const described = !sb ? "accounts unavailable" : params.get("error_description") || params.get("error");
    if (!sb || described) {
      // Deferred so the effect itself does not set state synchronously (React compiler rule).
      const id = setTimeout(() => setError(described || "accounts unavailable"), 0);
      return () => clearTimeout(id);
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      router.replace("/");
    };
    // Links minted server-side (or from the Supabase dashboard) return tokens in the URL hash rather than a
    // PKCE code; the client refuses those on its own, so hand them over explicitly.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      void sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: e }) => {
        if (e) setError(e.message);
        else {
          window.history.replaceState(null, "", window.location.pathname);
          finish();
        }
      });
    }
    const { data } = sb.auth.onAuthStateChange((_e, session) => {
      if (session) finish();
    });
    void sb.auth.getSession().then(({ data: d }) => {
      if (d.session) finish();
    });
    const timer = setTimeout(() => {
      if (!done) setError(t("account.callback_timeout"));
    }, 15_000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router, t]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <LeafMark size={56} />
      {error ? (
        <>
          <p role="alert" className="text-[1rem] font-semibold">
            {t("account.callback_error")}
          </p>
          <p className="max-w-sm text-[0.875rem] text-muted-foreground">{error}</p>
          <Link href="/" className="text-[0.9375rem] font-semibold text-primary">
            {t("account.callback_home")}
          </Link>
        </>
      ) : (
        <p aria-live="polite" className="text-[1rem] text-muted-foreground">
          {t("account.callback_wait")}
        </p>
      )}
    </main>
  );
}
