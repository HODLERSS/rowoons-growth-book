"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeafMark } from "@/components/brand/leaf";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { isNative } from "@/lib/platform";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="var(--brand-google-yellow)" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="var(--brand-google-red)" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="var(--brand-google-green)" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="var(--brand-google-blue)" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.1 35.6 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.7-3.8zM14 5.5c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
    </svg>
  );
}

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { signInWithGoogle, signInWithApple, signInWithEmail, signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "apple" | "email" | "password" | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // App Store guideline 4.8: a third-party login in the iOS app must be paired with Sign in with Apple. Apple is
  // switched on with NEXT_PUBLIC_APPLE_SIGNIN=1 once the provider is configured (needs the developer account);
  // until then the native app offers the email link only, and Google stays web-only.
  const showApple = process.env.NEXT_PUBLIC_APPLE_SIGNIN === "1";
  const showGoogle = !isNative() || showApple;

  async function apple() {
    setBusy("apple");
    setMessage(null);
    const r = await signInWithApple();
    if (!r.ok) setMessage({ kind: "error", text: t("account.error") });
    setBusy(null);
  }
  async function google() {
    setBusy("google");
    setMessage(null);
    const r = await signInWithGoogle();
    if (!r.ok) setMessage({ kind: "error", text: t("account.error") });
    setBusy(null);
  }
  async function sendLink(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ kind: "error", text: t("account.email_invalid") });
      return;
    }
    setBusy("email");
    setMessage(null);
    const r = await signInWithEmail(email);
    setMessage(r.ok ? { kind: "ok", text: t("account.email_sent") } : { kind: "error", text: t("account.error") });
    setBusy(null);
  }

  /** Email and password: the same account as every other route, for anyone who prefers a password. */
  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ kind: "error", text: t("account.email_invalid") });
      return;
    }
    if (password.length < 8) {
      setMessage({ kind: "error", text: t("account.password_short") });
      return;
    }
    setBusy("password");
    setMessage(null);
    const r = creating ? await signUpWithPassword(email, password) : await signInWithPassword(email, password);
    if (r.ok) {
      if (creating) setMessage({ kind: "ok", text: t("account.password_created") });
    } else {
      const wrong = /invalid login credentials/i.test(r.error);
      setMessage({ kind: "error", text: wrong ? t("account.password_wrong") : t("account.error") });
    }
    setBusy(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] overscroll-contain sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <LeafMark size={48} className="mb-1" />
          <DialogTitle className="font-display text-[1.375rem]">{t("account.sign_in")}</DialogTitle>
          <DialogDescription className="text-[0.9375rem]">{t("account.guest_desc")}</DialogDescription>
        </DialogHeader>
        {showApple && (
          <Button type="button" variant="outline" size="lg" className="w-full gap-2" onClick={apple} disabled={busy !== null}>
            <AppleMark />
            {t("account.apple")}
          </Button>
        )}
        {showGoogle && (
          <>
            <Button type="button" variant="outline" size="lg" className="w-full gap-2" onClick={google} disabled={busy !== null}>
              <GoogleMark />
              {t("account.google")}
            </Button>
            <div className="flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-px flex-1 bg-rule" />
              {t("account.or")}
              <span className="h-px flex-1 bg-rule" />
            </div>
          </>
        )}
        <form onSubmit={sendLink} noValidate className="space-y-2">
          <label htmlFor="account-email" className="text-[0.875rem] font-semibold">
            {t("account.email_label")}
          </label>
          <Input id="account-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-[1rem]" />
          <Button type="submit" size="lg" className="w-full gap-2" disabled={busy !== null}>
            <Mail className="size-4" aria-hidden="true" />
            {t("account.email_send")}
          </Button>
        </form>
        {!showPassword ? (
          <button
            type="button"
            aria-expanded={false}
            aria-controls="password-form"
            onClick={() => setShowPassword(true)}
            className="-mx-2 flex min-h-11 items-center justify-center rounded-lg px-2 text-[0.875rem] font-semibold text-primary hover:bg-hover"
          >
            {t("account.password_toggle")}
          </button>
        ) : (
          <form id="password-form" onSubmit={submitPassword} noValidate className="space-y-2">
            <label htmlFor="account-password" className="text-[0.875rem] font-semibold">
              {t("account.password_label")}
            </label>
            <Input
              id="account-password"
              name="password"
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-[1rem]"
            />
            <Button type="submit" size="lg" variant="outline" className="w-full" disabled={busy !== null}>
              {creating ? t("account.password_create") : t("account.password_sign_in")}
            </Button>
            <button
              type="button"
              onClick={() => { setCreating(!creating); setMessage(null); }}
              className="flex min-h-11 w-full items-center justify-center rounded-lg text-[0.8125rem] font-semibold text-muted-foreground hover:bg-hover"
            >
              {creating ? t("account.password_switch_sign_in") : t("account.password_switch_create")}
            </button>
          </form>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={"text-[0.875rem] " + (message.kind === "error" ? "text-danger" : "text-done")}>
            {message.text}
          </p>
        )}
        <p className="text-[0.75rem] leading-relaxed text-muted-foreground">{t("account.privacy_note")}</p>
      </DialogContent>
    </Dialog>
  );
}
